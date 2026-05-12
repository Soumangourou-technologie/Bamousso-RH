import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Calendar, Clock, FileText, Megaphone, UserCircle, Building2, Wallet, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';

const DashboardEmployee = () => {
  const { user, company } = useAuth();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  const baseModules = [
    { name: 'Mon Pointage', desc: 'Arrivée / Départ', icon: Clock, path: '/attendance', color: 'bg-green-500' },
    { name: 'Mes Congés', desc: 'Solde & Demandes', icon: Calendar, path: '/leaves', color: 'bg-yellow-500' },
    { name: 'Mon Coffre-fort', desc: 'Fiches de paie', icon: FileText, path: '/documents', color: 'bg-purple-500' },
    { name: 'Actualités', desc: 'Annonces entreprise', icon: Megaphone, path: '/announcements', color: 'bg-orange-500' },
  ];

  const roleSpecificModules = [
    { name: 'Comptabilité', desc: 'Suivi & Rapports', icon: Wallet, path: '/accounting', color: 'bg-blue-500', requiredPermission: 'view_accounting' },
    { name: 'CRM Commercial', desc: 'Clients & RDV', icon: Briefcase, path: '/crm', color: 'bg-rose-500', requiredPermission: 'manage_crm' },
  ];

  const visibleModules = [
    ...baseModules,
    ...roleSpecificModules.filter(m => (user?.permissions || []).includes(m.requiredPermission))
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header animé */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-green-400/20 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-green-400 to-green-600 text-white flex items-center justify-center shadow-lg shadow-green-500/30">
              <span className="text-2xl font-bold">{user?.firstName[0]}{user?.lastName[0]}</span>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 mb-1">
                Bonjour, {user?.firstName} 👋
              </h1>
              <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2 font-medium">
                <Building2 className="w-4 h-4" /> {company?.name || 'Bamousso'} • {user?.role === 'HR_MANAGER' ? 'RH' : 'Employé'}
              </p>
            </div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-6 py-3 rounded-2xl flex items-center gap-3 font-semibold shadow-inner">
            <UserCircle className="w-5 h-5" />
            Statut: Actif
          </div>
        </div>
      </motion.div>

      {/* Grille de modules */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        {visibleModules.map((mod, index) => (
          <motion.div key={index} variants={item}>
            <Link
              to={mod.path}
              className="group block bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden h-full"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-5 rounded-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-150`}></div>
              
              <div className="flex flex-col h-full relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${mod.color} flex items-center justify-center text-white shadow-lg shadow-${mod.color.replace('bg-', '')}/30 transition-transform group-hover:scale-110 group-hover:rotate-3 mb-6`}>
                  <mod.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-green-500 transition-colors">{mod.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{mod.desc}</p>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default DashboardEmployee;
