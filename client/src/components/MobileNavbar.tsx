import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Clock, Calendar, FileText, Menu } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface MobileNavbarProps {
  onMenuClick: () => void;
}

const MobileNavbar = ({ onMenuClick }: MobileNavbarProps) => {
  const location = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  const dashboardPath =
    user.role === 'SUPER_ADMIN'
      ? '/dashboard/super-admin'
      : user.role === 'COMPANY_ADMIN'
        ? '/dashboard/admin'
        : user.role === 'HR_MANAGER' || user.role === 'COMMERCIAL'
          ? '/dashboard/hr'
          : '/dashboard/employee';

  const navItems = [
    { icon: LayoutDashboard, label: 'Accueil', path: dashboardPath },
    { icon: Clock, label: 'Pointage', path: '/attendance' },
    { icon: Calendar, label: 'Congés', path: '/leaves' },
    { icon: FileText, label: 'Doc', path: '/documents' },
  ];

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 glass-card border-white/10 z-50 rounded-[2rem] overflow-hidden">
      <div className="flex items-center justify-around h-20 px-2">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path.startsWith('/dashboard') && location.pathname.startsWith('/dashboard'));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full gap-1.5 transition-all ${
                isActive ? 'text-brand-primary' : 'text-white/60'
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'fill-brand-primary/10' : ''}`} />
              <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
              {isActive && <div className="w-1 h-1 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(255,87,34,0.8)]" />}
            </Link>
          );
        })}
        <button
          onClick={onMenuClick}
          className="flex flex-col items-center justify-center flex-1 h-full gap-1.5 text-white bg-brand-primary/10 rounded-2xl mx-1"
        >
          <Menu className="w-6 h-6 text-brand-primary" />
          <span className="text-[10px] font-black uppercase tracking-widest">Menu</span>
        </button>
      </div>
    </div>
  );
};

export default MobileNavbar;
