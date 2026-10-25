import { useState } from 'react';
import { API, authFetch } from '../../utils/api';
import InputCard from '../common/InputCard';
import Spinner from '../common/Spinner';

// Change password while already signed in. No email needed.
export default function ChangePasswordModal({ onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from the current one.');
      return;
    }

    setLoading(true);
    try {
      const response = await authFetch(`${API}/api/auth/change-password`, {
        method: 'PATCH',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Could not change password.');
        return;
      }

      setDone(true);
      setTimeout(onClose, 1600);
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
          <h2 className="modal__title">Change Password</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path d="M2 2l14 14M16 2L2 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="modal__body">
            <p className="form-success">Password changed successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="modal__form">
            <InputCard type="password" onChange={(e) => setCurrentPassword(e.target.value)} labelValue="Current password" value={currentPassword} />
            <InputCard type="password" onChange={(e) => setNewPassword(e.target.value)} labelValue="New password" value={newPassword} />
            <InputCard type="password" onChange={(e) => setConfirmPassword(e.target.value)} labelValue="Confirm new password" value={confirmPassword} />
            <p className="form-hint">At least 8 characters.</p>

            {error && <p className="form-error">{error}</p>}

            <div className="modal__actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn--primary" disabled={loading}>
                {loading ? <Spinner /> : 'Update Password'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}