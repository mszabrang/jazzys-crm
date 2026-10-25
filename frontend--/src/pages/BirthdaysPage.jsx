import { useEffect, useState } from 'react';
import { API, authFetch } from '../utils/api';
import { formatBirthday } from '../utils/formatters';
import Spinner from '../components/common/Spinner';
import Toast from '../components/common/Toast';
import useToast from '../hooks/useToast';

const MAX_LENGTH = 1000;

function whenLabel(days) {
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `In ${days} days`;
}

function BirthdayCard({ customer, onUpdated, showToast }) {
  const [draft, setDraft] = useState(customer.saved_message || '');
  const [saving, setSaving] = useState(false);

  const isToday = customer.days_away === 0;
  const hasEmail = Boolean(customer.email);
  const sentToday = customer.message_status === 'sent' && isToday;

  // Their birthday is today and nothing was written: send the default message right now
  async function sendDefaultNow() {
    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/customers/birthday-send-now/${customer.id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Could not send the message.', 'error');
        return;
      }
      showToast(data.message);
      onUpdated(customer.id, { message_status: 'sent', saved_message: '' });
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    if (!draft.trim()) {
      if (isToday) sendDefaultNow();
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/customers/birthday-message/${customer.id}`, {
        method: 'POST',
        body: JSON.stringify({ message: draft }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Could not save the message.', 'error');
        return;
      }
      showToast(data.message);
      onUpdated(customer.id, {
        message_status: data.status === 'sent' ? 'sent' : 'scheduled',
        saved_message: data.status === 'sent' ? '' : draft.trim(),
      });
      if (data.status === 'sent') setDraft('');
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    try {
      const res = await authFetch(`${API}/api/customers/birthday-message/${customer.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.message || 'Could not remove the message.', 'error');
        return;
      }
      setDraft('');
      onUpdated(customer.id, { message_status: 'none', saved_message: '' });
      showToast('Saved message removed.');
    } catch {
      showToast('Network error. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="birthday-card">
      <div className="birthday-card__top">
        <div className="list-card__info">
          <p className="list-card__name">
            {customer.first_name} {customer.last_name}
          </p>
          {customer.phone_number && <p className="list-card__meta">{customer.phone_number}</p>}
          {customer.email && <p className="list-card__meta">{customer.email}</p>}
          {customer.turning ? <p className="list-card__meta">Turning {customer.turning}</p> : null}
        </div>

        <div className="birthday-card__when">
          <span className="badge badge--info">{formatBirthday(customer.date_of_birth)}</span>
          <span className="list-card__meta">{whenLabel(customer.days_away)}</span>
          {customer.message_status === 'scheduled' && <span className="badge badge--partial badge--small">Message saved</span>}
          {customer.message_status === 'sent' && <span className="badge badge--success badge--small">Message sent</span>}
          {customer.message_status === 'none' && hasEmail && <span className="badge badge--neutral badge--small">Default message</span>}
        </div>
      </div>

      <div className="birthday-card__message">
        {!hasEmail ? (
          <p className="birthday-card__hint">
            No email address on file, so a birthday message can't be sent to this customer.
          </p>
        ) : sentToday ? (
          <p className="birthday-card__hint">Today's birthday message has been sent.</p>
        ) : (
          <>
            <label htmlFor={`msg-${customer.id}`}>Personal birthday message (optional)</label>
            <textarea
              id={`msg-${customer.id}`}
              value={draft}
              maxLength={MAX_LENGTH}
              placeholder={`Write a personal message for ${customer.first_name}…`}
              onChange={(e) => setDraft(e.target.value)}
            />
            <div className="birthday-card__footer">
              <span className="birthday-card__hint">
                {isToday
                  ? 'Their birthday is today, so this sends immediately.'
                  : 'Emailed on their birthday at 7:00 AM. Leave it empty and they get the default birthday message.'}
              </span>
              <div className="birthday-card__buttons">
                {customer.message_status === 'scheduled' && (
                  <button type="button" className="btn btn--ghost btn--small" onClick={handleClear} disabled={saving}>
                    Remove
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn--primary btn--small"
                  onClick={handleSave}
                  disabled={saving || (!draft.trim() && !isToday)}
                >
                  {saving ? (
                    <Spinner />
                  ) : isToday ? (
                    draft.trim() ? 'Send now' : 'Send default now'
                  ) : customer.message_status === 'scheduled' ? (
                    'Update message'
                  ) : (
                    'Save message'
                  )}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function BirthdaysPage() {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { toast, show: showToast } = useToast();

  useEffect(() => {
    const fetch_ = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await authFetch(`${API}/api/customers/upcoming-birthdays`);
        const data = await response.json();
        if (!response.ok) {
          setError(data.message || 'Failed to load birthdays.');
          return;
        }
        setBirthdays(data.upcomingBirthdays || []);
      } catch {
        setError('Network error.');
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, []);

  function handleUpdated(id, changes) {
    setBirthdays((list) => list.map((c) => (c.id === id ? { ...c, ...changes } : c)));
  }

  return (
    <div className="page">
      <Toast toast={toast} />

      <div className="page-header">
        <h1>Upcoming Birthdays</h1>
      </div>
      <p style={{ fontSize: '13px', color: 'var(--grey-500)', marginBottom: '28px', marginTop: '-16px' }}>
        Customers celebrating within the next two weeks. Write a message and it is emailed on their birthday.
      </p>

      {loading ? (
        <div className="loader-center"><Spinner /></div>
      ) : error ? (
        <p className="page-error">{error}</p>
      ) : birthdays.length === 0 ? (
        <p className="empty-state">No birthdays in the next two weeks.</p>
      ) : (
        <div className="list">
          {birthdays.map((c) => (
            <BirthdayCard key={c.id} customer={c} onUpdated={handleUpdated} showToast={showToast} />
          ))}
        </div>
      )}
    </div>
  );
}