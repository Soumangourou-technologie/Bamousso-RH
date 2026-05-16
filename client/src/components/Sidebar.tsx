import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  Building2, LayoutDashboard, LogOut, Moon, Sun, Users, Layers, X, 
  Calendar, Clock, FileText, Megaphone, Settings as SettingsIcon,
  ListTodo, Banknote, MessageCircle, MessageSquare, FileWarning, BarChart3, Shield, UserPlus, LifeBuoy
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ConfirmationModal from './ConfirmationModal';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const SidebarBadge = ({ count }: { count: number }) => {
  if (count <= 0) return null;
  return (
    <motion.span 
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      className="ml-auto bg-brand-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-brand-primary/20"
    >
      {count > 9 ? '9+' : count}
    </motion.span>
  );
};

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const { user, company, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { badgeCounts, markTypeAsRead } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const formatRole = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Administrateur';
      case 'COMPANY_ADMIN': return 'Admin entreprise';
      case 'HR_MANAGER': return 'RH Manager';
      case 'HR_ASSISTANT': return 'Assistant RH';
      case 'COMMERCIAL': return 'Commercial';
      case 'EMPLOYEE': return 'Employé';
      default: return role;
    }
  };

  useEffect(() => {
    onClose();
  }, [location.pathname]);

  // Nettoyer les badges quand on visite la page correspondante
  useEffect(() => {
    if (location.pathname === '/suggestions') markTypeAsRead('SUGGESTION');
    if (location.pathname === '/explanations') markTypeAsRead('EXPLANATION');
    if (location.pathname === '/documents') markTypeAsRead('DOCUMENT');
    if (location.pathname === '/announcements') markTypeAsRead('ANNOUNCEMENT');
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  const dashboardPath =
    user.role === 'SUPER_ADMIN'
      ? '/dashboard/super-admin'
      : user.role === 'COMPANY_ADMIN'
        ? '/dashboard/admin'
        : user.role === 'HR_MANAGER' || user.role === 'HR_ASSISTANT'
          ? '/dashboard/hr'
          : '/dashboard/employee';

  const canManageHr =
    user.role === 'COMPANY_ADMIN' || user.role === 'HR_MANAGER' || user.role === 'HR_ASSISTANT';

  const isCommercial = user.role === 'COMMERCIAL';

  const isSuperAdmin = user.role === 'SUPER_ADMIN';
  const plan = company?.plan || 'FITINI';

  return (
    <>
      {/* Overlay pour mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      {/* Sidebar principale */}
      <div className={`
        w-64 bg-[#1a0f0a] text-white h-screen fixed left-0 top-0 flex flex-col z-50 transition-all duration-300 ease-in-out border-r border-white/5 shadow-2xl
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-6 border-b border-white/5 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black flex items-center gap-2 tracking-tighter">
              {company?.logoUrl && !isSuperAdmin ? (
                <img src={company.logoUrl} alt="Logo Entreprise" className="w-9 h-9 object-contain rounded-xl" />
              ) : (
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
              )}
              <span className="text-white">
                {!isSuperAdmin && company?.name ? company.name : 'BAMOUSSO'}
              </span>
            </h1>
            <button onClick={onClose} className="lg:hidden p-2 hover:bg-white/10 rounded-full">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] mt-2 opacity-80">{formatRole(user.role)}</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
          <Link to={dashboardPath} className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname.startsWith('/dashboard') ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
            <LayoutDashboard className="w-5 h-5" />
            Tableau de bord
          </Link>

          {(isSuperAdmin || user.role === 'COMPANY_ADMIN') && (
            <Link to="/support" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/support' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
              <LifeBuoy className="w-5 h-5" />
              Support Client
            </Link>
          )}

          {isSuperAdmin && (
            <Link to="/messaging" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/messaging' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
              <MessageSquare className="w-5 h-5" />
              Messagerie Interne
            </Link>
          )}

          {!isSuperAdmin && canManageHr && (
            <>
              <Link to="/employees" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/employees' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                <Users className="w-5 h-5" />
                Employés
              </Link>
              <Link to="/departments" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/departments' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                <Layers className="w-5 h-5" />
                Départements
              </Link>
            </>
          )}

          {!isSuperAdmin && (
            <>
              <Link to="/attendance" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/attendance' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                <Clock className="w-5 h-5" />
                Pointage
              </Link>

              <Link to="/leaves" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/leaves' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                <Calendar className="w-5 h-5" />
                Congés
              </Link>

              <Link to="/tasks" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/tasks' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                <ListTodo className="w-5 h-5" />
                Tâches
              </Link>

              {(plan === 'LOUBA' || plan === 'KORO') && (
                <>
                  <Link to="/messaging" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/messaging' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                    <MessageCircle className="w-5 h-5" />
                    Messagerie
                  </Link>

                  <Link to="/explanations" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/explanations' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                    <FileWarning className="w-5 h-5" />
                    Explications
                    <SidebarBadge count={badgeCounts.explanations} />
                  </Link>
                </>
              )}

              <Link to="/suggestions" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/suggestions' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                <MessageSquare className="w-5 h-5" />
                Suggestions
                <SidebarBadge count={badgeCounts.suggestions} />
              </Link>

              {(plan === 'LOUBA' || plan === 'KORO') && (
                <>
                  {canManageHr && (
                    <Link to="/salaries" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/salaries' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                      <Banknote className="w-5 h-5" />
                      Salaires
                    </Link>
                  )}

                  {canManageHr && (
                    <Link to="/analytics" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/analytics' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                      <BarChart3 className="w-5 h-5" />
                      Analytique
                    </Link>
                  )}
                </>
              )}

              <Link to="/documents" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/documents' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
                <FileText className="w-5 h-5" />
                Documents
                <SidebarBadge count={badgeCounts.documents} />
              </Link>

              <Link
                to="/announcements"
                className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/announcements' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
              >
                <Megaphone className="w-5 h-5" />
                Annonces
                <SidebarBadge count={badgeCounts.announcements} />
              </Link>
            </>
          )}

          {/* Commercial: Enregistrement Client */}
          {!isSuperAdmin && isCommercial && (
            <Link to="/client-registration" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/client-registration' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
              <UserPlus className="w-5 h-5" />
              Enregistrement Client
            </Link>
          )}

          {/* Admin/HR: Vue Clients Commerciaux */}
          {!isSuperAdmin && canManageHr && (
            <Link to="/client-registrations" className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/client-registrations' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}>
              <UserPlus className="w-5 h-5" />
              Clients Commerciaux
            </Link>
          )}

          {canManageHr ? (
            <>
              <Link
                to="/settings"
                className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/settings' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
              >
                <SettingsIcon className="w-5 h-5" />
                Paramètres
              </Link>
              {user.role === 'COMPANY_ADMIN' && (
                <Link
                  to="/roles"
                  className={`flex items-center gap-3 p-3.5 rounded-2xl transition-all duration-300 font-bold text-sm ${location.pathname === '/roles' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20 scale-[1.02]' : 'hover:bg-white/5 text-gray-400 hover:text-white'}`}
                >
                  <Shield className="w-5 h-5" />
                  Rôles & Permissions
                </Link>
              )}
            </>
          ) : null}
        </nav>

        <div className="p-4 border-t border-white/5 space-y-4">
          <button
              onClick={toggleTheme}
              className="w-full flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all duration-300 text-sm font-bold"
          >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              {theme === 'light' ? 'Mode Nuit' : 'Mode Jour'}
          </button>

          <div className="flex items-center gap-3 p-3 glass-card rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white shrink-0 shadow-lg">
                  <span className="font-black text-lg">{user.firstName[0]}{user.lastName[0]}</span>
              </div>
              <div className="min-w-0">
                  <p className="font-bold text-sm text-white truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-[10px] text-gray-400 truncate uppercase tracking-wider font-bold">{user.email}</p>
              </div>
          </div>

          <button
            onClick={() => setIsLogoutModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-2xl transition-all duration-300 text-sm font-black"
          >
            <LogOut className="w-4 h-4" />
            Se déconnecter
          </button>
        </div>

        <ConfirmationModal
          isOpen={isLogoutModalOpen}
          onClose={() => setIsLogoutModalOpen(false)}
          onConfirm={handleLogout}
          title="Confirmer la déconnexion"
          message="Êtes-vous sûr de vouloir vous déconnecter ?"
          confirmText="Se déconnecter"
          cancelText="Annuler"
          variant="danger"
        />
      </div>
    </>
  );
};

export default Sidebar;

