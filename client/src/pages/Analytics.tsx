import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Users, Calendar, Clock, AlertTriangle } from 'lucide-react';
import api from '../utils/api';
import LockedFeature from '../components/LockedFeature';
import { usePlan } from '../hooks/usePlan';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

interface Summary {
  totalEmployees: number;
  activeEmployees: number;
  absenteeismRate: number;
  totalAttendances: number;
  absentDays: number;
  pendingLeaves: number;
  approvedLeaves: number;
}

const Analytics = () => {
  const { canUse, requiredPlanFor } = usePlan();
  const { user } = useAuth();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [leavesData, setLeavesData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [workforceData, setWorkforceData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = async () => {
    try {
      const [s, l, a, w] = await Promise.all([
        api.get('/analytics/summary'),
        api.get('/analytics/leaves-per-month'),
        api.get('/analytics/attendance-trend'),
        api.get('/analytics/workforce-evolution'),
      ]);
      setSummary(s.data);
      setLeavesData(l.data);
      setAttendanceData(a.data);
      setWorkforceData(w.data);
    } catch (e) {
      console.error('Erreur analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!canUse('analytics')) { setLoading(false); return; }

    const refreshData = () => void fetchAll();
    refreshData();
    window.addEventListener('app:refresh', refreshData);

    // Real-time subscription pour mettre à jour les graphiques
    if (!supabase || !user?.companyId) {
      return () => window.removeEventListener('app:refresh', refreshData);
    }

    const channel = supabase
      .channel(`analytics-realtime-${user.companyId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'User', filter: `companyId=eq.${user.companyId}` }, () => void fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'Attendance' }, () => void fetchAll())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'LeaveRequest' }, () => void fetchAll())
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
      window.removeEventListener('app:refresh', refreshData);
    };
  }, [canUse, user?.companyId]);

  if (!canUse('analytics')) {
    return <LockedFeature featureName="Analytique RH" requiredPlan={requiredPlanFor('analytics')} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const statCards = [
    { label: 'Total Employés', value: summary?.totalEmployees ?? 0, icon: Users, color: 'bg-blue-500', sub: `${summary?.activeEmployees ?? 0} actifs` },
    { label: 'Taux d\'absentéisme', value: `${summary?.absenteeismRate ?? 0}%`, icon: AlertTriangle, color: 'bg-red-500', sub: `${summary?.absentDays ?? 0} jours ce mois` },
    { label: 'Congés en attente', value: summary?.pendingLeaves ?? 0, icon: Calendar, color: 'bg-orange-500', sub: `${summary?.approvedLeaves ?? 0} approuvés ce mois` },
    { label: 'Présences ce mois', value: summary?.totalAttendances ?? 0, icon: Clock, color: 'bg-green-500', sub: 'pointages enregistrés' },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-400/20 to-transparent rounded-bl-full pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-orange-500" /> Analytique RH
          </h1>
          <p className="text-gray-500 dark:text-gray-400">Vue d'ensemble de votre capital humain</p>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
              <card.icon className="w-6 h-6 text-white" />
            </div>
            <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{card.value}</p>
            <p className="text-sm font-semibold text-gray-600 dark:text-gray-400 mt-1">{card.label}</p>
            <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Congés par mois */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Congés par Mois (12 derniers mois)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={leavesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Congés" fill="#f97316" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Présences vs Absences */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Présences vs Absences (4 semaines)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={attendanceData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="present" name="Présents" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="absent" name="Absents" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Évolution des effectifs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 lg:col-span-2">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Évolution des Effectifs (6 mois)</h3>
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={workforceData}>
              <defs>
                <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area type="monotone" dataKey="total" name="Employés" stroke="#f97316" strokeWidth={3} fill="url(#colorTotal)" />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

      </div>
    </div>
  );
};

export default Analytics;
