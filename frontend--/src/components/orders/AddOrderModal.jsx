import { useState, useEffect } from 'react';
import { API, authFetch } from '../../utils/api';
import InputCard from '../common/InputCard';
import ModalDropdown from '../common/ModalDropdown';
import Spinner from '../common/Spinner';

export default function AddOrderModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    dueDate: '',
    amount: '',
    amountPaid: '',
    description: '',
  });
  const [Customer_ID, setCustomer_ID] = useState('');
  const [staff_ID, setStaff_ID] = useState('');
  const [customers, setCustomers] = useState([]);
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchDropdowns = async () => {
      try {
        const [cRes, sRes] = await Promise.all([
          authFetch(`${API}/api/customers/get-customers`),
          authFetch(`${API}/api/staff/staff`),
        ]);
        const cData = await cRes.json();
        const sData = await sRes.json();
        if (cRes.ok) setCustomers(cData.customers || []);
        if (sRes.ok) setStaff(sData.allStaff || []);
      } catch {
        setError('Failed to load customers or staff.');
      }
    };
    fetchDropdowns();
  }, []);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!Customer_ID || !staff_ID) {
      setError('Please select a customer and staff member.');
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${API}/api/orders/create-order`, {
        method: 'POST',
        body: JSON.stringify({
          dueDate: form.dueDate,
          amount: parseFloat(form.amount),
          amountPaid: parseFloat(form.amountPaid) || 0,
          description: form.description,
          Customer_ID,
          staff_ID,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to create order.');
        return;
      }

      onSuccess('Order created successfully.');
      onClose();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal">
        <div className="modal__header">
          <h2 className="modal__title">New Order</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal__form">
          <ModalDropdown
            items={customers}
            value={Customer_ID}
            onChange={(e) => setCustomer_ID(e.target.value)}
            placeholder="Select customer"
          />
          <ModalDropdown
            items={staff}
            value={staff_ID}
            onChange={(e) => setStaff_ID(e.target.value)}
            placeholder="Assign staff"
          />

          <div className="field-row">
            <InputCard type="number" onChange={set('amount')} labelValue="Amount (₦)" value={form.amount} />
            <InputCard type="number" onChange={set('amountPaid')} labelValue="Amount paid so far (₦)" value={form.amountPaid} />
          </div>

          <InputCard type="date" onChange={set('dueDate')} labelValue="Delivery date" value={form.dueDate} />

          <div className="field">
            <textarea
              placeholder=" "
              value={form.description}
              onChange={set('description')}
              rows={3}
              id="description"
            />
            <label htmlFor="description">Description</label>
          </div>

          {error && <p className="form-error">{error}</p>}

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? <Spinner /> : 'Create Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}