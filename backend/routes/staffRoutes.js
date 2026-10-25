const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const { flexAuth } = require('../middleware/auth');

module.exports = (pool) => {
  const router = express.Router();

  // ───────────── ADD STAFF (unchanged) ─────────────
  router.post('/add-staff', flexAuth, async (req, res) => {
    const { firstName, lastName, phoneNumber, email, tier } = req.body;
    const ALLOWED_TIERS = ['admin', 'production'];

    if (!firstName || !lastName || !phoneNumber || !email || !tier) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if ([firstName, lastName, phoneNumber, email, tier].some((v) => typeof v !== 'string')) {
      return res.status(400).json({ message: 'Invalid input.' });
    }
    if (!ALLOWED_TIERS.includes(tier)) {
      return res.status(400).json({ message: 'Invalid role. Must be admin or production.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (!normalizedEmail.includes('@') || !normalizedEmail.includes('.')) {
      return res.status(400).json({ message: 'Invalid email address.' });
    }

    try {
      const existing = await pool.query(
        'SELECT ID FROM Staff WHERE Phone_number = $1 OR Email = $2',
        [phoneNumber.trim(), normalizedEmail]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ message: 'A staff member with this email or phone number already exists.' });
      }

      const Staff_ID = crypto.randomUUID();
      const password = String(Math.floor(10000 + Math.random() * 90000));
      const hashedPassword = await bcrypt.hash(password, 10);

      await pool.query(
        'INSERT INTO Staff (ID, First_name, Last_name, Phone_number, Email, Tier, Password) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [Staff_ID, firstName.trim(), lastName.trim(), phoneNumber.trim(), normalizedEmail, tier, hashedPassword]
      );

      return res.status(201).json({ success: true, staffPassword: password });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'A staff member with this email or phone number already exists.' });
      }
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── LIST STAFF ─────────────
  // Also returns, for each staff member:
  //   customers_handling = distinct customers with an open order (pending / in progress)
  //   customers_handled  = distinct customers with a finished order (anything not open or cancelled)
  // Uses sub-queries (no GROUP BY) and casts status to text, so it works whatever the column type is.
  router.get('/staff', flexAuth, async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT s.id, s.first_name, s.last_name, s.email, s.phone_number, s.tier, s.created_at,
                (SELECT COUNT(DISTINCT o.customer_id)
                   FROM Orders o
                  WHERE o.staff_id = s.id
                    AND o.status::text IN ('pending', 'in_progress'))::int AS customers_handling,
                (SELECT COUNT(DISTINCT o.customer_id)
                   FROM Orders o
                  WHERE o.staff_id = s.id
                    AND o.status::text NOT IN ('pending', 'in_progress', 'cancelled', 'canceled'))::int AS customers_handled
           FROM Staff s
          ORDER BY s.created_at DESC`
      );
      return res.status(200).json({ allStaff: result.rows });
    } catch (error) {
      console.error('STAFF LIST ERROR:', error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // Who is allowed to touch whom:
  //  - nobody can delete themselves or a super admin
  //  - only a super admin can edit/delete another admin
  function canManage(requester, target) {
    if (target.tier === 'super_admin') return requester.Staff_ID === target.id; // super admin may edit self only
    if (target.tier === 'admin') return requester.role === 'super_admin';
    return true; // production staff: any admin
  }

  // ───────────── EDIT STAFF ─────────────
  router.patch('/update-staff/:id', flexAuth, async (req, res) => {
    const { firstName, lastName, phoneNumber, email, tier } = req.body;
    const ALLOWED_TIERS = ['admin', 'production'];

    try {
      const found = await pool.query('SELECT id, tier FROM Staff WHERE id = $1', [req.params.id]);
      if (found.rows.length === 0) return res.status(404).json({ message: 'Staff member not found.' });

      const target = found.rows[0];
      if (!canManage(req.user, target)) {
        return res.status(403).json({ message: "You don't have permission to edit this account." });
      }

      const fields = [];
      const values = [];
      let idx = 1;
      const add = (col, val) => {
        fields.push(`${col} = $${idx++}`);
        values.push(val);
      };

      if (typeof firstName === 'string' && firstName.trim()) add('first_name', firstName.trim());
      if (typeof lastName === 'string' && lastName.trim()) add('last_name', lastName.trim());
      if (typeof phoneNumber === 'string' && phoneNumber.trim()) add('phone_number', phoneNumber.trim());
      if (typeof email === 'string' && email.trim()) {
        const normalized = email.toLowerCase().trim();
        if (!normalized.includes('@') || !normalized.includes('.')) {
          return res.status(400).json({ message: 'Invalid email address.' });
        }
        add('email', normalized);
      }
      if (typeof tier === 'string' && tier !== target.tier) {
        if (req.user.role !== 'super_admin') {
          return res.status(403).json({ message: 'Only the super admin can change roles.' });
        }
        if (target.tier === 'super_admin' || !ALLOWED_TIERS.includes(tier)) {
          return res.status(400).json({ message: 'Invalid role.' });
        }
        add('tier', tier);
      }

      if (fields.length === 0) return res.status(400).json({ message: 'No valid fields to update.' });

      values.push(req.params.id);
      await pool.query(`UPDATE Staff SET ${fields.join(', ')} WHERE id = $${idx}`, values);
      return res.status(200).json({ message: 'Staff updated successfully.' });
    } catch (error) {
      if (error.code === '23505') {
        return res.status(409).json({ message: 'Email or phone number already in use.' });
      }
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── DELETE STAFF ─────────────
  // Their orders are KEPT. The staff member's name is copied onto each order first.
  // Requires orders.staff_id to be nullable with ON DELETE SET NULL (see SQL fix).
  router.delete('/delete-staff/:id', flexAuth, async (req, res) => {
    const { id } = req.params;

    if (id === req.user.Staff_ID) {
      return res.status(400).json({ message: "You can't delete your own account." });
    }

    const client = await pool.connect();
    try {
      const found = await client.query('SELECT id, tier, first_name, last_name FROM Staff WHERE id = $1', [id]);
      if (found.rows.length === 0) return res.status(404).json({ message: 'Staff member not found.' });

      const target = found.rows[0];
      if (target.tier === 'super_admin') {
        return res.status(403).json({ message: "The super admin account can't be deleted." });
      }
      if (!canManage(req.user, target)) {
        return res.status(403).json({ message: "You don't have permission to delete this account." });
      }

      await client.query('BEGIN');
      await client.query('UPDATE Orders SET staff_name = $1 WHERE staff_id = $2', [
        `${target.first_name} ${target.last_name}`,
        id,
      ]);
      await client.query('DELETE FROM password_resets WHERE staff_id = $1', [id]);
      await client.query('DELETE FROM Staff WHERE id = $1', [id]); // orders.staff_id becomes empty
      await client.query('COMMIT');

      return res.status(200).json({ message: 'Staff member deleted.' });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error(error.message);
      return res.status(500).json({ message: 'Unable to delete this staff member right now.' });
    } finally {
      client.release();
    }
  });

  return router;
};