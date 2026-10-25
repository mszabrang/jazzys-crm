// emailTemplates.js — Jazzy's RTW CRM
// Each function returns { subject, html, text }. Plug them into your Brevo send function.
// If your project uses ES modules, replace module.exports at the bottom with `export { ... }`.

const BRAND = {
  name: "Jazzy's RTW",
  ink: '#22262a',      // charcoal, matches your buttons
  paper: '#f6f5f2',    // page background
  card: '#ffffff',
  muted: '#6b6f73',
  line: '#e4e2dc',
  font: "Georgia, 'Times New Roman', serif",
};

// Escape anything typed by a person (customer names, custom messages) before putting it in HTML
const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const naira = (n) => '₦' + Number(n || 0).toLocaleString('en-NG');

const fmtDate = (d) =>
  new Date(d).toLocaleDateString('en-NG', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Africa/Lagos' });

const button = (url, label) => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
    <tr><td style="background:${BRAND.ink};border-radius:6px;">
      <a href="${url}" style="display:inline-block;padding:14px 28px;font-family:${BRAND.font};font-size:16px;color:#ffffff;text-decoration:none;">${esc(label)}</a>
    </td></tr>
  </table>`;

// Shared wrapper: keeps all four emails looking like one family
const layout = (preheader, body) => `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:${BRAND.paper};">
  <span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.paper};padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 4px 16px;font-family:${BRAND.font};font-size:20px;color:${BRAND.ink};letter-spacing:0.5px;">${BRAND.name}</td></tr>
        <tr><td style="background:${BRAND.card};border:1px solid ${BRAND.line};border-radius:10px;padding:36px 32px;font-family:${BRAND.font};font-size:16px;line-height:1.65;color:${BRAND.ink};">
          ${body}
        </td></tr>
        <tr><td style="padding:16px 4px;font-family:${BRAND.font};font-size:13px;color:${BRAND.muted};">Sent by ${BRAND.name}. Please do not reply to this email.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

const h1 = (t) => `<h1 style="margin:0 0 16px;font-size:24px;font-weight:normal;line-height:1.3;">${esc(t)}</h1>`;
const p = (t) => `<p style="margin:0 0 14px;">${t}</p>`;
const row = (left, right) => `
  <tr>
    <td style="padding:12px 0;border-top:1px solid ${BRAND.line};">${left}</td>
    <td align="right" style="padding:12px 0;border-top:1px solid ${BRAND.line};color:${BRAND.muted};white-space:nowrap;">${right}</td>
  </tr>`;
const list = (rows) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:18px 0 6px;">${rows.join('')}</table>`;

// 1. Forgot password — link expires in 15 minutes and works once (enforce this in your route, not just here)
function resetPasswordEmail({ name, resetUrl, minutes = 15 }) {
  return {
    subject: `Reset your ${BRAND.name} password`,
    html: layout(`This link expires in ${minutes} minutes.`,
      h1('Reset your password') +
      p(`Hi ${esc(name)},`) +
      p(`We received a request to reset your password. Use the button below to choose a new one. The link works once and expires in <strong>${minutes} minutes</strong>.`) +
      button(resetUrl, 'Choose a new password') +
      p(`<span style="color:${BRAND.muted};font-size:14px;">If the button does not work, copy this link into your browser:<br>${esc(resetUrl)}</span>`) +
      p(`<span style="color:${BRAND.muted};font-size:14px;">Did not ask for this? Ignore this email and your password stays the same.</span>`)),
    text: `Hi ${name},\n\nReset your password here (valid for ${minutes} minutes, one use):\n${resetUrl}\n\nDid not ask for this? Ignore this email.`,
  };
}

// 2. Upcoming birthdays summary to Aunty Shushu — only send if customers.length > 0
// customers: [{ name, birthday (Date/ISO), daysAway, turning (optional number) }]
function birthdaySummaryEmail({ adminName, customers, dashboardUrl }) {
  const n = customers.length;
  const rows = customers.map((c) =>
    row(
      `<strong>${esc(c.name)}</strong>${c.turning ? `<br><span style="color:${BRAND.muted};font-size:14px;">Turning ${c.turning}</span>` : ''}`,
      c.daysAway === 0 ? 'Today' : c.daysAway === 1 ? 'Tomorrow' : `${fmtDate(c.birthday)} (in ${c.daysAway} days)`
    )
  );
  return {
    subject: n === 1 ? '1 customer birthday this week' : `${n} customer birthdays this week`,
    html: layout(`${n} birthday${n > 1 ? 's' : ''} coming up in the next 7 days.`,
      h1(n === 1 ? 'A birthday this week' : `${n} birthdays this week`) +
      p(`Good morning ${esc(adminName)},`) +
      p('These customers have birthdays in the next 7 days. You can write each one a personal message before the day. If you do not, they will receive a default birthday message.') +
      list(rows) +
      button(dashboardUrl, 'Write birthday messages')),
    text: `Good morning ${adminName},\n\nBirthdays in the next 7 days:\n` +
      customers.map((c) => `- ${c.name}: ${fmtDate(c.birthday)}`).join('\n') + `\n\nWrite messages: ${dashboardUrl}`,
  };
}

// 3. Birthday message to the customer — sent ON their birthday (personal message, or the default one)
function customerBirthdayEmail({ customerName, message }) {
  const safeMessage = esc(message).replace(/\n/g, '<br>');
  return {
    subject: `Happy Birthday, ${customerName}!`,
    html: layout(`A birthday note from ${BRAND.name}.`,
      h1(`Happy Birthday, ${customerName}!`) +
      `<p style="margin:0 0 14px;font-size:17px;">${safeMessage}</p>` +
      p('With love,<br>Jazzy’s RTW.')),
    text: `Happy Birthday, ${customerName}!\n\n${message}\n\nWith love,\nJazzy’s RTW.`,
  };
}

// 4. Deliveries due within 7 days (pending or in progress) — only send if orders.length > 0
// orders: [{ customerName, description, deliveryDate, status, total, paid }]
// Each order is its own block: who + date on top, the description in its own space, then status and balance.
const STATUS_STYLE = {
  Pending: 'background:#f6efdc;color:#7a5c12;',
  'In progress': 'background:#e6edf3;color:#2f4558;',
};

function deliveryReminderEmail({ adminName, orders, dashboardUrl }) {
  const n = orders.length;

  const blocks = orders.map((o) => {
    const balance = Number(o.total) - Number(o.paid);
    const pill = STATUS_STYLE[o.status] || `background:${BRAND.paper};color:${BRAND.ink};`;
    const description = esc(o.description || 'No description').replace(/\n/g, '<br>');

    return `
    <tr><td style="padding:18px 0;border-top:1px solid ${BRAND.line};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${BRAND.font};font-size:17px;"><strong>${esc(o.customerName)}</strong></td>
        <td align="right" style="font-family:${BRAND.font};font-size:14px;color:${BRAND.muted};white-space:nowrap;">Due ${fmtDate(o.deliveryDate)}</td>
      </tr></table>
      <div style="margin:12px 0 0;font-family:${BRAND.font};font-size:12px;letter-spacing:0.4px;color:${BRAND.muted};">Description</div>
      <div style="margin:4px 0 0;padding:12px 14px;background:${BRAND.paper};border-radius:6px;font-family:${BRAND.font};font-size:15px;line-height:1.6;">${description}</div>
      <div style="margin:12px 0 0;font-family:${BRAND.font};font-size:14px;">
        <span style="display:inline-block;padding:4px 12px;border-radius:999px;font-size:13px;${pill}">${esc(o.status)}</span>
        <span style="margin-left:10px;color:${BRAND.muted};">${balance > 0 ? `Balance due ${naira(balance)}` : 'Fully paid'}</span>
      </div>
    </td></tr>`;
  });

  return {
    subject: n === 1 ? '1 delivery due this week' : `${n} deliveries due this week`,
    html: layout(`${n} order${n > 1 ? 's' : ''} due within 7 days.`,
      h1(n === 1 ? 'A delivery due this week' : `${n} deliveries due this week`) +
      p(`Good morning ${esc(adminName)},`) +
      p('These orders are still pending or in progress and are due within the next 7 days.') +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:14px 0 4px;">${blocks.join('')}</table>` +
      button(dashboardUrl, 'View orders')),
    text: `Good morning ${adminName},\n\nDeliveries due in the next 7 days:\n\n` +
      orders.map((o) => `${o.customerName} (due ${fmtDate(o.deliveryDate)})\nDescription: ${o.description || 'No description'}\nStatus: ${o.status}`).join('\n\n') +
      `\n\nView orders: ${dashboardUrl}`,
  };
}

module.exports = { resetPasswordEmail, birthdaySummaryEmail, customerBirthdayEmail, deliveryReminderEmail };