// services/birthdayService.js — sends the birthday email to a customer.
// - If a personal message was saved for them, that is sent.
// - If not, a default birthday message is sent (switch off with SEND_DEFAULT_BIRTHDAY_MESSAGE=false).
// Runs every day at 7 AM from jobs/dailyEmails.js, and straight away when someone
// writes a message on the customer's actual birthday.
const crypto = require('crypto');
const { sendMail } = require('./mailer');
const { customerBirthdayEmail } = require('./emailTemplates');
const { lagosToday, toISODate } = require('../utils/dates');

const DEFAULT_MESSAGE =
  'Everyone at Jazzy’s RTW is celebrating you today. Thank you for trusting us with your style, and for being such a valued part of our family. We hope your day is filled with joy, good company and everything you love.\n\nWishing you another wonderful year ahead.';

// Returns 'sent' | 'no_message' | 'no_email' | 'already_sent'
// options.force = true skips the "already emailed today" check (used when an admin presses "Send now")
async function sendBirthdayMessageNow(pool, customerId, { force = false } = {}) {
  const customerRes = await pool.query('SELECT id, first_name, email FROM Customers WHERE id = $1', [customerId]);
  if (customerRes.rows.length === 0) return 'no_message';

  const customer = customerRes.rows[0];
  if (!customer.email) return 'no_email';

  // Never email the same person twice on the same day (e.g. if the job is run again)
  if (!force) {
    const today = toISODate(lagosToday());
    const done = await pool.query(
      `SELECT 1 FROM birthday_messages
       WHERE customer_id = $1 AND sent_at IS NOT NULL
         AND to_char(sent_at AT TIME ZONE 'Africa/Lagos', 'YYYY-MM-DD') = $2
       LIMIT 1`,
      [customerId, today]
    );
    if (done.rows.length > 0) return 'already_sent';
  }

  // Newest personal message that has not been sent yet
  const msgRes = await pool.query(
    `SELECT id, message FROM birthday_messages
     WHERE customer_id = $1 AND sent_at IS NULL
     ORDER BY created_at DESC LIMIT 1`,
    [customerId]
  );

  let text;
  let messageId;

  if (msgRes.rows.length > 0) {
    text = msgRes.rows[0].message;
    messageId = msgRes.rows[0].id;

    // "Claim" the message first so it can never be emailed twice
    const claim = await pool.query(
      'UPDATE birthday_messages SET sent_at = now() WHERE id = $1 AND sent_at IS NULL RETURNING id',
      [messageId]
    );
    if (claim.rows.length === 0) return 'already_sent';
  } else if (process.env.SEND_DEFAULT_BIRTHDAY_MESSAGE !== 'false') {
    // No personal message: send the default one, and record it so it is not sent twice
    text = DEFAULT_MESSAGE;
    messageId = crypto.randomUUID();
    await pool.query(
      `INSERT INTO birthday_messages (id, customer_id, message, created_by, sent_at)
       VALUES ($1, $2, $3, 'system', now())`,
      [messageId, customerId, text]
    );
  } else {
    return 'no_message';
  }

  try {
    const mail = customerBirthdayEmail({ customerName: customer.first_name, message: text });
    await sendMail({ to: customer.email, subject: mail.subject, html: mail.html, text: mail.text });
    return 'sent';
  } catch (err) {
    // Undo, so it can be retried
    if (text === DEFAULT_MESSAGE && msgRes.rows.length === 0) {
      await pool.query('DELETE FROM birthday_messages WHERE id = $1', [messageId]).catch(() => {});
    } else {
      await pool.query('UPDATE birthday_messages SET sent_at = NULL WHERE id = $1', [messageId]).catch(() => {});
    }
    throw err;
  }
}

module.exports = { sendBirthdayMessageNow };