require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const { startDailyEmailJob } = require('./jobs/dailyEmails');

const app = express();
const PORT = process.env.PORT || 5000;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

startDailyEmailJob(pool);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const authRoutes = require('./routes/AuthRoutes')(pool);
const customerRoutes = require('./routes/customerRoutes')(pool);
const measurementRoutes = require('./routes/measurementRoutes')(pool);
const orderRoutes = require('./routes/orderRoutes')(pool);
const statsRoutes = require('./routes/statsRoutes')(pool);
const staffRoutes = require('./routes/staffRoutes')(pool);

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/staff', staffRoutes);

// Simple health check (hosting platforms use this to know the app is alive)
app.get('/health', (req, res) => res.status(200).json({ ok: true }));

app.use((req, res) => res.status(404).json({ message: 'Route not found.' }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal server error.' });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));