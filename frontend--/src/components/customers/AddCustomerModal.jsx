import { useState } from 'react';
import { API, authFetch } from '../../utils/api';
import ModalInput from '../common/ModalInput';
import Spinner from '../common/Spinner';

export default function AddCustomerModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    birthday: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authFetch(`${API}/api/customers/register-customer`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to add customer.');
        return;
      }

      onSuccess(data.message || 'Customer added successfully.');
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
          <h2 className="modal__title">Add Customer</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal__form">
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
              {loading ? <Spinner /> : 'Add Customer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}