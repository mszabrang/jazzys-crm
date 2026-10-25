const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const express = require('express');
const { allStaffAuth } = require('../middleware/auth');
const { sendMail } = require('../services/mailer');
const { resetPasswordEmail } = require('../services/emailTemplates');

const RESET_MINUTES = 15;
const RESEND_COOLDOWN_SECONDS = 60;
const GENERIC_FORGOT_MESSAGE = 'If an account exists with that email, a reset link has been sent.';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

module.exports = (pool) => {
  const router = express.Router();

  // ───────────── LOGIN (unchanged) ─────────────
  router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Invalid input.' });
    }

    try {
      const result = await pool.query('SELECT * FROM Staff WHERE email = $1', [email]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'No account found with that email.' });
      }

      const staff = result.rows[0];

      if (!staff.password) {
        return res.status(400).json({ message: 'Please use "Forgot password" to set up your account.' });
      }

      const match = await bcrypt.compare(password, staff.password);
      if (!match) {
        return res.status(401).json({ message: 'Incorrect password.' });
      }

      const token = jwt.sign(
        { Staff_ID: staff.id, role: staff.tier },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );

      return res.status(200).json({
        message: 'Login successful',
        token,
        firstName: staff.first_name,
        role: staff.tier,
        mustResetPassword: staff.must_reset_password,
      });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── FORGOT PASSWORD: email a one-time link ─────────────
  router.post('/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ message: 'Please enter a valid email address.' });
    }

    try {
      const result = await pool.query('SELECT id, first_name, email FROM Staff WHERE lower(email) = $1', [
        email.toLowerCase().trim(),
      ]);

      // Same answer whether or not the account exists, so nobody can probe for emails.
      if (result.rows.length === 0) {
        return res.status(200).json({ message: GENERIC_FORGOT_MESSAGE });
      }

      const staff = result.rows[0];

      // Cooldown: ignore repeat requests within a minute (stops email spamming)
      const recent = await pool.query(
        `SELECT 1 FROM password_resets
         WHERE staff_id = $1 AND created_at > now() - ($2 || ' seconds')::interval LIMIT 1`,
        [staff.id, String(RESEND_COOLDOWN_SECONDS)]
      );
      if (recent.rows.length > 0) {
        return res.status(200).json({ message: GENERIC_FORGOT_MESSAGE });
      }

      // Cancel any older unused links, then issue a fresh one
      await pool.query('UPDATE password_resets SET used_at = now() WHERE staff_id = $1 AND used_at IS NULL', [staff.id]);

      const rawToken = crypto.randomBytes(32).toString('hex'); // 64 random hex characters
      await pool.query(
        'INSERT INTO password_resets (id, staff_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), staff.id, sha256(rawToken), new Date(Date.now() + RESET_MINUTES * 60 * 1000)]
      );

      // While testing locally, use whichever localhost port the page is running on (5173, 5174...).
      // Anywhere else, always use FRONTEND_URL so nobody can point the link at another site.
      const origin = req.headers.origin || '';
      const baseUrl = /^http:\/\/localhost:\d{2,5}$/.test(origin) ? origin : process.env.FRONTEND_URL;
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`;
      const mail = resetPasswordEmail({ name: staff.first_name, resetUrl, minutes: RESET_MINUTES });

      // Not awaited on purpose: response time is the same for real and unknown emails
      sendMail({ to: staff.email, subject: mail.subject, html: mail.html, text: mail.text }).catch((err) =>
        console.error('RESET EMAIL ERROR:', err.message)
      );

      return res.status(200).json({ message: GENERIC_FORGOT_MESSAGE });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── CHECK A RESET LINK (so the page can say "expired" straight away) ─────────────
  router.get('/reset-password/check', async (req, res) => {
    const token = typeof req.query.token === 'string' ? req.query.token : '';
    if (!token) return res.status(400).json({ valid: false });

    try {
      const result = await pool.query(
        'SELECT 1 FROM password_resets WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()',
        [sha256(token)]
      );
      return res.status(200).json({ valid: result.rows.length > 0 });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ valid: false });
    }
  });

  // ───────────── SET THE NEW PASSWORD ─────────────
  router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    if (!token || !newPassword || typeof token !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // FOR UPDATE locks the row so the same link cannot be used twice at the same moment
      const found = await client.query(
        `SELECT id, staff_id FROM password_resets
         WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
         FOR UPDATE`,
        [sha256(token)]
      );

      if (found.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(400).json({ message: 'This link is invalid or has expired. Please request a new one.' });
      }

      const { id, staff_id } = found.rows[0];
      const hashed = await bcrypt.hash(newPassword, 10);

      await client.query('UPDATE Staff SET password = $1, must_reset_password = false WHERE id = $2', [hashed, staff_id]);
      await client.query('UPDATE password_resets SET used_at = now() WHERE staff_id = $1 AND used_at IS NULL', [staff_id]);
      await client.query('COMMIT');

      return res.status(200).json({ message: 'Password updated. You can now sign in.' });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    } finally {
      client.release();
    }
  });

  // ───────────── CHANGE PASSWORD (already logged in, no email needed) ─────────────
  router.patch('/change-password', allStaffAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const { Staff_ID } = req.user;

    if (!currentPassword || !newPassword || typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ message: 'New password must be different from the current one.' });
    }

    try {
      const result = await pool.query('SELECT password FROM Staff WHERE id = $1', [Staff_ID]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Account not found.' });
      }

      const match = await bcrypt.compare(currentPassword, result.rows[0].password || '');
      if (!match) {
        return res.status(401).json({ message: 'Current password is incorrect.' });
      }

      const hashed = await bcrypt.hash(newPassword, 10);
      await pool.query('UPDATE Staff SET password = $1, must_reset_password = false WHERE id = $2', [hashed, Staff_ID]);

      return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  return router;
};