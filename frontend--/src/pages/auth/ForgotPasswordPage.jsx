import { useState } from 'react';
import InputCard from '../../components/common/InputCard';
import Spinner from '../../components/common/Spinner';

const API = import.meta.env.VITE_API_URL;

// Step 1 of resetting a password: type your email, we send a link.
// (The link opens /reset-password, where the new password is chosen.)
function ForgotPasswordPage() {
  const prefillEmail = new URLSearchParams(window.location.search).get('email') || '';
  const [email, setEmail] = useState(prefillEmail);
  const [stage, setStage] = useState('request'); // request | sent
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleRequest(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Something went wrong.');
        return;
      }
      setStage('sent');
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
        <p className="auth-subtitle">{stage === 'request' ? 'Reset your password' : 'Check your email'}</p>

        {stage === 'request' ? (
          <form onSubmit={handleRequest} className="auth-form">
            <InputCard type="text" onChange={(e) => setEmail(e.target.value)} labelValue="Email address" value={email} />
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
              {loading ? <Spinner /> : 'Send reset link'}
            </button>
            <a href="/login" className="auth-link">Back to sign in</a>
          </form>
        ) : (
          <div className="auth-form">
            <p className="auth-message">
              If an account exists for <strong>{email}</strong>, we have sent a link to reset the password.
              It expires in 15 minutes.
            </p>
            <p className="auth-message">Nothing there? Check your spam folder.</p>
            <button
              type="button"
              className="auth-link"
              onClick={() => setStage('request')}
              style={{ background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Use a different email
            </button>
            <a href="/login" className="auth-link" style={{ marginTop: 8 }}>Back to sign in</a>
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPasswordPage;