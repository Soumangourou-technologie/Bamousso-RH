import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DashboardRedirect = () => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'SUPER_ADMIN') return <Navigate to="/dashboard/super-admin" replace />;
  if (user.role === 'COMPANY_ADMIN') return <Navigate to="/dashboard/admin" replace />;
  if (user.role === 'HR_MANAGER' || user.role === 'HR_ASSISTANT') return <Navigate to="/dashboard/hr" replace />;
  return <Navigate to="/dashboard/employee" replace />;
};

export default DashboardRedirect;

