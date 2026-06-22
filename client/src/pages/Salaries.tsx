import { motion } from 'framer-motion';
import { Banknote, Download, Wallet, CheckCircle, FileText, Calendar, Play, Trash2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface Payslip {
  id: string;
  periodStart: string;
  periodEnd: string;
  paymentMethod: string;
  baseSalary: number;
  daysWorked: number;
  hoursWorked: number;
  overtimeHours: number;
  paidLeaveDays: number;
  unpaidLeaveDays: number;
  overtimeAmount: number;
  bonusAmount: number;
  deductionAmount: number;
  netSalary: number;
  status: string;
  employee: {
    firstName: string;
    lastName: string;
    jobTitle: string | null;
  };
  createdAt: string;
}

const Salaries = () => {
  const { user } = useAuth();
  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [targetMonth, setTargetMonth] = useState(String(new Date().getMonth() + 1).padStart(2, '0'));
  const [targetYear, setTargetYear] = useState(String(new Date().getFullYear()));

  const canManageHr = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'HR_ASSISTANT';

  const fetchPayslips = async () => {
    try {
      const res = await api.get('/salaries/payslips');
      setPayslips(res.data);
    } catch (error) {
      console.error('Error fetching payslips', error);
    }
  };

  useEffect(() => {
    if (canManageHr) {
      void fetchPayslips();
    }
  }, [canManageHr]);

  if (!canManageHr) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleGeneratePay = async () => {
    if (!window.confirm(`Voulez-vous générer les fiches de paie pour ${targetMonth}/${targetYear} ?`)) return;
    setIsLoading(true);
    try {
      const res = await api.post('/salaries/generate', { 
        month: parseInt(targetMonth, 10), 
        year: parseInt(targetYear, 10) 
      });
      alert(res.data.message);
      void fetchPayslips();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la génération');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportPdf = async (id: string) => {
    try {
      const res = await api.get(`/salaries/payslips/${id}/pdf`);
      if (res.data.pdfUrl) {
        window.open(res.data.pdfUrl, '_blank');
      }
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'exportation PDF");
    }
  };

  const handleDeletePayslip = async (id: string) => {
    if (!window.confirm("Voulez-vous vraiment supprimer cette fiche de paie ?")) return;
    try {
      await api.delete(`/salaries/payslips/${id}`);
      void fetchPayslips();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la suppression");
    }
  };

  const totalMasse = payslips.reduce((acc, curr) => acc + curr.netSalary, 0);

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Tableau de bord Paie</h1>
          <p className="text-gray-400 font-medium mt-1">Automatisation et suivi des rémunérations</p>
        </div>
        <div className="flex items-center gap-4 bg-white/5 p-2 rounded-2xl border border-white/10">
          <select 
            value={targetMonth} 
            onChange={e => setTargetMonth(e.target.value)}
            className="bg-transparent text-white font-bold outline-none cursor-pointer p-2"
          >
            {Array.from({length: 12}, (_, i) => {
              const m = String(i + 1).padStart(2, '0');
              return <option key={m} value={m} className="bg-gray-800">Mois {m}</option>
            })}
          </select>
          <select 
            value={targetYear} 
            onChange={e => setTargetYear(e.target.value)}
            className="bg-transparent text-white font-bold outline-none cursor-pointer p-2 border-l border-white/10"
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y} className="bg-gray-800">{y}</option>
            ))}
          </select>
          <button 
            disabled={isLoading}
            onClick={handleGeneratePay}
            className="bg-brand-primary text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-primary/20 flex items-center gap-2 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
          >
            {isLoading ? <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> : <Play className="w-4 h-4 fill-current" />}
            Lancer le calcul
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-8 rounded-4xl border border-white/5 bg-linear-to-br from-emerald-600/10 to-emerald-900/10">
          <Wallet className="w-8 h-8 text-emerald-500 mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Masse Salariale Générée</p>
          <p className="text-3xl font-black text-white tracking-tighter">{totalMasse.toLocaleString()} FCFA</p>
        </div>
        <div className="glass-card p-8 rounded-4xl border border-white/5 bg-linear-to-br from-blue-600/10 to-blue-900/10">
          <FileText className="w-8 h-8 text-blue-500 mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Fiches de paie</p>
          <p className="text-3xl font-black text-white tracking-tighter">{payslips.length}</p>
        </div>
        <div className="glass-card p-8 rounded-4xl border border-white/5">
          <Calendar className="w-8 h-8 text-brand-accent mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Dernière génération</p>
          <p className="text-xl font-black text-white tracking-tighter mt-2">
            {payslips.length > 0 ? new Date(payslips[0].createdAt).toLocaleDateString('fr-FR') : '--'}
          </p>
        </div>
      </div>

      <div className="glass-card p-10 rounded-[2.5rem] border border-white/5">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-black text-white">Historique des Paies</h2>
          <button className="px-4 py-2 bg-white/5 rounded-xl text-sm font-bold text-gray-300 hover:text-white transition-all flex items-center gap-2">
            <Download className="w-4 h-4" /> Exporter tout (PDF)
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Période</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Employé</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Mode</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Tps Travaillé</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Congés (P/NP)</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Net à payer</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-center">Statut</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {payslips.map(ps => (
                <tr key={ps.id} className="group hover:bg-white/2 transition-colors">
                  <td className="py-6">
                    <span className="text-white font-bold">{new Date(ps.periodStart).toLocaleDateString('fr-FR', {month: 'short', year: 'numeric'})}</span>
                  </td>
                  <td className="py-6">
                    <div className="flex flex-col">
                      <span className="text-white font-bold">{ps.employee.firstName} {ps.employee.lastName}</span>
                      <span className="text-xs text-gray-500">{ps.employee.jobTitle || 'Employé'}</span>
                    </div>
                  </td>
                  <td className="py-6">
                    <span className="bg-brand-primary/10 text-brand-primary px-2 py-1 rounded text-[10px] font-black">{ps.paymentMethod}</span>
                  </td>
                  <td className="py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-gray-300 font-mono text-sm">{ps.daysWorked} j</span>
                      <span className="text-[10px] text-gray-500 font-bold">{ps.hoursWorked.toFixed(1)} h</span>
                    </div>
                  </td>
                  <td className="py-6 text-right">
                    <span className="text-gray-400 font-mono text-sm">{ps.paidLeaveDays} / {ps.unpaidLeaveDays}</span>
                  </td>
                  <td className="py-6 text-right">
                    <div className="flex flex-col items-end">
                      <span className="text-emerald-400 font-black text-lg">{ps.netSalary.toLocaleString()}</span>
                      {(ps.bonusAmount > 0 || ps.deductionAmount > 0 || ps.overtimeAmount > 0) && (
                        <span className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">Primes/HS Incluses</span>
                      )}
                    </div>
                  </td>
                  <td className="py-6 text-center">
                    <span className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <CheckCircle className="w-3 h-3" /> {ps.status}
                    </span>
                  </td>
                  <td className="py-6 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleExportPdf(ps.id)} className="p-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors" title="Télécharger PDF">
                        <Download className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeletePayslip(ps.id)} className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors" title="Supprimer">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {payslips.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Banknote className="w-12 h-12 text-gray-800" />
                      <p className="text-gray-600 font-bold">Aucune fiche de paie générée.</p>
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

export default Salaries;
