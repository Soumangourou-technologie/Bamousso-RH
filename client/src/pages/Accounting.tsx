import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, FileText, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const Accounting = () => {
  const { user } = useAuth();
  
  // Seuls certains rôles peuvent accéder à la comptabilité
  const canViewAccounting = ['COMPANY_ADMIN', 'HR_MANAGER', 'COMPTABLE', 'SUPER_ADMIN'].includes(user?.role || '');

  if (!canViewAccounting) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Comptabilité</h1>
          <p className="text-gray-400 font-medium mt-1">Suivi financier et rapports (En cours de développement)</p>
        </div>
        <button className="bg-brand-primary text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-primary/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all">
          <FileText className="w-4 h-4" />
          Nouveau Rapport
        </button>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8 rounded-4xl border border-white/5 bg-linear-to-br from-green-600/10 to-green-900/10">
          <TrendingUp className="w-8 h-8 text-green-500 mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Entrées (Mois)</p>
          <p className="text-3xl font-black text-white tracking-tighter">0 FCFA</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-8 rounded-4xl border border-white/5 bg-linear-to-br from-red-600/10 to-red-900/10">
          <TrendingDown className="w-8 h-8 text-red-500 mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Dépenses (Mois)</p>
          <p className="text-3xl font-black text-white tracking-tighter">0 FCFA</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-8 rounded-4xl border border-white/5">
          <Wallet className="w-8 h-8 text-brand-accent mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Solde actuel</p>
          <p className="text-xl font-black text-white tracking-tighter mt-2">0 FCFA</p>
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card p-10 rounded-[2.5rem] border border-white/5 text-center py-20">
        <Activity className="w-16 h-16 text-gray-700 mx-auto mb-6" />
        <h2 className="text-2xl font-black text-white mb-2">Module en construction</h2>
        <p className="text-gray-400">L'historique détaillé des transactions et les outils de comptabilité avancés seront bientôt disponibles ici.</p>
      </motion.div>
    </div>
  );
};

export default Accounting;
