const express = require('express');
const crypto = require('crypto');
const { flexAuth } = require('../middleware/Auth');
const { lagosToday, nextBirthday } = require('../utils/dates');
const { sendBirthdayMessageNow } = require('../services/birthdayService');

const ALLOWED_UPDATE_FIELDS = ['First_name', 'Last_name', 'Email', 'Phone_number', 'Date_of_birth', 'Notes'];
const UPCOMING_DAYS = 14; // how far ahead the Upcoming Birthdays page looks

module.exports = (pool) => {
  const router = express.Router();

  // ───────────── ADD CUSTOMER (unchanged) ─────────────
  router.post('/register-customer', async (req, res) => {
    const { firstName, lastName, email, phoneNumber, birthday } = req.body;

    if (!firstName || !lastName || !email || !phoneNumber) {
      return res.status(400).json({ message: 'First name, last name, email and phone number are required.' });
    }
    if ([firstName, lastName, email, phoneNumber].some((v) => typeof v !== 'string')) {
      return res.status(400).json({ message: 'Invalid input.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    try {
      const existing = await pool.query('SELECT ID FROM Customers WHERE Email = $1 OR Phone_number = $2', [normalizedEmail, phoneNumber.trim()]);
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'A customer with this email or phone number already exists.' });
      }

      const Customer_ID = crypto.randomUUID();
      await pool.query(
        'INSERT INTO Customers (ID, First_name, Last_name, Email, Phone_number, Date_of_birth) VALUES ($1,$2,$3,$4,$5,$6)',
        [Customer_ID, firstName.trim(), lastName.trim(), normalizedEmail, phoneNumber.trim(), birthday || null]
      );

      return res.status(201).json({ message: 'Customer added successfully.' });
    } catch (err) {
      if (err.code === '23505') return res.status(409).json({ message: 'A customer with this email or phone number already exists.' });
      console.error(err.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── LIST CUSTOMERS (now also returns purchase_count) ─────────────
  router.get('/get-customers', flexAuth, async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT c.*, COALESCE(o.cnt, 0)::int AS purchase_count
        FROM Customers c
        LEFT JOIN (SELECT customer_id, COUNT(*) AS cnt FROM Orders GROUP BY customer_id) o
          ON o.customer_id = c.id
        ORDER BY c.created_at DESC
      `);
      return res.status(200).json({ message: 'success', customers: result.rows });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── ONE CUSTOMER (unchanged) ─────────────
  router.get('/get-a-customer/:Customer_ID', flexAuth, async (req, res) => {
    const { Customer_ID } = req.params;
    try {
      const result = await pool.query('SELECT * FROM Customers WHERE ID = $1', [Customer_ID]);
      if (result.rows.length === 0) return res.status(404).json({ message: 'Customer not found.' });
      return res.status(200).json({ message: 'success', customer: result.rows[0] });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── EDIT CUSTOMER (unchanged) ─────────────
  router.patch('/update-customer/:Customer_ID', flexAuth, async (req, res) => {
    const { Customer_ID } = req.params;
    const fields = Object.keys(req.body).filter((f) => ALLOWED_UPDATE_FIELDS.includes(f));
    const values = fields.map((f) => req.body[f]);

    if (fields.length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    values.push(Customer_ID);

    try {
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const result = await pool.query(`UPDATE Customers SET ${setClause} WHERE ID = $${fields.length + 1}`, values);
      if (result.rowCount === 0) return res.status(404).json({ message: 'Customer not found.' });
      return res.status(200).json({ message: 'Customer updated successfully.' });
    } catch (error) {
      if (error.code === '23505') return res.status(409).json({ message: 'Email or phone number already in use.' });
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── DELETE CUSTOMER ─────────────
  // Their orders are KEPT (so sales history and stats stay correct). The customer's name is
  // copied onto each order first, so old orders still show who they were for.
  router.delete('/delete-customer/:Customer_ID', flexAuth, async (req, res) => {
    const { Customer_ID } = req.params;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const found = await client.query('SELECT first_name, last_name FROM Customers WHERE id = $1', [Customer_ID]);
      if (found.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ message: 'Customer not found.' });
      }

      const fullName = `${found.rows[0].first_name} ${found.rows[0].last_name}`;
      await client.query('UPDATE Orders SET customer_name = $1 WHERE customer_id = $2', [fullName, Customer_ID]);
      await client.query('DELETE FROM measurements WHERE customer_id = $1', [Customer_ID]);
      await client.query('DELETE FROM birthday_messages WHERE customer_id = $1', [Customer_ID]);
      await client.query('DELETE FROM Customers WHERE id = $1', [Customer_ID]); // orders.customer_id becomes empty
      await client.query('COMMIT');

      return res.status(200).json({ message: 'Customer deleted.' });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(error.message);
      return res.status(500).json({ message: 'Unable to delete this customer right now.' });
    } finally {
      client.release();
    }
  });

  // ───────────── UPCOMING BIRTHDAYS (now correct across month/year ends) ─────────────
  router.get('/upcoming-birthdays', flexAuth, async (req, res) => {
    try {
      const today = lagosToday();

      const customers = await pool.query(`
        SELECT id, first_name, last_name, email, phone_number, date_of_birth,
               to_char(date_of_birth, 'YYYY-MM-DD') AS dob_text
        FROM Customers
        WHERE date_of_birth IS NOT NULL
      `);

      // Newest message per customer, to show "scheduled" or "sent" on each card
      const messages = await pool.query(`
        SELECT DISTINCT ON (customer_id) customer_id, message, sent_at
        FROM birthday_messages
        ORDER BY customer_id, created_at DESC
      `);
      const latest = new Map(messages.rows.map((m) => [m.customer_id, m]));

      const upcoming = customers.rows
        .map((c) => ({ c, info: nextBirthday(c.dob_text, today) }))
        .filter(({ info }) => info && info.daysAway <= UPCOMING_DAYS)
        .sort((a, b) => a.info.daysAway - b.info.daysAway)
        .map(({ c, info }) => {
          const msg = latest.get(c.id);
          let messageStatus = 'none';
          let savedMessage = '';
          if (msg && !msg.sent_at) {
            messageStatus = 'scheduled';
            savedMessage = msg.message;
          } else if (msg && msg.sent_at && Date.now() - new Date(msg.sent_at).getTime() < 30 * 86400000) {
            messageStatus = 'sent';
          }
          return {
            id: c.id,
            first_name: c.first_name,
            last_name: c.last_name,
            email: c.email,
            phone_number: c.phone_number,
            date_of_birth: c.date_of_birth,
            days_away: info.daysAway,
            turning: info.turning,
            message_status: messageStatus,
            saved_message: savedMessage,
          };
        });

      return res.status(200).json({ upcomingBirthdays: upcoming });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── SAVE A BIRTHDAY MESSAGE ─────────────
  // Saved now, emailed on the customer's birthday (7 AM Lagos).
  // If today IS their birthday, it is emailed straight away.
  router.post('/birthday-message/:Customer_ID', flexAuth, async (req, res) => {
    const { Customer_ID } = req.params;
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';

    if (!message) return res.status(400).json({ message: 'Please type a message first.' });
    if (message.length > 1000) return res.status(400).json({ message: 'Message is too long (1000 characters max).' });

    try {
      const found = await pool.query(
        `SELECT id, email, to_char(date_of_birth, 'YYYY-MM-DD') AS dob_text FROM Customers WHERE id = $1`,
        [Customer_ID]
      );
      if (found.rows.length === 0) return res.status(404).json({ message: 'Customer not found.' });

      const customer = found.rows[0];
      if (!customer.email) {
        return res.status(400).json({ message: "This customer has no email address, so a message can't be sent." });
      }
      if (!customer.dob_text) {
        return res.status(400).json({ message: 'This customer has no date of birth saved.' });
      }

      // One pending message per customer: a new one replaces an unsent older one
      await pool.query('DELETE FROM birthday_messages WHERE customer_id = $1 AND sent_at IS NULL', [Customer_ID]);
      await pool.query(
        'INSERT INTO birthday_messages (id, customer_id, message, created_by) VALUES ($1, $2, $3, $4)',
        [crypto.randomUUID(), Customer_ID, message, req.user.Staff_ID]
      );

      const info = nextBirthday(customer.dob_text);
      if (info && info.daysAway === 0) {
        try {
          const outcome = await sendBirthdayMessageNow(pool, Customer_ID, { force: true });
          if (outcome === 'sent') {
            return res.status(200).json({ status: 'sent', message: "It's their birthday today, so the message was sent." });
          }
        } catch (err) {
          console.error('BIRTHDAY SEND ERROR:', err.message);
          return res.status(502).json({ message: 'Message saved, but the email could not be sent right now.' });
        }
      }

      return res.status(200).json({ status: 'scheduled', message: 'Message saved. It will be sent on their birthday.' });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── SEND THE BIRTHDAY MESSAGE NOW (only on their birthday) ─────────────
  // Uses their saved personal message, or the default one if none was written.
  router.post('/birthday-send-now/:Customer_ID', flexAuth, async (req, res) => {
    const { Customer_ID } = req.params;
    try {
      const found = await pool.query(
        `SELECT email, to_char(date_of_birth, 'YYYY-MM-DD') AS dob_text FROM Customers WHERE id = $1`,
        [Customer_ID]
      );
      if (found.rows.length === 0) return res.status(404).json({ message: 'Customer not found.' });

      const info = found.rows[0].dob_text ? nextBirthday(found.rows[0].dob_text) : null;
      if (!info || info.daysAway !== 0) {
        return res.status(400).json({ message: "It isn't this customer's birthday today." });
      }
      if (!found.rows[0].email) {
        return res.status(400).json({ message: "This customer has no email address, so a message can't be sent." });
      }

      const outcome = await sendBirthdayMessageNow(pool, Customer_ID, { force: true });
      if (outcome === 'sent') {
        return res.status(200).json({ status: 'sent', message: 'Birthday message sent.' });
      }
      return res.status(400).json({ message: 'Default birthday messages are switched off, and no personal message was written.' });
    } catch (error) {
      console.error('BIRTHDAY SEND ERROR:', error.message);
      return res.status(502).json({ message: 'The email could not be sent right now.' });
    }
  });

  // ───────────── CLEAR A SAVED (UNSENT) MESSAGE ─────────────
  router.delete('/birthday-message/:Customer_ID', flexAuth, async (req, res) => {
    try {
      await pool.query('DELETE FROM birthday_messages WHERE customer_id = $1 AND sent_at IS NULL', [req.params.Customer_ID]);
      return res.status(200).json({ message: 'Saved message removed.' });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── PUBLIC CUSTOMER REGISTRATION (unchanged, NO AUTH) ─────────────
  router.post('/public-register', async (req, res) => {
    const { firstName, lastName, email, phoneNumber, birthday } = req.body;

    if (!firstName || !lastName || !phoneNumber) {
      return res.status(400).json({ message: 'First name, last name and phone number are required.' });
    }

    try {
      const id = crypto.randomUUID();

      await pool.query(
        `INSERT INTO Customers (id, first_name, last_name, email, phone_number, date_of_birth)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [id, firstName.trim(), lastName.trim(), email?.trim() || null, phoneNumber.trim(), birthday || null]
      );

      return res.status(201).json({ message: 'Registration successful.' });
    } catch (error) {
      console.error('PUBLIC REGISTER ERROR:', error);
      if (error.code === '23505') {
        return res.status(409).json({ message: 'A customer with this email or phone already exists.' });
      }
      return res.status(500).json({ message: 'Unable to register right now.' });
    }
  });

  return router;
};