function formatMoney(val) {
  return Number(val).toLocaleString('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 });
}

function formatDate(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatBirthday(val) {
  if (!val) return '—';
  return new Date(val).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export { formatMoney, formatDate, formatBirthday };