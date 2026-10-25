const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const express = require('express');

module.exports = (pool) => {
  const router = express.Router();

  const allStaffAuth = (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({ success: false, message: 'Access Denied.' });
      }

      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const allowedRoles = ['super_admin', 'admin', 'production'];

      if (!allowedRoles.includes(decoded.role)) {
        return res.status(403).json({ success: false, message: 'Access Denied.' });
      }

      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid or Expired token.' });
    }
  };

  router.patch('/change-password', allStaffAuth, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const { Staff_ID } = req.user;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    try {
      const result = await pool.query('SELECT * FROM Staff WHERE ID = $1', [Staff_ID]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'Staff not found.' });
      }

      const isMatch = await bcrypt.compare(oldPassword, result.rows[0].Password);

      if (!isMatch) {
        return res.status(401).json({ message: 'Current password is incorrect.' });
      }

      const hashedNew = await bcrypt.hash(newPassword, 10);

      await pool.query('UPDATE Staff SET Password = $1 WHERE ID = $2', [hashedNew, Staff_ID]);

      return res.status(200).json({ message: 'Password changed successfully.' });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  return router;
};