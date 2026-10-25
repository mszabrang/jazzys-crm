import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { API } from '../../utils/api';
import InputCard from '../../components/common/InputCard';
import Spinner from '../../components/common/Spinner';

// Opened from the link in the reset email:  /reset-password?token=...
export default function ResetPasswordPage() {
  const token = new URLSearchParams(window.location.search).get('token') || '';
  const [stage, setStage] = useState('checking'); // checking | invalid | form | done
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Check the link straight away so an expired link says so before anyone types a password
  useEffect(() => {
    if (!token) {
      setStage('invalid');
      return;
    }
    (async () => {
      try {
        const res = await fetch(`${API}/api/auth/reset-password/check?token=${encodeURIComponent(token)}`);
        const data = await res.json();
        setStage(data.valid ? 'form' : 'invalid');
      } catch {
        setStage('invalid');
      }
    })();
  }, [token]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Something went wrong.');
        return;
      }

      localStorage.removeItem('token'); // make sure nobody stays signed in on the old password
      setStage('done');
      setTimeout(() => navigate('/login'), 2500);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo__name">Jazzy's RTW</div>
        </div>

        {stage === 'checking' && (
          <div className="loader-center" style={{ marginTop: 32 }}>
            <Spinner />
          </div>
        )}

        {stage === 'invalid' && (
          <>
            <p className="auth-subtitle">This link has expired</p>
            <p className="auth-message">
              Reset links work once and expire after 15 minutes. Request a new one and we will email it right away.
            </p>
            <a href="/forgot-password" className="btn btn--primary btn--full" style={{ marginTop: 16 }}>
              Request a new link
            </a>
            <a href="/login" className="auth-link">Back to sign in</a>
          </>
        )}

        {stage === 'form' && (
          <>
            <p className="auth-subtitle">Choose a new password</p>
            <form onSubmit={handleSubmit} className="auth-form">
              <InputCard type="password" onChange={(e) => setNewPassword(e.target.value)} labelValue="New password" value={newPassword} />
              <InputCard type="password" onChange={(e) => setConfirmPassword(e.target.value)} labelValue="Confirm password" value={confirmPassword} />
              <p className="form-hint" style={{ width: '100%', textAlign: 'left' }}>At least 8 characters.</p>
              {error && <p className="form-error">{error}</p>}
              <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
                {loading ? <Spinner /> : 'Save new password'}
              </button>
            </form>
          </>
        )}

        {stage === 'done' && (
          <>
            <p className="auth-subtitle">Password updated</p>
            <p className="auth-message">Taking you to sign in…</p>
            <a href="/login" className="auth-link">Sign in now</a>
          </>
        )}
      </div>
    </div>
  );
}