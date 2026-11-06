const express = require('express');
const crypto = require('crypto');
const { allStaffAuth } = require('../middleware/Auth');

module.exports = (pool) => {
  const router = express.Router();

  const FIELD_MAP = {
    shoulder: 'shoulder',
    roundShoulder: 'round_shoulder',
    bust: 'bust',
    underBust: 'under_bust',
    waist: 'waist',
    hips: 'hips',
    roundArm: 'round_arm',
    armHole: 'arm_hole',
    shortSleeveLength: 'short_sleeve',
    sleeve34: 'three_quarter_sleeve',
    longSleeve: 'long_sleeve',
    topLength: 'top_length',
    shirtLength: 'shirt_length',
    trouserLength: 'trouser_length',
    tights: 'tights',
    skirtLength: 'skirt_length',
    length34: 'three_quarter_length',
    fullLength: 'full_length',
  };

  function cleanValue(value) {
    if (value === '' || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
  }

  // GET
  router.get('/get-measurement/:Customer_ID', allStaffAuth, async (req, res) => {
    const { Customer_ID } = req.params;

    if (!Customer_ID) {
      return res.status(400).json({ message: 'Customer ID is missing.' });
    }

    try {
      const result = await pool.query(
        `SELECT * FROM measurements WHERE customer_id = $1 LIMIT 1`,
        [Customer_ID]
      );

      return res.status(200).json({
        message: 'success',
        measurement: result.rows[0] || null,
      });
    } catch (error) {
      console.error('GET MEASUREMENT ERROR:', error);
      return res.status(500).json({ message: 'Unable to retrieve measurements.' });
    }
  });

  // POST – create only
  router.post('/measurement', allStaffAuth, async (req, res) => {
    const { Customer_ID } = req.body;

    if (!Customer_ID || typeof Customer_ID !== 'string') {
      return res.status(400).json({ message: 'Customer ID is missing or invalid.' });
    }

    try {
      const existing = await pool.query(
        `SELECT id FROM measurements WHERE customer_id = $1 LIMIT 1`,
        [Customer_ID]
      );

      if (existing.rows.length > 0) {
        return res.status(409).json({
          message: 'Measurements already exist for this customer. Please update instead.',
        });
      }

      const ID = crypto.randomUUID();
      const columns = ['id', 'customer_id'];
      const placeholders = ['$1', '$2'];
      const values = [ID, Customer_ID];
      let parameterIndex = 3;

      for (const [frontendKey, dbColumn] of Object.entries(FIELD_MAP)) {
        columns.push(dbColumn);
        placeholders.push(`$${parameterIndex}`);
        values.push(cleanValue(req.body[frontendKey]));
        parameterIndex++;
      }

      const result = await pool.query(
        `INSERT INTO measurements (${columns.join(', ')})
         VALUES (${placeholders.join(', ')})
         RETURNING *`,
        values
      );

      return res.status(201).json({
        message: 'Measurements saved successfully.',
        measurement: result.rows[0],
      });
    } catch (error) {
      console.error('MEASUREMENT POST ERROR:', error);
      if (error.code === '23503') {
        return res.status(404).json({ message: 'Customer not found.' });
      }
      return res.status(500).json({ message: 'Unable to save measurements right now.' });
    }
  });

  // PATCH – update only
  router.patch('/update-measurement/:Customer_ID', allStaffAuth, async (req, res) => {
    const { Customer_ID } = req.params;

    if (!Customer_ID) {
      return res.status(400).json({ message: 'Customer ID is missing.' });
    }

    try {
      const fields = [];

      for (const [frontendKey, dbColumn] of Object.entries(FIELD_MAP)) {
        if (Object.prototype.hasOwnProperty.call(req.body, frontendKey)) {
          fields.push({
            column: dbColumn,
            value: cleanValue(req.body[frontendKey]),
          });
        }
      }

      if (fields.length === 0) {
        return res.status(400).json({ message: 'No valid measurements were provided.' });
      }

      const setClauses = [];
      const values = [];

      fields.forEach((field, index) => {
        setClauses.push(`${field.column} = $${index + 1}`);
        values.push(field.value);
      });

      values.push(Customer_ID);
      const customerParameter = values.length;

      const result = await pool.query(
        `UPDATE measurements
         SET ${setClauses.join(', ')}
         WHERE customer_id = $${customerParameter}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: 'No measurements found for this customer.',
        });
      }

      return res.status(200).json({
        message: 'Measurements updated successfully.',
        measurement: result.rows[0],
      });
    } catch (error) {
      console.error('MEASUREMENT PATCH ERROR:', error);
      return res.status(500).json({ message: 'Unable to update measurements right now.' });
    }
  });

  return router;
};