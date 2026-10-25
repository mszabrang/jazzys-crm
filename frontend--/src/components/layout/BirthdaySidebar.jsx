import { useState, useEffect } from 'react';
import { getRole } from '../../utils/auth';
import { formatBirthday } from '../../utils/formatters';
import Spinner from '../common/Spinner';

const API = import.meta.env.VITE_API_URL;

function authFetch(url, options = {}) {
  const token = localStorage.getItem('token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });
}

function BirthdaySidebar() {
  const [birthdays, setBirthdays] = useState([]);
  const [loading, setLoading] = useState(true);
  const role = getRole();

  useEffect(() => {
    if (role === 'production') return;
    const fetch_ = async () => {
      try {
        const response = await authFetch(`${API}/api/customers/upcoming-birthdays`);
        const data = await response.json();
        if (response.ok) setBirthdays(data.upcomingBirthdays || []);
      } catch {
        // silent fail, sidebar is non-critical
      } finally {
        setLoading(false);
      }
    };
    fetch_();
  }, [role]);

  if (role === 'production') return null;

  return (
    <aside className="birthday-sidebar">
      <p className="birthday-sidebar__title">Upcoming Birthdays</p>
      {loading ? (
        <div className="loader-center"><Spinner /></div>
      ) : birthdays.length === 0 ? (
        <p className="birthday-sidebar__empty">No birthdays in the next two weeks.</p>
      ) : (
        <div className="birthday-sidebar__list">
          {birthdays.map((c) => (
            <div className="birthday-sidebar__item" key={c.id}>
              <span className="birthday-sidebar__name">{c.first_name} {c.last_name}</span>
              <span className="birthday-sidebar__date">{formatBirthday(c.date_of_birth)}</span>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}

export default BirthdaySidebar;