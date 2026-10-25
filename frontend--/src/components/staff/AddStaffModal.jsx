import { useState } from 'react';
import { API, authFetch } from '../../utils/api';
import ModalInput from '../common/ModalInput';
import Dropdown from '../common/dropdown';
import Spinner from '../common/Spinner';

export default function AddStaffModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    tier: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  function handleClose(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onClose();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authFetch(`${API}/api/staff/add-staff`, {
        method: 'POST',
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to add staff.');
        return;
      }

      onSuccess(data.message || 'Staff member added. They can set their password with "Forgot password" on the sign-in page.');
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
      onClick={handleClose}
    >
      <div
        className="modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal__header">
          <h2 className="modal__title">Add Staff</h2>
          <button
            type="button"
            className="icon-btn"
            onClick={handleClose}
            aria-label="Close"
          >
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

          <Dropdown
            label="Role"
            options={[
              { value: 'admin', label: 'Admin' },
              { value: 'production', label: 'Production' },
            ]}
            value={form.tier}
            onChange={(v) => setForm((f) => ({ ...f, tier: v }))}
          />

          {error && <p className="form-error">{error}</p>}

          <div className="modal__actions">
            <button type="button" className="btn btn--ghost" onClick={handleClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary" disabled={loading}>
              {loading ? <Spinner /> : 'Add Staff'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}