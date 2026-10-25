import { useNavigate, useLocation } from 'react-router-dom';
import { getRole } from '../../utils/auth';

function TopNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getRole();

  const allLinks = [
    { to: '/dashboard', label: 'Dashboard', roles: ['super_admin', 'admin'] },
    { to: '/customers', label: 'Customers', roles: ['super_admin', 'admin'] },
    { to: '/orders', label: 'Orders', roles: ['super_admin', 'admin', 'production'] },
    { to: '/staff', label: 'Staff', roles: ['super_admin', 'admin'] },
  ];

  const links = allLinks.filter((link) => link.roles.includes(role));

  function handleLogout() {
    localStorage.removeItem('token');
    navigate('/login');
  }

  return (
    <nav className="top-nav">
      <div className="top-nav__links">
        {links.map(({ to, label }) => (
          <button
            key={to}
            className={`top-nav__link ${location.pathname.startsWith(to) ? 'top-nav__link--active' : ''}`}
            onClick={() => navigate(to)}
          >
            {label}
          </button>
        ))}
      </div>
      <button className="top-nav__logout" onClick={handleLogout}>Log out</button>
    </nav>
  );
}

export default TopNav;