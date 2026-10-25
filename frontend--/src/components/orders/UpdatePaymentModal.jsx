import { useState } from 'react';
import { API, authFetch } from '../../utils/api';
import { formatMoney } from '../../utils/formatters';
import { getRole } from '../../utils/auth';
import InputCard from '../common/InputCard';
import Dropdown from '../common/dropdown';
import Spinner from '../common/Spinner';

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'ready', label: 'Ready' },
  { value: 'delivered', label: 'Delivered' },
];

export default function UpdatePaymentModal({ order, onClose, onSuccess, onError }) {
  const isProduction = getRole() === 'production';

  const [amount, setAmount] = useState(order.amount ?? '');
  const [amountPaid, setAmountPaid] = useState(order.amount_paid || 0);
  const [status, setStatus] = useState(order.status || 'pending');
  const [description, setDescription] = useState(order.description || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const total = parseFloat(isProduction ? order.amount : amount);
    const paid = parseFloat(amountPaid);

    if (!Number.isFinite(total) || total <= 0) {
      onError('Please enter a valid order amount.');
      return;
    }
    if (!Number.isFinite(paid) || paid < 0) {
      onError('Please enter a valid amount paid.');
      return;
    }
    // The rule: you can't have paid more than the order costs
    if (paid > total) {
      onError('Amount paid cannot be more than the order amount.');
      return;
    }

    if (!isProduction && !description.trim()) {
      onError('Description cannot be empty.');
      return;
    }

    setLoading(true);

    try {
      const body = { amount_paid: paid, status };
      if (!isProduction) {
        body.amount = total;
        body.description = description;
      }

      const response = await authFetch(`${API}/api/orders/update-order/${order.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        // Show server messages as a toast too (e.g. the same overpayment rule)
        onError(data.message || 'Failed to update order.');
        return;
      }

      onSuccess('Order updated successfully.');
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2 className="modal__title">Update Order</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal__form" noValidate>
          <p className="form-hint">
            {order.customer_first_name} {order.customer_last_name}
            {isProduction ? ` — Total: ${formatMoney(order.amount)}` : ''}
          </p>

          {!isProduction && (
            <InputCard
              type="number"
              onChange={(e) => setAmount(e.target.value)}
              labelValue="Amount (₦)"
              value={amount}
            />
          )}

          <InputCard
            type="number"
            onChange={(e) => setAmountPaid(e.target.value)}
            labelValue="Amount paid (₦)"
            value={amountPaid}
          />

          <Dropdown label="Status" options={STATUS_OPTIONS} value={status} onChange={setStatus} />

          {!isProduction && (
            <div className="modal-textarea">
              <label htmlFor="order-description">Description</label>
              <textarea
                id="order-description"
                value={description}
                maxLength={2000}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? <Spinner /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}