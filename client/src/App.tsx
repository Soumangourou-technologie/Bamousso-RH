import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Locked from './pages/Locked';
import DashboardAdmin from './pages/DashboardAdmin';
import DashboardHR from './pages/DashboardHR';
import DashboardEmployee from './pages/DashboardEmployee';
import Employees from './pages/Employees';
import Departments from './pages/Departments';
import Leaves from './pages/Leaves';
import Attendance from './pages/Attendance';
import Documents from './pages/Documents';
import Announcements from './pages/Announcements';
import Settings from './pages/Settings';
import DashboardSuperAdmin from './pages/DashboardSuperAdmin';
import SuperAdminOfflineClients from './pages/SuperAdminOfflineClients';
import SuperAdminBroadcast from './pages/SuperAdminBroadcast';
import SuperAdminPixelAnalytics from './pages/SuperAdminPixelAnalytics';
import MetaPixelTracker from './components/MetaPixelTracker';
import Unauthorized from './pages/Unauthorized';
import DashboardRedirect from './pages/DashboardRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import MainLayout from './layouts/MainLayout';
import Register from './pages/Register';
import Payment from './pages/Payment';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancelled from './pages/PaymentCancelled';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Analytics from './pages/Analytics';
import Tasks from './pages/Tasks';
import Messaging from './pages/Messaging';
import Suggestions from './pages/Suggestions';
import Explanations from './pages/Explanations';
import Salaries from './pages/Salaries';
import Roles from './pages/Roles';
import Conflicts from './pages/Conflicts';
import ClientRegistration from './pages/ClientRegistration';
import ClientRegistrationAdmin from './pages/ClientRegistrationAdmin';
import Support from './pages/Support';
import Upgrade from './pages/Upgrade';
import Missions from './pages/Missions';
import WorkSchedules from './pages/WorkSchedules';
import Accounting from './pages/Accounting';
import DirectOrders from './pages/DirectOrders';
import SupplierQuotes from './pages/SupplierQuotes';
import ProfessionalDirectory, { SupplierProfileEditor } from './pages/ProfessionalDirectory';
import ProductsManager from './pages/sales/ProductsManager';
import PointOfSale from './pages/sales/PointOfSale';
import SalesHistory from './pages/sales/SalesHistory';

import { NotificationProvider } from './context/NotificationContext';

import { Capacitor } from '@capacitor/core';
import SplashMobile from './components/SplashMobile';

const RootRoute = () => {
  if (Capacitor.isNativePlatform()) {
    return <SplashMobile />;
  }
  return <Landing />;
};

function App() {
  return (
    <BrowserRouter>
      <MetaPixelTracker />
      <ThemeProvider>
        <AuthProvider>
          <NotificationProvider>
            <Routes>
              <Route path="/" element={<RootRoute />} />
              <Route path="/annuaire-pro" element={<ProfessionalDirectory />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-cancelled" element={<PaymentCancelled />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              {/* Protected Routes */}
              <Route element={<ProtectedRoute />}>
                <Route path="/locked" element={<Locked />} />

                <Route element={<MainLayout />}>
                  <Route path="/unauthorized" element={<Unauthorized />} />
                  <Route path="/dashboard" element={<DashboardRedirect />} />

                  {/* Super Admin Route */}
                  <Route element={<ProtectedRoute allowedRoles={['SUPER_ADMIN']} />}>
                    <Route path="/dashboard/super-admin" element={<DashboardSuperAdmin />} />
                    <Route path="/dashboard/super-admin/offline" element={<SuperAdminOfflineClients />} />
                    <Route path="/dashboard/super-admin/broadcast" element={<SuperAdminBroadcast />} />
                    <Route path="/dashboard/super-admin/pixel-analytics" element={<SuperAdminPixelAnalytics />} />
                  </Route>

                  {/* Modules protégés par rôle (RH/Admin) */}
                  <Route element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN']} />}>
                    <Route path="/dashboard/admin" element={<DashboardAdmin />} />
                    <Route path="/annuaire-pro/commandes" element={<DirectOrders />} />
                    <Route path="/annuaire-pro/cotations" element={<SupplierQuotes />} />
                    <Route path="/annuaire-pro/ma-fiche" element={<SupplierProfileEditor />} />
                    <Route path="/roles" element={<Roles />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['HR_MANAGER', 'HR_ASSISTANT', 'RH']} />}>
                    <Route path="/dashboard/hr" element={<DashboardHR />} />
                  </Route>

                  <Route element={<ProtectedRoute allowedRoles={['EMPLOYEE', 'LIVREUR', 'COMMERCIAL', 'VENDEUR', 'ASSISTANT', 'COMPTABLE']} />}>
                    <Route path="/dashboard/employee" element={<DashboardEmployee />} />
                  </Route>

                  {/* Pages RH */}
                  <Route element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ASSISTANT', 'RH']} />}>
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/departments" element={<Departments />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/work-schedules" element={<WorkSchedules />} />
                  </Route>

                  {/* Modules accessibles à tous selon forfait */}
                  <Route path="/leaves" element={<Leaves />} />
                  <Route path="/attendance" element={<Attendance />} />
                  <Route path="/documents" element={<Documents />} />
                  <Route path="/announcements" element={<Announcements />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/tasks" element={<Tasks />} />
                  <Route path="/messaging" element={<Messaging />} />
                  <Route path="/suggestions" element={<Suggestions />} />
                  <Route path="/explanations" element={<Explanations />} />
                  <Route path="/salaries" element={<Salaries />} />
                  <Route path="/accounting" element={<Accounting />} />
                  <Route path="/conflicts" element={<Conflicts />} />
                  <Route path="/missions/:type" element={<Missions />} />

                  {/* Commercial: Enregistrement Client */}
                  <Route element={<ProtectedRoute allowedRoles={['COMMERCIAL']} />}>
                    <Route path="/client-registration" element={<ClientRegistration />} />
                  </Route>

                  {/* Admin/HR: Vue Clients Commerciaux */}
                  <Route element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'HR_MANAGER', 'HR_ASSISTANT', 'RH']} />}>
                    <Route path="/client-registrations" element={<ClientRegistrationAdmin />} />
                  </Route>

                  {/* Module Évolution d'offre / Upgrade */}
                  <Route element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN']} />}>
                    <Route path="/upgrade-plan" element={<Upgrade />} />
                  </Route>

                  {/* Module Ventes (POS) */}
                  <Route element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'COMMERCIAL', 'VENDEUR']} allowedPermissions={['manage_products']} />}>
                    <Route path="/sales/products" element={<ProductsManager />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'COMMERCIAL', 'VENDEUR']} allowedPermissions={['use_pos']} />}>
                    <Route path="/sales/pos" element={<PointOfSale />} />
                  </Route>
                  <Route element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'COMMERCIAL', 'VENDEUR']} allowedPermissions={['view_sales']} />}>
                    <Route path="/sales/history" element={<SalesHistory />} />
                  </Route>

                  {/* Module Support Client */}
                  <Route element={<ProtectedRoute allowedRoles={['COMPANY_ADMIN', 'SUPER_ADMIN']} />}>
                    <Route path="/support" element={<Support />} />
                  </Route>
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
