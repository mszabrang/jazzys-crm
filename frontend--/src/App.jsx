import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { decodeToken, landingRouteForRole } from './utils/auth';
import AppShell from './components/layout/AppShell';
import LoginPage from './pages/auth/LoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import CustomersPage from './pages/customers/CustomersPage';
import CustomerProfilePage from './pages/customers/CustomerProfilePage';
import OrdersPage from './pages/orders/OrdersPage';
import StaffPage from './pages/staff/StaffPage';
import BirthdaysPage from './pages/BirthdaysPage';
import PublicCustomerRegisterPage from './pages/PublicCustomerRegisterPage';

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const payload = token ? decodeToken(token) : null;

  if (!payload) {
    localStorage.removeItem('token');
    // Remember where they were heading (e.g. a link from an email) so login can take them there
    sessionStorage.setItem('afterLogin', window.location.pathname + window.location.search);
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(payload.role)) {
    return <Navigate to={landingRouteForRole(payload.role)} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <AppShell><DashboardPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <AppShell><CustomersPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <AppShell><CustomerProfilePage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin', 'production']}>
              <AppShell><OrdersPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/staff"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <AppShell><StaffPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route
          path="/birthdays"
          element={
            <ProtectedRoute allowedRoles={['super_admin', 'admin']}>
              <AppShell><BirthdaysPage /></AppShell>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />

        <Route path="/register" element={<PublicCustomerRegisterPage />} />
      </Routes>
    </BrowserRouter>
  );
}