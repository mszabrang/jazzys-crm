import { useState } from 'react';
import { API, authFetch } from '../../utils/api';
import ModalInput from '../common/ModalInput';
import Spinner from '../common/Spinner';

// Turns whatever the server sends for a date into "YYYY-MM-DD" for the date field
function toDateInput(val) {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d)) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function EditCustomerModal({ customer, onClose, onSuccess }) {
  const [form, setForm] = useState({
    firstName: customer.first_name || '',
    lastName: customer.last_name || '',
    email: customer.email || '',
    phoneNumber: customer.phone_number || '',
    birthday: toDateInput(customer.date_of_birth),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.firstName.trim() || !form.lastName.trim() || !form.phoneNumber.trim()) {
      setError('First name, last name and phone number are required.');
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${API}/api/customers/update-customer/${customer.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          First_name: form.firstName.trim(),
          Last_name: form.lastName.trim(),
          Email: form.email.trim().toLowerCase() || null,
          Phone_number: form.phoneNumber.trim(),
          Date_of_birth: form.birthday || null,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to update customer.');
        return;
      }

      onSuccess('Customer updated successfully.');
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
          <h2 className="modal__title">Edit Customer</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal__form" noValidate>
          <div className="field-row">
            <ModalInput type="text" text="First name" onChange={set('firstName')} value={form.firstName} />
            <ModalInput type="text" text="Last name" onChange={set('lastName')} value={form.lastName} />
          </div>
          <ModalInput type="text" text="Email address" onChange={set('email')} value={form.email} />
          <ModalInput type="text" text="Phone number" onChange={set('phoneNumber')} value={form.phoneNumber} />
          <ModalInput type="date" text="Date of birth" onChange={set('birthday')} value={form.birthday} />

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