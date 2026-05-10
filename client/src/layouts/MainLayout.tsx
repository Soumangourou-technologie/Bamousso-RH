import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import MobileNavbar from '../components/MobileNavbar';
import NotificationCenter from '../components/NotificationCenter';

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-senufo transition-colors duration-200">
      {/* Sidebar - Pass props for control */}
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden md:ml-64 relative z-10">
        {/* Header - visible sur mobile et desktop pour les notifications */}
        <header className="glass-card border-none px-6 sticky top-0 z-30 flex items-center justify-between h-20 shrink-0 mx-4 mt-4 rounded-3xl">
          <div className="flex items-center gap-4">
            <div className="md:hidden flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 bg-brand-primary/10 rounded-xl text-brand-primary"
              >
                <Menu className="w-6 h-6" />
              </button>
              <span className="font-black text-2xl tracking-tighter text-brand-primary">BAMOUSSO</span>
            </div>
            <span className="font-black text-xl text-white hidden md:inline-block tracking-tight">Tableau de Bord</span>
          </div>

          <div className="flex items-center gap-4">
            <NotificationCenter />
          </div>
        </header>

        {/* Zone de contenu principal - scrollable */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 min-w-0 pb-24 md:pb-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Navigation mobile en bas */}
        <MobileNavbar onMenuClick={() => setIsSidebarOpen(true)} />
      </div>
    </div>
  );
};

export default MainLayout;
