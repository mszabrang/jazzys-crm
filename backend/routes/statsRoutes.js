const express = require('express');
const { flexAuth } = require('../middleware/auth');

const PERIOD_MAP = {
  '30days': '30 days',
  '3months': '3 months',
  '6months': '6 months',
};

module.exports = (pool) => {
  const router = express.Router();

  router.get('/stats', flexAuth, async (req, res) => {
    const { period } = req.query;

    if (period && !PERIOD_MAP[period]) {
      return res.status(400).json({ message: 'Invalid period.' });
    }

    const interval = PERIOD_MAP[period] || '30 days';

    try {
      const [totalOrdersRes, salesRes, unpaidOrdersRes, paidAmountRes, totalCustomersRes, dueThisWeekRes] =
        await Promise.all([
          pool.query(`SELECT COUNT(*) AS total_orders FROM Orders WHERE Created_at >= NOW() - INTERVAL '${interval}'`),
          pool.query(`SELECT COALESCE(SUM(Amount), 0) AS total_sales FROM Orders WHERE Created_at >= NOW() - INTERVAL '${interval}'`),
          pool.query(`
            SELECT Orders.*,
              Customers.First_name AS customer_first_name,
              Customers.Last_name AS customer_last_name,
              Staff.First_name AS staff_first_name,
              Staff.Last_name AS staff_last_name
            FROM Orders
            LEFT JOIN Customers ON Orders.Customer_ID = Customers.ID
            LEFT JOIN Staff ON Orders.Staff_ID = Staff.ID
            WHERE Orders.Created_at >= NOW() - INTERVAL '${interval}' AND Orders.Amount_paid < Orders.Amount
          `),
          pool.query(`SELECT COALESCE(SUM(Amount_paid), 0) AS total_paid FROM Orders WHERE Created_at >= NOW() - INTERVAL '${interval}'`),
          pool.query(`SELECT COUNT(*) AS total_customers FROM Customers WHERE Created_at >= NOW() - INTERVAL '${interval}'`),
          pool.query(`
            SELECT Orders.*,
              Customers.First_name AS customer_first_name,
              Customers.Last_name AS customer_last_name
            FROM Orders
            LEFT JOIN Customers ON Orders.Customer_ID = Customers.ID
            WHERE Due_date >= DATE_TRUNC('week', CURRENT_DATE)
              AND Due_date < DATE_TRUNC('week', CURRENT_DATE) + INTERVAL '7 days'
            ORDER BY Due_date ASC
          `),
        ]);

      const total_sales = parseFloat(salesRes.rows[0].total_sales);
      const total_paid = parseFloat(paidAmountRes.rows[0].total_paid);

      return res.status(200).json({
        total_sales,
        total_paid,
        unpaidAmount: total_sales - total_paid,
        totalOrders: totalOrdersRes.rows[0].total_orders,
        totalCustomers: totalCustomersRes.rows[0].total_customers,
        unpaidOrders: unpaidOrdersRes.rows,
        dueThisWeek: dueThisWeekRes.rows,
      });
    } catch (error) {
      console.error(error.message);
      return res.status(500).json({ message: 'Server error.' });
    }
  });

  return router;
};