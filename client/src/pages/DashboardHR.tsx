import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Layers, Calendar, Clock, FileText, Megaphone, TrendingUp, Briefcase, Wallet, Package, ShoppingCart, History } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import SubscriptionCountdown from '../components/TrialCountdown';

const CompactCountdown = ({ endsAt, billingCycle }: { endsAt: string, billingCycle?: string }) => {
  const [text, setText] = useState('');
  const [progress, setProgress] = useState(0);
  const [startDateStr, setStartDateStr] = useState('');
  const [endDateStr, setEndDateStr] = useState('');

  useEffect(() => {
    const end = new Date(endsAt);
    const start = new Date(endsAt);
    if (billingCycle === 'YEARLY') {
      start.setFullYear(start.getFullYear() - 1);
    } else {
      start.setMonth(start.getMonth() - 1);
    }

    setStartDateStr(start.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }));
    setEndDateStr(end.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }));

    const update = () => {
      const now = new Date();
      const diff = +end - +now;
      
      const totalDuration = +end - +start;
      const elapsed = +now - +start;
      let percent = (elapsed / totalDuration) * 100;
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
      setProgress(percent);

      if (diff <= 0) {
        setText('Expiré');
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      
      if (days > 0) {
        setText(`${days} jours restants`);
      } else {
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        setText(`${hours} heures restantes`);
      }
    };

    update();
    const itv = setInterval(update, 60000);
    return () => clearInterval(itv);
  }, [endsAt, billingCycle]);

  if (!text) return null;

  return (
    <div className="flex flex-col gap-1.5 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-2xl px-5 py-3 w-72 shadow-sm">
      <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
        <span>Début : {startDateStr}</span>
        <span>Fin : {endDateStr}</span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-1 overflow-hidden relative">
        <div 
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${progress > 90 ? 'bg-red-500' : progress > 75 ? 'bg-orange-500' : 'bg-brand-primary'}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1">
        <span className="text-[10px] font-black text-gray-800 dark:text-gray-200 uppercase tracking-widest">{billingCycle === 'YEARLY' ? 'Annuel' : 'Mensuel'}</span>
        <span className={`text-[11px] font-black tracking-tight ${progress > 90 ? 'text-red-500' : progress > 75 ? 'text-orange-500' : 'text-brand-primary'}`}>
          {text}
        </span>
      </div>
    </div>
  );
};

const DashboardHR = () => {
  const { company, user } = useAuth();
  const navigate = useNavigate();

  const isTrialExpired = company?.trialEndsAt && new Date() > new Date(company.trialEndsAt);
  const isTrialActive = company?.trialEndsAt && !isTrialExpired;
  const isSubscriptionActive = !isTrialActive && !isTrialExpired && company?.subscriptionEndsAt;

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
    { name: 'Annuaire', desc: 'Gestion des talents', icon: Users, path: '/employees', color: 'bg-blue-500' },
    { name: 'Organisation', desc: 'Départements', icon: Layers, path: '/departments', color: 'bg-indigo-500' },
    { name: 'Temps & Présences', desc: 'Validation des pointages', icon: Clock, path: '/attendance', color: 'bg-green-500' },
    { name: 'Absences', desc: 'Validation des congés', icon: Calendar, path: '/leaves', color: 'bg-yellow-500' },
    { name: 'Coffre-fort RH', desc: 'Partage de documents', icon: FileText, path: '/documents', color: 'bg-purple-500' },
    { name: 'Communication', desc: 'Publier une annonce', icon: Megaphone, path: '/announcements', color: 'bg-orange-500' },
  ];

  const roleSpecificModules = [
    { name: 'Comptabilité', desc: 'Suivi & Rapports', icon: Wallet, path: '/accounting', color: 'bg-blue-500', requiredPermission: 'view_accounting' },
    { name: 'CRM Commercial', desc: 'Clients & RDV', icon: Briefcase, path: '/crm', color: 'bg-rose-500', requiredPermission: 'manage_crm' },
    { name: 'Catalogue',     desc: 'Gestion des produits', icon: Package, path: '/sales/products', color: 'bg-indigo-500', requiredPermission: 'manage_products' },
    { name: 'Caisse (POS)',  desc: 'Point de vente',       icon: ShoppingCart, path: '/sales/pos', color: 'bg-green-600', requiredPermission: 'use_pos' },
    { name: 'Ventes',        desc: 'Historique & Factures',icon: History, path: '/sales/history', color: 'bg-blue-600', requiredPermission: 'view_sales' },
  ];

  const visibleModules = [
    ...baseModules,
    ...roleSpecificModules.filter(m => (user?.permissions || []).includes(m.requiredPermission))
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {isTrialActive && company?.trialEndsAt && (
        <SubscriptionCountdown 
          endsAt={company.trialEndsAt} 
          title="Accès Privilège Actif"
          buttonText="Passer premium"
          onButtonClick={() => navigate('/upgrade-plan', { state: { selectedPlanId: 'KORO' } })}
        />
      )}

      {isSubscriptionActive && company?.subscriptionEndsAt && (
        <SubscriptionCountdown 
          endsAt={company.subscriptionEndsAt} 
          title="Abonnement Actif"
          buttonText="Mettre à jour / Changer de formule"
          onButtonClick={() => navigate('/upgrade-plan', { state: { selectedPlanId: company.plan } })}
        />
      )}

      {/* Header animé */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-blue-400/20 to-transparent rounded-bl-full pointer-events-none"></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
              Espace RH • {user?.firstName} 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Briefcase className="w-4 h-4" /> {company?.name || 'Bamousso'} • Pôle Ressources Humaines
            </p>
          </div>
          
          {/* Compteur de durée compact */}
          {(isTrialActive && company?.trialEndsAt) ? (
            <CompactCountdown endsAt={company.trialEndsAt} billingCycle="MONTHLY" />
          ) : (isSubscriptionActive && company?.subscriptionEndsAt) ? (
            <CompactCountdown endsAt={company.subscriptionEndsAt} billingCycle={(company as any).billingCycle} />
          ) : null}

          <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-6 py-3 rounded-2xl hidden md:flex items-center gap-3 font-semibold shadow-inner">
            <TrendingUp className="w-5 h-5" />
            Vue d'ensemble RH
          </div>
        </div>
      </motion.div>

      {/* Grille de modules */}
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {visibleModules.map((mod, index) => (
          <motion.div key={index} variants={item}>
            <Link
              to={mod.path}
              className="group block bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden"
            >
              <div className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-5 rounded-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-150`}></div>
              
              <div className="flex items-start gap-4 relative z-10">
                <div className={`w-14 h-14 rounded-2xl ${mod.color} flex items-center justify-center text-white shadow-lg shadow-${mod.color.replace('bg-', '')}/30 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                  <mod.icon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-500 transition-colors">{mod.name}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mod.desc}</p>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end relative z-10">
                <div className="text-blue-500 text-sm font-semibold opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                  Accéder &rarr;
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default DashboardHR;
