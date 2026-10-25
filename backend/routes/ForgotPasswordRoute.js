/** const bcrypt = require('bcrypt');
const crypto = require('crypto');
const express = require('express');
const router = express.Router();
const SibApiV3Sdk = require('@getbrevo/brevo');

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
const apiKey = apiInstance.authentications['apiKey'];
apiKey.apiKey = process.env.BREVO_API_KEY;

router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required.' });
  }

  try {
    const result = await pool.query('SELECT * FROM Staff WHERE Email = $1', [email]);

    if (result.rows.length === 0) {
      // Don't reveal if email exists or not — security best practice
      return res.status(200).json({ message: 'If this email exists, a new password has been sent.' });
    }

    // Generate new plain password
    const newPassword = String(Math.floor(100000 + Math.random() * 900000));
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update in database
    await pool.query('UPDATE Staff SET Password = $1 WHERE Email = $2', [hashedPassword, email]);

    // Send email via Brevo
    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.to = [{ email: email, name: result.rows[0].First_name }];
    sendSmtpEmail.sender = { email: process.env.BREVO_SENDER_EMAIL, name: "Jazzy's Clothing" };
    sendSmtpEmail.subject = "Your New Password - Jazzy's Clothing";
    sendSmtpEmail.htmlContent = `
      <h2>Hello ${result.rows[0].First_name},</h2>
      <p>Your new password is: <strong>${newPassword}</strong></p>
      <p>Please log in and change your password immediately.</p>
      <p>— Jazzy's Clothing</p>
    `;

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    return res.status(200).json({ message: 'If this email exists, a new password has been sent.' });

  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;**/