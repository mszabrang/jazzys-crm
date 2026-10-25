import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { landingRouteForRole } from '../../utils/auth';
import InputCard from '../../components/common/InputCard';
import Spinner from '../../components/common/Spinner';

const API = import.meta.env.VITE_API_URL;

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Login failed.');
        return;
      }
      localStorage.setItem('token', data.token);
      if (data.mustResetPassword) {
        navigate(`/forgot-password?email=${encodeURIComponent(email)}`);
        return;
      }

      // If they came from an email link (e.g. /birthdays), take them there after signing in
      const next = sessionStorage.getItem('afterLogin');
      sessionStorage.removeItem('afterLogin');
      const safeNext = next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/login') ? next : null;
      navigate(safeNext || landingRouteForRole(data.role));
    } catch {
      setError('Network error. Check your connection.');
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
        <p className="auth-subtitle">Sign in to your account</p>
        <form onSubmit={handleSubmit} className="auth-form">
          <InputCard type="text" onChange={(e) => setEmail(e.target.value)} labelValue="Email address" value={email} />
          <InputCard type="password" onChange={(e) => setPassword(e.target.value)} labelValue="Password" value={password} />
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? <Spinner /> : 'Sign in'}
          </button>
          <a href="/forgot-password" className="auth-link">Forgot password?</a>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;