const express = require('express');
const crypto = require('crypto');
const { flexAuth, allStaffAuth } = require('../middleware/auth');

const VALID_STATUSES = ['pending', 'in_progress', 'ready', 'delivered'];

module.exports = (pool) => {
  const router = express.Router();

  // ───────────── LIST ORDERS ─────────────
  // If a customer or staff member has been deleted, the order keeps the name that was saved on it
  // (orders.customer_name / orders.staff_name) and shows it exactly like a normal name.
  router.get('/get-orders', allStaffAuth, async (req, res) => {
    const { Staff_ID, role } = req.user;
    try {
      let result;
      const baseQuery = `
        SELECT Orders.*,
          COALESCE(Customers.First_name, Orders.customer_name, 'Deleted customer') AS customer_first_name,
          CASE WHEN Customers.ID IS NULL THEN '' ELSE Customers.Last_name END AS customer_last_name,
          COALESCE(Staff.First_name, Orders.staff_name, 'Removed staff') AS staff_first_name,
          CASE WHEN Staff.ID IS NULL THEN '' ELSE Staff.Last_name END AS staff_last_name
        FROM Orders
        LEFT JOIN Customers ON Orders.Customer_ID = Customers.ID
        LEFT JOIN Staff ON Orders.Staff_ID = Staff.ID
      `;

      if (role === 'production') {
        result = await pool.query(`${baseQuery} WHERE Orders.Staff_ID = $1 ORDER BY Orders.Created_at DESC`, [Staff_ID]);
      } else {
        result = await pool.query(`${baseQuery} ORDER BY Orders.Created_at DESC`);
      }

      return res.status(200).json({ message: 'success', orders: result.rows });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── CREATE ORDER (same as before, plus: paid can't exceed total) ─────────────
  router.post('/create-order', flexAuth, async (req, res) => {
    const { staff_ID, dueDate, amount, amountPaid, description, Customer_ID } = req.body;

    if (!dueDate || !description || !amount || !staff_ID || !Customer_ID) {
      return res.status(400).json({ message: 'All fields are required.' });
    }
    if (typeof dueDate !== 'string' || typeof description !== 'string' || typeof Customer_ID !== 'string') {
      return res.status(400).json({ message: 'Invalid input.' });
    }
    if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
      return res.status(400).json({ message: 'Amount must be a valid positive number.' });
    }

    const finalAmountPaid = typeof amountPaid === 'number' && amountPaid >= 0 ? amountPaid : 0;
    if (finalAmountPaid > amount) {
      return res.status(400).json({ message: 'Amount paid cannot be more than the order amount.' });
    }

    try {
      const Order_ID = crypto.randomUUID();

      await pool.query(
        'INSERT INTO Orders (ID, Due_date, Amount, Amount_paid, Description, Staff_ID, Customer_ID) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [Order_ID, dueDate, amount, finalAmountPaid, description, staff_ID, Customer_ID]
      );

      return res.status(201).json({ message: 'Order created successfully.' });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── UPDATE ORDER: amount, amount paid, status ─────────────
  router.patch('/update-order/:id', allStaffAuth, async (req, res) => {
    const orderId = req.params.id;
    const { amount, amount_paid, status, description } = req.body;
    const isBlank = (v) => v === undefined || v === null || v === '';

    // Only admins may change the order total or description
    if ((!isBlank(amount) || description !== undefined) && req.user.role === 'production') {
      return res.status(403).json({ message: 'Only admins can change the order amount or description.' });
    }

    try {
      const current = await pool.query('SELECT amount, amount_paid FROM Orders WHERE id = $1', [orderId]);
      if (current.rows.length === 0) {
        return res.status(404).json({ message: 'Order not found.' });
      }

      const fields = [];
      const values = [];
      let idx = 1;

      let newAmount = Number(current.rows[0].amount);
      let newPaid = Number(current.rows[0].amount_paid);

      if (!isBlank(amount)) {
        newAmount = Number(amount);
        if (!Number.isFinite(newAmount) || newAmount <= 0) {
          return res.status(400).json({ message: 'Amount must be a valid positive number.' });
        }
        fields.push(`amount = $${idx++}`);
        values.push(newAmount);
      }

      if (!isBlank(amount_paid)) {
        newPaid = Number(amount_paid);
        if (!Number.isFinite(newPaid) || newPaid < 0) {
          return res.status(400).json({ message: 'Amount paid must be a valid number.' });
        }
        fields.push(`amount_paid = $${idx++}`);
        values.push(newPaid);
      }

      if (newPaid > newAmount) {
        return res.status(400).json({ message: 'Amount paid cannot be more than the order amount.' });
      }

      if (!isBlank(status)) {
        if (!VALID_STATUSES.includes(status)) {
          return res.status(400).json({ message: 'Invalid status.' });
        }
        fields.push(`status = $${idx++}`);
        values.push(status);
      }

      if (description !== undefined) {
        const cleaned = typeof description === 'string' ? description.trim() : '';
        if (!cleaned) return res.status(400).json({ message: 'Description cannot be empty.' });
        if (cleaned.length > 2000) return res.status(400).json({ message: 'Description is too long (2000 characters max).' });
        fields.push(`description = $${idx++}`);
        values.push(cleaned);
      }

      if (fields.length === 0) {
        return res.status(400).json({ message: 'No valid fields to update.' });
      }

      values.push(orderId);
      const result = await pool.query(`UPDATE Orders SET ${fields.join(', ')} WHERE id = $${idx} RETURNING *`, values);

      return res.status(200).json({ message: 'Order updated successfully.', order: result.rows[0] });
    } catch (error) {
      console.error('UPDATE ORDER ERROR:', error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  // ───────────── DELETE ORDER ─────────────
  router.delete('/delete-order/:id', flexAuth, async (req, res) => {
    try {
      const result = await pool.query('DELETE FROM Orders WHERE id = $1', [req.params.id]);
      if (result.rowCount === 0) return res.status(404).json({ message: 'Order not found.' });
      return res.status(200).json({ message: 'Order deleted.' });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Unable to delete this order right now.' });
    }
  });

  return router;
};