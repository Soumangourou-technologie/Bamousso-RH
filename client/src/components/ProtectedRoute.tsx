import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
  allowedPermissions?: string[];
}

const ProtectedRoute = ({ allowedRoles, allowedPermissions }: ProtectedRouteProps) => {
  const { user, company, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-base">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles || allowedPermissions) {
    const hasRole = allowedRoles ? allowedRoles.includes(user.role) : false;
    const hasPermission = allowedPermissions && user.permissions ? allowedPermissions.some(p => user.permissions.includes(p)) : false;
    
    if (!hasRole && !hasPermission) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // Sécurité renforcée : Si l'entreprise n'est pas activée ou est verrouillée (sauf SUPER_ADMIN)
  if (user.role !== 'SUPER_ADMIN' && company) {
    const isInactiveOrLocked = company.isActive === false || company.isLocked === true || company.subscriptionStatus === 'PENDING';
    const allowedUnpaidPaths = ['/locked', '/payment', '/payment-success', '/payment-cancelled'];

    if (isInactiveOrLocked && !allowedUnpaidPaths.includes(location.pathname)) {
      return <Navigate to="/locked" replace />;
    }
  }

  return <Outlet />;
};

export default ProtectedRoute;
