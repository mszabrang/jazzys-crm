// utils/dates.js — birthday maths done in Lagos time (Abuja is the same time zone).
// Works across month ends and the new year, and handles 29 Feb birthdays.

const TZ = 'Africa/Lagos';

// Today's date in Lagos as { y, m, d }
function lagosToday() {
  const iso = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()); // "2026-10-24"
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
const asUTC = ({ y, m, d }) => Date.UTC(y, m - 1, d);
const daysBetween = (from, to) => Math.round((asUTC(to) - asUTC(from)) / 86400000);

// dobText must look like "YYYY-MM-DD" (use to_char(date_of_birth,'YYYY-MM-DD') in SQL)
// Returns { daysAway, date: {y,m,d}, turning } for the next birthday on/after today.
function nextBirthday(dobText, today = lagosToday()) {
  const [birthYear, m, d] = String(dobText).slice(0, 10).split('-').map(Number);
  if (!m || !d) return null;

  const occurrence = (year) => ({ y: year, m, d: m === 2 && d === 29 && !isLeap(year) ? 28 : d });

  let next = occurrence(today.y);
  if (daysBetween(today, next) < 0) next = occurrence(today.y + 1);

  return {
    daysAway: daysBetween(today, next),
    date: next,
    turning: birthYear > 1900 ? next.y - birthYear : null,
  };
}

// "2026-10-30" style string for a {y,m,d}
const toISODate = ({ y, m, d }) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

module.exports = { lagosToday, nextBirthday, toISODate, TZ };