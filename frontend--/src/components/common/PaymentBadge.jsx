// Paid        = everything paid
// Part-paid   = something paid, balance still owing   (was shown as "Unpaid" before)
// Unpaid      = nothing paid yet
export default function PaymentBadge({ amount, amountPaid }) {
  const total = parseFloat(amount) || 0;
  const paid = parseFloat(amountPaid) || 0;

  let label = 'Unpaid';
  let tone = 'badge--error';

  if (total > 0 && paid >= total) {
    label = 'Paid';
    tone = 'badge--success';
  } else if (paid > 0) {
    label = 'Part-paid';
    tone = 'badge--partial';
  }

  return <span className={`badge ${tone}`}>{label}</span>;
}