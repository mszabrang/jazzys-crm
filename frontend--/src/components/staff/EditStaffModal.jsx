import { useState } from 'react';
import { API, authFetch } from '../../utils/api';
import ModalInput from '../common/ModalInput';
import Dropdown from '../common/dropdown';
import Spinner from '../common/Spinner';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'production', label: 'Production' },
];

export default function EditStaffModal({ member, canChangeRole, onClose, onSuccess }) {
  const [form, setForm] = useState({
    firstName: member.first_name || '',
    lastName: member.last_name || '',
    email: member.email || '',
    phoneNumber: member.phone_number || '',
    tier: member.tier || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!form.firstName.trim() || !form.lastName.trim() || !form.email.trim() || !form.phoneNumber.trim()) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    try {
      const body = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phoneNumber: form.phoneNumber,
      };
      if (canChangeRole) body.tier = form.tier;

      const response = await authFetch(`${API}/api/staff/update-staff/${member.id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Failed to update staff.');
        return;
      }

      onSuccess('Staff updated successfully.');
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
          <h2 className="modal__title">Edit Staff</h2>
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

          {canChangeRole && (
            <Dropdown
              label="Role"
              options={ROLE_OPTIONS}
              value={form.tier}
              onChange={(v) => setForm((f) => ({ ...f, tier: v }))}
            />
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