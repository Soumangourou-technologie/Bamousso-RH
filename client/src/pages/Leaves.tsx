import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Calendar, CheckCircle, XCircle, Clock, Plus, Filter, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LeaveRequest {
  id: string;
  type: 'PAID' | 'UNPAID' | 'SICK' | 'MATERNITY';
  startDate: string;
  endDate: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason?: string;
  employee: {
    firstName: string;
    lastName: string;
  };
}

const LEAVE_TYPES = {
  PAID: { label: 'Congé Payé', color: 'bg-emerald-500', icon: Calendar },
  UNPAID: { label: 'Sans Solde', color: 'bg-gray-500', icon: Clock },
  SICK: { label: 'Maladie', color: 'bg-rose-500', icon: Info },
  MATERNITY: { label: 'Maternité', color: 'bg-purple-500', icon: Calendar },
};

const Leaves = () => {
  const { user } = useAuth();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [type, setType] = useState('PAID');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchLeaves = async () => {
    try {
      const res = await api.get<LeaveRequest[]>('/leaves');
      setLeaves(res.data);
    } catch (error) {
      console.error('Error fetching leaves', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchLeaves();
    window.addEventListener('app:refresh', fetchLeaves);
    return () => window.removeEventListener('app:refresh', fetchLeaves);
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/leaves', { type, startDate, endDate, reason });
      setIsRequesting(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      void fetchLeaves();
    } catch (error) {
      console.error('Error requesting leave', error);
      alert('Erreur lors de la demande de congé.');
    }
  };

  const handleReview = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await api.put(`/leaves/${id}/status`, { status });
      void fetchLeaves();
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  const canManage = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'HR_ASSISTANT' || user?.role === 'RH';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-10 h-10 border-4 border-brand-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Premium */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-end bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-xl border border-white/5 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-bl-full pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Calendar className="w-10 h-10 text-blue-500" /> Gestion des Congés
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-2">Suivez et validez les absences de votre équipe.</p>
        </div>
        {!canManage && (
          <button
            onClick={() => setIsRequesting(true)}
            className="bg-brand-primary text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nouvelle demande
          </button>
        )}
      </motion.div>

      <AnimatePresence>
        {isRequesting && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white dark:bg-gray-800 p-8 rounded-[2rem] shadow-2xl border border-brand-primary/20 relative">
               <button onClick={() => setIsRequesting(false)} className="absolute top-6 right-6 p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                  <XCircle className="w-6 h-6 text-gray-400" />
               </button>
              <h2 className="text-2xl font-black mb-8 text-gray-900 dark:text-white">Formuler une demande de congé</h2>
              <form onSubmit={handleRequest} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500">Type d'absence</label>
                    <select 
                      value={type} 
                      onChange={e => setType(e.target.value)} 
                      className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                    >
                      <option value="PAID">Congé Payé</option>
                      <option value="UNPAID">Congé Sans Solde</option>
                      <option value="SICK">Maladie</option>
                      <option value="MATERNITY">Maternité/Paternité</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500">Date de début</label>
                    <input 
                      type="date" 
                      required 
                      value={startDate} 
                      onChange={e => setStartDate(e.target.value)} 
                      className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary transition-all" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black uppercase tracking-widest text-gray-500">Date de fin</label>
                    <input 
                      type="date" 
                      required 
                      value={endDate} 
                      onChange={e => setEndDate(e.target.value)} 
                      className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary transition-all" 
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-black uppercase tracking-widest text-gray-500">Motif & Justification</label>
                  <textarea 
                    value={reason} 
                    onChange={e => setReason(e.target.value)} 
                    rows={3}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary transition-all" 
                    placeholder="Précisez la raison de votre absence..."
                  />
                </div>
                <div className="flex justify-end gap-4">
                  <button type="submit" className="bg-brand-primary text-white px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 transition-all">
                    Envoyer ma demande
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tableaux des demandes */}
      <div className="glass-card p-10 rounded-[2.5rem] border border-white/5 bg-white dark:bg-gray-800 shadow-xl overflow-hidden">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-2xl font-black text-gray-900 dark:text-white">Historique des demandes</h2>
          <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-900/50 p-2 rounded-xl">
            <Filter className="w-4 h-4 text-gray-500" />
            <span className="text-xs font-bold text-gray-500">Trier par date</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/5">
                <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Employé</th>
                <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Type</th>
                <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Période</th>
                <th className="pb-6 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Statut</th>
                <th className="pb-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-white/5">
              {leaves.map((leave, i) => {
                const leaveType = LEAVE_TYPES[leave.type] || LEAVE_TYPES.PAID;
                return (
                  <motion.tr 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: i * 0.05 }}
                    key={leave.id} 
                    className="group hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-8">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center font-black text-brand-primary shadow-sm group-hover:scale-110 transition-transform">
                          {leave.employee.firstName[0]}{leave.employee.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white">{leave.employee.firstName} {leave.employee.lastName}</p>
                          <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">{leave.reason || 'Aucun motif'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-8">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${leaveType.color}`} />
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">{leaveType.label}</span>
                      </div>
                    </td>
                    <td className="py-8">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-gray-900 dark:text-white">
                          {new Date(leave.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} - {new Date(leave.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">
                          {Math.ceil((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} jours
                        </span>
                      </div>
                    </td>
                    <td className="py-8">
                      <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm
                        ${leave.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' : 
                          leave.status === 'REJECTED' ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400' : 
                          'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                        {leave.status === 'PENDING' ? 'En attente' : leave.status === 'APPROVED' ? 'Approuvé' : 'Refusé'}
                      </span>
                    </td>
                    <td className="py-8 text-right">
                      {canManage && leave.status === 'PENDING' ? (
                        <div className="flex justify-end gap-3">
                          <button 
                            onClick={() => handleReview(leave.id, 'APPROVED')} 
                            className="w-10 h-10 flex items-center justify-center bg-emerald-500/10 text-emerald-600 rounded-xl hover:bg-emerald-500 hover:text-white transition-all shadow-sm"
                            title="Approuver"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button 
                            onClick={() => handleReview(leave.id, 'REJECTED')} 
                            className="w-10 h-10 flex items-center justify-center bg-rose-500/10 text-rose-600 rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                            title="Refuser"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex justify-end">
                           <div className="w-10 h-10 bg-gray-100 dark:bg-gray-900/40 rounded-xl flex items-center justify-center text-gray-400">
                             <Filter className="w-4 h-4 opacity-20" />
                           </div>
                        </div>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              {leaves.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-32 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-900/40 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                      </div>
                      <p className="text-gray-500 font-bold italic tracking-tight">Aucune demande de congé enregistrée.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaves;
