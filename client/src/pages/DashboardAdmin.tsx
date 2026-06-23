import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Users, Layers, Calendar, Clock, FileText, Megaphone, TrendingUp, Building2, MessageSquare, Lock, Zap, Wallet, Shield } from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import api from '../utils/api';
import { usePlan } from '../hooks/usePlan';
import { supabase } from '../utils/supabase';
import SubscriptionCountdown from '../components/TrialCountdown';
import TrialExpiredOverlay from '../components/TrialExpiredOverlay';

const PLAN_BADGE: Record<string, { label: string; color: string }> = {
  FITINI: { label: 'FITINI',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  LOUBA:  { label: 'LOUBA',    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
  KORO:   { label: 'Kôrô',     color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
};

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

const DashboardAdmin = () => {
  const { company, user } = useAuth();
  const navigate = useNavigate();
  const { plan, canUse, maxEmployees } = usePlan();
  const [stats, setStats] = useState({ employees: 0, departments: 0 });

  const fetchStats = async () => {
    try {
      const [empRes, depRes] = await Promise.all([
        api.get('/employees'),
        api.get('/departments')
      ]);
      setStats({ employees: empRes.data.length, departments: depRes.data.length });
    } catch (error) {
      console.error("Erreur lors du chargement des statistiques", error);
    }
  };

  useEffect(() => {
    void fetchStats();

    if (!supabase || !user?.companyId) {
      console.warn("Supabase non initialisé ou companyId manquant. Le temps réel est désactivé.");
      return;
    }

    const channel = supabase
      .channel(`dashboard-stats-${user.companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'User', filter: `companyId=eq.${user.companyId}` }, () => void fetchStats())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Department', filter: `companyId=eq.${user.companyId}` }, () => void fetchStats())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.companyId]);

  const maxEmp = maxEmployees();
  const badge = PLAN_BADGE[plan] || PLAN_BADGE['FITINI'];

  const modules = [
    { name: 'Annuaire',      desc: 'Gérer les employés',           icon: Users,         path: '/employees',    color: 'bg-blue-500',   feature: 'employees',   stat: `${stats.employees}${maxEmp ? ' / ' + maxEmp : ' / Illimité'} employés` },
    { name: 'Départements',  desc: 'Structure de l\'entreprise',   icon: Layers,        path: '/departments',  color: 'bg-indigo-500', feature: 'departments', stat: `${stats.departments} départements` },
    { name: 'Rôles & Permissions', desc: 'Définir les accès',       icon: Shield,        path: '/roles',        color: 'bg-blue-500',   feature: 'roles' },
    { name: 'Pointage',      desc: 'Suivi du temps',               icon: Clock,         path: '/attendance',   color: 'bg-green-500',  feature: 'attendance' },
    { name: 'Congés',        desc: 'Demandes & Absences',          icon: Calendar,      path: '/leaves',       color: 'bg-yellow-500', feature: 'leaves' },
    { name: 'Tâches',        desc: 'Organisation quotidienne',    icon: Zap,           path: '/tasks',        color: 'bg-amber-500',  feature: 'tasks' },
    { name: 'Documents',     desc: 'Fiches de paie & Contrats',    icon: FileText,      path: '/documents',    color: 'bg-purple-500', feature: 'documents' },
    { name: 'Annonces',      desc: 'Communication interne',        icon: Megaphone,     path: '/announcements',color: 'bg-orange-500', feature: 'announcements' },
    { name: 'Messagerie',    desc: 'Chat d\'équipe',               icon: MessageSquare, path: '/messaging',    color: 'bg-teal-500',   feature: 'messaging',   locked: !canUse('messaging'), minPlan: 'LOUBA' },
    { name: 'Conflits',      desc: 'Espace sécurisé',              icon: Lock,          path: '/conflicts',    color: 'bg-rose-500',   feature: 'conflicts',   locked: !canUse('conflicts'), minPlan: 'LOUBA' },
    { name: 'Salaires',      desc: 'Gestion des paies',            icon: Wallet,        path: '/salaries',     color: 'bg-emerald-500', feature: 'salaries',    locked: !canUse('salaries'),  minPlan: 'LOUBA' },
    { name: 'Analytique RH', desc: 'Graphiques & Indicateurs',    icon: TrendingUp,    path: '/analytics',    color: 'bg-pink-500',   feature: 'analytics',   locked: !canUse('analytics'),  minPlan: 'LOUBA' },
  ];

  const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
  const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } };

  const isTrialExpired = company?.trialEndsAt && new Date() > new Date(company.trialEndsAt);
  const isTrialActive = company?.trialEndsAt && !isTrialExpired;
  const isSubscriptionActive = !isTrialActive && !isTrialExpired && company?.subscriptionEndsAt;

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {isTrialExpired && <TrialExpiredOverlay />}
      
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

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-orange-400/20 to-transparent rounded-bl-full pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
              Bienvenue, {user?.firstName} 👋
            </h1>
            <p className="text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> {company?.name || 'Bamousso'} • Espace Administrateur
            </p>
          </div>
          
          {/* Compteur de durée compact */}
          {(isTrialActive && company?.trialEndsAt) ? (
            <CompactCountdown endsAt={company.trialEndsAt} billingCycle="MONTHLY" />
          ) : (isSubscriptionActive && company?.subscriptionEndsAt) ? (
            <CompactCountdown endsAt={company.subscriptionEndsAt} billingCycle={(company as any).billingCycle} />
          ) : null}

          <div className="flex items-center gap-3">
            {/* Badge Plan */}
            <span className={`px-4 py-2 rounded-xl text-sm font-bold ${badge.color}`}>
              {badge.label}
            </span>
            {/* Compteur employés */}
            <span className={`px-4 py-2 rounded-xl text-sm font-bold ${maxEmp && stats.employees >= maxEmp ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
              {stats.employees} {maxEmp ? `/ ${maxEmp}` : '/ Illimité'} employés
            </span>
          </div>
        </div>
      </motion.div>

      {/* Grille de modules */}
      <motion.div variants={container} initial="hidden" animate="show"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {modules.map((mod, index) => {
          const isLocked = (mod as any).locked;
          const minPlan = (mod as any).minPlan;

          if (isLocked) {
            return (
              <motion.div key={index} variants={item}>
                <div 
                  className="relative group block bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border-2 border-dashed border-gray-200 dark:border-gray-700 transition-all hover:border-brand-primary/50 cursor-not-allowed opacity-80"
                  title="Mise à jour de l'abonnement momentanément indisponible."
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 rounded-2xl ${mod.color} opacity-40 flex items-center justify-center text-white shadow-lg`}>
                        <mod.icon className="w-7 h-7" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-500 dark:text-gray-500 flex items-center gap-2">
                          {mod.name} <Lock className="w-4 h-4 text-brand-primary" />
                        </h3>
                        <p className="text-sm text-gray-400 mt-1">{mod.desc}</p>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-between items-center">
                    <span className="inline-flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 px-3 py-1.5 rounded-xl text-xs font-bold">
                      <Zap className="w-3 h-3" /> Formule {minPlan}
                    </span>
                    <span className="text-brand-primary text-[10px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all">
                      Indisponible
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          }

          return (
            <motion.div key={index} variants={item}>
              <Link to={mod.path}
                className="group block bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-2 relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-32 h-32 ${mod.color} opacity-5 rounded-full -mr-10 -mt-10 transition-transform duration-500 group-hover:scale-150`} />
                <div className="flex items-start gap-4 relative z-10">
                  <div className={`w-14 h-14 rounded-2xl ${mod.color} flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                    <mod.icon className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-orange-500 transition-colors">{mod.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mod.desc}</p>
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-center relative z-10">
                  {(mod as any).stat ? (
                    <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-3 py-1 text-xs font-bold rounded-lg">
                      {(mod as any).stat}
                    </span>
                  ) : <span />}
                  <span className="text-orange-500 text-sm font-semibold opacity-0 -translate-x-4 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                    Ouvrir →
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};

export default DashboardAdmin;
