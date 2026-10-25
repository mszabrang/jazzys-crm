import { useState } from 'react';
import { API } from '../utils/api';
import InputCard from '../components/common/InputCard';
import Spinner from '../components/common/Spinner';

export default function PublicCustomerRegisterPage() {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    birthday: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  function set(field) {
    return (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API}/api/customers/public-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed.');
        return;
      }

      setSuccess(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo__name">Jazzy's RTW</div>
          </div>
          <p className="auth-subtitle">Thank you!</p>
          <p style={{ textAlign: 'center', color: 'var(--grey-500)' }}>
            Your details have been submitted successfully. We will be in touch soon.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo__name">Jazzy's RTW</div>
        </div>
        <p className="auth-subtitle">Register as a customer</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="field-row">
            <InputCard type="text" onChange={set('firstName')} labelValue="First name" value={form.firstName} />
            <InputCard type="text" onChange={set('lastName')} labelValue="Last name" value={form.lastName} />
          </div>
          <InputCard type="email" onChange={set('email')} labelValue="Email address" value={form.email} />
          <InputCard type="tel" onChange={set('phoneNumber')} labelValue="Phone number" value={form.phoneNumber} />
          <InputCard type="date" onChange={set('birthday')} labelValue="Date of birth" value={form.birthday} />

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn--primary btn--full" disabled={loading}>
            {loading ? <Spinner /> : 'Submit'}
          </button>
        </form>
      </div>
    </div>
  );
}