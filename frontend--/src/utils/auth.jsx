import { Navigate } from 'react-router-dom';

export function decodeToken(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));

    if (payload.exp && payload.exp * 1000 < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}

export function getRole() {
  const token = localStorage.getItem('token');

  if (!token) return null;

  const payload = decodeToken(token);

  return payload?.role || null;
}

export function landingRouteForRole(role) {
  if (role === 'production') return '/orders';

  return '/dashboard';
}

export function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const payload = decodeToken(token);

  if (!payload) {
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    return <Navigate to={landingRouteForRole(payload.role)} replace />;
  }

  return children;
}