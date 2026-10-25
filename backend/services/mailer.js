// services/mailer.js — sends email through Brevo's web API (HTTPS, port 443).
//
// Why not SMTP? Railway turns SMTP off on its Free/Trial/Hobby plans (and Render restricts it
// on free services), so SMTP connections just time out there. The HTTPS API works on any host.

const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';

// Usage: await sendMail({ to, subject, html, text })
async function sendMail({ to, subject, html, text }) {
  const apiKey = process.env.BREVO_API_KEY;
  const fromEmail = process.env.EMAIL_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error('Email is not configured: set BREVO_API_KEY and EMAIL_FROM_EMAIL in .env');
  }

  const response = await fetch(BREVO_URL, {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { name: process.env.EMAIL_FROM_NAME || "Jazzy's RTW", email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text,
    }),
  });

  if (!response.ok) {
    let detail = '';
    try {
      const body = await response.json();
      detail = body.message || JSON.stringify(body);
    } catch {
      detail = response.statusText;
    }
    throw new Error(`Brevo rejected the email (${response.status}): ${detail}`);
  }

  return response.json();
}

module.exports = { sendMail };