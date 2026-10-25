// jobs/dailyEmails.js — replaces birthdayReminder.js
// Every day at 7:00 AM Lagos time (same as Abuja):
//   1. Emails each customer whose birthday is TODAY the message that was saved for them (default if none)
//   2. Emails Aunty Shushu + all admins a summary of birthdays in the next 7 days (skipped if none)
//   3. Emails Aunty Shushu + all admins the pending / in-progress deliveries due in the next 7 days (skipped if none)
//
// To test without editing code, set DAILY_EMAILS_CRON in .env, e.g. DAILY_EMAILS_CRON=35 13 * * *
// (minute hour * * *, Lagos time). Remove it to go back to 7:00 AM.
const cron = require('node-cron');
const { sendMail } = require('../services/mailer');
const { sendBirthdayMessageNow } = require('../services/birthdayService');
const { birthdaySummaryEmail, deliveryReminderEmail } = require('../services/emailTemplates');
const { lagosToday, nextBirthday, toISODate, TZ } = require('../utils/dates');

const WINDOW_DAYS = 7;
const DEFAULT_CRON = '0 7 * * *';

const STATUS_LABEL = { pending: 'Pending', in_progress: 'In progress' };

// Admin recipients: super_admin (Aunty Shushu) + every admin.
// Matching ignores case and spaces/hyphens, so 'Admin', 'admin', 'Super Admin' and 'super_admin' all work.
async function getAdminRecipients(pool) {
  const res = await pool.query(
    `SELECT first_name, email, tier FROM Staff
     WHERE REPLACE(REPLACE(LOWER(TRIM(tier)), ' ', '_'), '-', '_') IN ('super_admin', 'admin')
       AND email IS NOT NULL AND TRIM(email) <> ''`
  );
  console.log(
    `[daily-emails] Admin recipients (${res.rows.length}): ` +
      (res.rows.map((a) => `${a.email} [${a.tier}]`).join(', ') || 'none')
  );
  return res.rows;
}

async function sendBirthdayMessagesForToday(pool, today) {
  const res = await pool.query(
    `SELECT id, to_char(date_of_birth, 'YYYY-MM-DD') AS dob_text FROM Customers WHERE date_of_birth IS NOT NULL`
  );
  const todays = res.rows.filter((c) => nextBirthday(c.dob_text, today)?.daysAway === 0);

  const tally = {};
  for (const c of todays) {
    try {
      const outcome = await sendBirthdayMessageNow(pool, c.id);
      tally[outcome] = (tally[outcome] || 0) + 1;
    } catch (err) {
      tally.failed = (tally.failed || 0) + 1;
      console.error(`BIRTHDAY MESSAGE ERROR (customer ${c.id}):`, err.message);
    }
  }
  console.log(
    `[daily-emails] Customers with a birthday today: ${todays.length}. Results: ${JSON.stringify(tally)}` +
      ' (sent = emailed, no_email = customer has no email, already_sent = already emailed today)'
  );
}

async function sendBirthdaySummary(pool, today, admins) {
  const res = await pool.query(
    `SELECT first_name, last_name, to_char(date_of_birth, 'YYYY-MM-DD') AS dob_text
     FROM Customers WHERE date_of_birth IS NOT NULL`
  );

  const upcoming = res.rows
    .map((c) => ({ c, info: nextBirthday(c.dob_text, today) }))
    .filter(({ info }) => info && info.daysAway <= WINDOW_DAYS)
    .sort((a, b) => a.info.daysAway - b.info.daysAway)
    .map(({ c, info }) => ({
      name: `${c.first_name} ${c.last_name}`,
      birthday: toISODate(info.date),
      daysAway: info.daysAway,
      turning: info.turning,
    }));

  if (upcoming.length === 0) {
    console.log('[daily-emails] No birthdays in the next 7 days, no summary sent.');
    return;
  }

  let ok = 0;
  for (const admin of admins) {
    try {
      const mail = birthdaySummaryEmail({
        adminName: admin.first_name,
        customers: upcoming,
        dashboardUrl: `${process.env.FRONTEND_URL}/birthdays`,
      });
      await sendMail({ to: admin.email, subject: mail.subject, html: mail.html, text: mail.text });
      ok++;
    } catch (err) {
      console.error(`BIRTHDAY SUMMARY ERROR (${admin.email}):`, err.message);
    }
  }
  console.log(`[daily-emails] Birthday summary (${upcoming.length} birthdays) delivered to Brevo for ${ok}/${admins.length} admin(s).`);
}

async function sendDeliveryReminders(pool, today, admins) {
  const start = toISODate(today);
  const endDate = new Date(Date.UTC(today.y, today.m - 1, today.d + WINDOW_DAYS));
  const end = endDate.toISOString().slice(0, 10);

  const res = await pool.query(
    `SELECT o.description, o.status, o.amount, o.amount_paid,
            to_char(o.due_date, 'YYYY-MM-DD') AS due_text,
            COALESCE(NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), ''), o.customer_name) AS customer_name
     FROM Orders o
     LEFT JOIN Customers c ON c.id = o.customer_id
     WHERE o.status IN ('pending', 'in_progress')
       AND o.due_date::date BETWEEN $1::date AND $2::date
     ORDER BY o.due_date ASC`,
    [start, end]
  );

  if (res.rows.length === 0) {
    console.log('[daily-emails] No deliveries due in the next 7 days, no reminder sent.');
    return;
  }

  const orders = res.rows.map((o) => ({
    customerName: o.customer_name || 'Customer',
    description: o.description,
    deliveryDate: o.due_text,
    status: STATUS_LABEL[o.status] || o.status,
    total: o.amount,
    paid: o.amount_paid,
  }));

  let ok = 0;
  for (const admin of admins) {
    try {
      const mail = deliveryReminderEmail({
        adminName: admin.first_name,
        orders,
        dashboardUrl: `${process.env.FRONTEND_URL}/orders`,
      });
      await sendMail({ to: admin.email, subject: mail.subject, html: mail.html, text: mail.text });
      ok++;
    } catch (err) {
      console.error(`DELIVERY REMINDER ERROR (${admin.email}):`, err.message);
    }
  }
  console.log(`[daily-emails] Delivery reminder (${orders.length} orders) delivered to Brevo for ${ok}/${admins.length} admin(s).`);
}

// Runs all three steps. Each step is isolated so one failure never blocks the others.
async function runDailyEmails(pool) {
  console.log('[daily-emails] Starting…');
  const today = lagosToday();

  let admins = [];
  try {
    admins = await getAdminRecipients(pool);
  } catch (err) {
    console.error('[daily-emails] Could not load admin recipients:', err.message);
  }

  for (const step of [
    () => sendBirthdayMessagesForToday(pool, today),
    () => sendBirthdaySummary(pool, today, admins),
    () => sendDeliveryReminders(pool, today, admins),
  ]) {
    try {
      await step();
    } catch (err) {
      console.error('[daily-emails] Step failed:', err.message);
    }
  }
  console.log('[daily-emails] Done.');
}

function startDailyEmailJob(pool) {
  if (process.env.DAILY_EMAILS_ENABLED === 'false') {
    console.log('Daily emails are switched off (DAILY_EMAILS_ENABLED=false).');
    return;
  }
  const schedule = process.env.DAILY_EMAILS_CRON || DEFAULT_CRON;
  if (!cron.validate(schedule)) {
    console.error(`Invalid DAILY_EMAILS_CRON "${schedule}". Use the form: minute hour * * *`);
    return;
  }
  cron.schedule(schedule, () => runDailyEmails(pool), { timezone: TZ });
  console.log(`Daily emails scheduled with cron "${schedule}" (${TZ}).`);
}

module.exports = { startDailyEmailJob, runDailyEmails };