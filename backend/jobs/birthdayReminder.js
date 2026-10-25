const nodemailer = require('nodemailer');
const cron = require('node-cron');

function startBirthdayReminderJob(pool) {
  const transporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.BREVO_SMTP_USER,
      pass: process.env.BREVO_SMTP_KEY,
    },
  });

  // Runs at 8:00 AM every 3 days
  cron.schedule('0 8 */3 * *', async () => {
    console.log('Running birthday reminder job...');

    try {
      const result = await pool.query(`
        SELECT first_name, last_name, phone_number, email, date_of_birth
        FROM Customers
        WHERE date_of_birth IS NOT NULL
          AND (
            (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE)
             AND EXTRACT(DAY FROM date_of_birth) BETWEEN EXTRACT(DAY FROM CURRENT_DATE) AND EXTRACT(DAY FROM CURRENT_DATE) + 14)
            OR
            (EXTRACT(MONTH FROM date_of_birth) = EXTRACT(MONTH FROM CURRENT_DATE + INTERVAL '14 days')
             AND EXTRACT(DAY FROM date_of_birth) <= EXTRACT(DAY FROM CURRENT_DATE + INTERVAL '14 days'))
          )
        ORDER BY EXTRACT(MONTH FROM date_of_birth), EXTRACT(DAY FROM date_of_birth)
      `);

      const upcoming = result.rows;

      if (upcoming.length === 0) {
        console.log('No upcoming birthdays.');
        return;
      }

      const listHtml = upcoming
        .map(
          (c) =>
            `<li style="margin-bottom: 8px;">
              <strong>${c.first_name} ${c.last_name}</strong> — 
              ${new Date(c.date_of_birth).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
              ${c.phone_number ? ` • ${c.phone_number}` : ''}
            </li>`
        )
        .join('');

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
          <h2 style="color: #111;">Upcoming Birthdays – Jazzy's RTW</h2>
          <p>The following customers have birthdays in the next two weeks:</p>
          <ul style="padding-left: 20px; color: #333;">
            ${listHtml}
          </ul>
          <p style="color: #888; font-size: 13px; margin-top: 32px;">This is an automated reminder sent every 3 days.</p>
        </div>
      `;

      await transporter.sendMail({
        from: process.env.EMAIL_FROM || `"Jazzy's RTW" <${process.env.BREVO_SMTP_USER}>`,
        to: process.env.OWNER_EMAIL,
        subject: `🎂 ${upcoming.length} upcoming birthday${upcoming.length > 1 ? 's' : ''} – Jazzy's RTW`,
        html,
      });

      console.log(`Birthday reminder sent (${upcoming.length} customers).`);
    } catch (error) {
      console.error('BIRTHDAY REMINDER ERROR:', error);
    }
  });

  console.log('Birthday reminder job scheduled (every 3 days at 08:00).');
}

module.exports = { startBirthdayReminderJob };