import { useState } from 'react';
import { createPortal } from 'react-dom';
import { NavLink, useNavigate } from 'react-router-dom';
import { getRole } from '../../utils/auth';
import ChangePasswordModal from './ChangePasswordModal';

export default function Sidebar({ onClose, forceOpen = false }) {
  const navigate = useNavigate();
  const role = getRole();
  const [showChangePassword, setShowChangePassword] = useState(false);

  const allLinks = [
    { to: '/dashboard', label: 'Dashboard', roles: ['super_admin', 'admin'] },
    { to: '/customers', label: 'Customers', roles: ['super_admin', 'admin'] },
    { to: '/orders', label: 'Orders', roles: ['super_admin', 'admin', 'production'] },
    { to: '/staff', label: 'Staff', roles: ['super_admin', 'admin'] },
    { to: '/birthdays', label: 'Upcoming Birthdays', roles: ['super_admin', 'admin'] },
  ];

  const links = allLinks.filter((link) => link.roles.includes(role));

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <aside className={`sidebar ${forceOpen ? 'sidebar--static' : ''}`}>
      <div className="sidebar__top">
        <div className="sidebar__brand">
          <span className="sidebar__brand-name">Jazzy's RTW</span>
        </div>

        {/* X button – only shown on mobile */}
        {!forceOpen && (
          <button
            type="button"
            className="sidebar__close icon-btn"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M2 2l14 14M16 2L2 16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>

      <nav className="sidebar__nav">
        {links.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
            }
            onClick={onClose}
          >
            {label}
          </NavLink>
        ))}
      </nav>

      <button type="button" className="sidebar__logout" onClick={() => setShowChangePassword(true)}>
        Change password
      </button>

      <button type="button" className="sidebar__logout sidebar__logout--plain" onClick={handleLogout}>
        Log out
      </button>

      {/* Rendered on document.body so the sidebar's own layout can't squash it */}
      {showChangePassword &&
        createPortal(
          <ChangePasswordModal onClose={() => setShowChangePassword(false)} />,
          document.body
        )}
    </aside>
  );
}