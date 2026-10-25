// Run the daily email job once, right now, to test it:
//   node scripts/runDailyEmails.js
require('dotenv').config();
const pool = require('../db');
const { runDailyEmails } = require('../jobs/dailyEmails');

runDailyEmails(pool)
  .catch((err) => console.error(err))
  .finally(() => pool.end());