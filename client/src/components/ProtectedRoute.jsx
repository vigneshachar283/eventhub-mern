import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

/**
 * Wraps a route that requires authentication and, optionally, a specific role.
 *
 * - While the auth check is in flight (loading=true), renders a full-page spinner
 *   so the page doesn't flash to /login before the /auth/me response arrives.
 * - Unauthenticated users are redirected to /login, with the attempted URL
 *   saved in location state so Login can redirect back after success.
 * - Authenticated users whose role doesn't match are redirected to /.
 */
export default function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Loader fullPage />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }

  return children;
}
