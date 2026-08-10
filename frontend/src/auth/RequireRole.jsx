import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import { FullPageLoader } from '../components/ui/FullPageLoader.jsx';

/** Route guard: sends anonymous visitors to sign-in, wrong roles to their home. */
export function RequireRole({ role, children }) {
  const { isAuthenticated, restoring, user } = useAuth();
  const location = useLocation();

  if (restoring) return <FullPageLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to={homeFor(user.role)} replace />;

  return children;
}

export function homeFor(role) {
  if (role === 'student') return '/student';
  if (role === 'mentor') return '/mentor';
  if (role === 'advisor') return '/advisor';
  if (role === 'coordinator') return '/coordinator';
  return '/login';
}
