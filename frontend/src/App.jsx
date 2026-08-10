import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireRole, homeFor } from './auth/RequireRole.jsx';
import { useAuth } from './auth/AuthContext.jsx';
import { FullPageLoader } from './components/ui/FullPageLoader.jsx';
import Login from './pages/Login.jsx';
import StudentRecordBook from './pages/student/StudentRecordBook.jsx';
import MentorConsole from './pages/mentor/MentorConsole.jsx';
import { AdvisorConsole, CoordinatorConsole } from './pages/oversight/OversightConsole.jsx';
import NotFound from './pages/NotFound.jsx';

export default function App() {
  const { restoring, isAuthenticated, user } = useAuth();

  if (restoring) return <FullPageLoader />;

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        path="/student/*"
        element={
          <RequireRole role="student">
            <StudentRecordBook />
          </RequireRole>
        }
      />

      <Route
        path="/mentor/*"
        element={
          <RequireRole role="mentor">
            <MentorConsole />
          </RequireRole>
        }
      />

      <Route
        path="/advisor/*"
        element={
          <RequireRole role="advisor">
            <AdvisorConsole />
          </RequireRole>
        }
      />

      <Route
        path="/coordinator/*"
        element={
          <RequireRole role="coordinator">
            <CoordinatorConsole />
          </RequireRole>
        }
      />

      <Route
        path="/"
        element={<Navigate to={isAuthenticated ? homeFor(user.role) : '/login'} replace />}
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
