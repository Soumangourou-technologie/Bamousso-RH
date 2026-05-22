import { motion } from 'framer-motion';
import { Banknote, TrendingUp, Download, Wallet, History, Edit2, Check, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface SalaryEmployee {
  id: string;
  firstName: string;
  lastName: string;
  baseSalary: number | null;
  salaryCurrency: string;
  bankDetails: string | null;
  jobTitle: string | null;
}

import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

const CURRENCIES = [
  { code: 'XOF', label: 'FCFA' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'USD', label: 'Dollar ($)' },
  { code: 'GNF', label: 'FG (Guinée)' },
];

const Salaries = () => {
  const { user } = useAuth();
  const [employees, setEmployees] = useState<SalaryEmployee[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newSalary, setNewSalary] = useState<number>(0);
  const [newCurrency, setNewCurrency] = useState<string>('XOF');
  const [isLoading, setIsLoading] = useState(false);

  const canManageHr = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'HR_ASSISTANT';

  const fetchSalaries = async () => {
    try {
      const res = await api.get('/salaries');
      setEmployees(res.data);
    } catch (error) {
      console.error('Error fetching salaries', error);
    }
  };

  useEffect(() => {
    if (canManageHr) {
      void fetchSalaries();
    }
  }, [canManageHr]);

  if (!canManageHr) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleUpdateSalary = async (id: string) => {
    try {
      await api.put(`/employees/${id}`, { 
        baseSalary: newSalary,
        salaryCurrency: newCurrency 
      });
      setEditingId(null);
      void fetchSalaries();
    } catch (error) {
      console.error('Error updating salary', error);
      alert('Erreur lors de la mise à jour du salaire.');
    }
  };

  const handleGeneratePay = async () => {
    if (!window.confirm('Voulez-vous générer les fiches de paie pour tous les employés pour le mois en cours ?')) return;
    setIsLoading(true);
    try {
      const now = new Date();
      const res = await api.post('/salaries/generate', { 
        month: String(now.getMonth() + 1).padStart(2, '0'), 
        year: String(now.getFullYear()) 
      });
      alert(res.data.message);
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la génération');
    } finally {
      setIsLoading(false);
    }
  };

  const totalMasse = employees.reduce((acc, curr) => acc + (curr.baseSalary || 0), 0);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text('Rapport des Salaires', 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Masse Salariale Totale : ${totalMasse.toLocaleString()} FCFA`, 14, 32);
    
    const tableData = employees.map(emp => [
      `${emp.firstName} ${emp.lastName}`,
      emp.jobTitle || 'Non défini',
      (emp.baseSalary || 0).toLocaleString(),
      emp.salaryCurrency,
      emp.bankDetails || '--'
    ]);

    autoTable(doc, {
      startY: 40,
      head: [['Employé', 'Poste', 'Salaire de base', 'Devise', 'Infos Bancaires']],
      body: tableData,
    });
    
    doc.save('rapport_salaires.pdf');
  };

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Gestion des Salaires</h1>
          <p className="text-gray-400 font-medium mt-1">Suivi des rémunérations et fiches de paie.</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={exportToPDF}
            className="glass-card px-6 py-3 rounded-xl font-bold text-sm text-white flex items-center gap-2 hover:border-brand-primary/50 transition-all"
          >
            <Download className="w-4 h-4" /> Rapport global
          </button>
          <button 
            disabled={isLoading}
            onClick={handleGeneratePay}
            className="bg-brand-primary text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-primary/20 flex items-center gap-2"
          >
            {isLoading ? 'Génération...' : 'Générer la paie'}
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-8 rounded-[2rem] border border-white/5 bg-gradient-to-br from-emerald-600/10 to-emerald-900/10">
          <Wallet className="w-8 h-8 text-emerald-500 mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Masse Salariale Totale / Mois (FCFA)</p>
          <p className="text-3xl font-black text-white tracking-tighter">{totalMasse.toLocaleString()} FCFA</p>
        </div>
        <div className="glass-card p-8 rounded-[2rem] border border-white/5">
          <TrendingUp className="w-8 h-8 text-brand-primary mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Employés Rémunérés</p>
          <p className="text-3xl font-black text-white tracking-tighter">{employees.filter(e => (e.baseSalary || 0) > 0).length}</p>
        </div>
        <div className="glass-card p-8 rounded-[2rem] border border-white/5">
          <History className="w-8 h-8 text-brand-accent mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Prochain Virement</p>
          <p className="text-3xl font-black text-white tracking-tighter">Fin de mois</p>
        </div>
      </div>

      <div className="glass-card p-10 rounded-[2.5rem] border border-white/5">
        <h2 className="text-2xl font-black text-white mb-8">Employés & Rémunérations</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5">
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Employé</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Poste</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Salaire de base</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Devise</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Infos Bancaires</th>
                <th className="pb-6 text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {employees.map(emp => (
                <tr key={emp.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-brand-primary">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <span className="text-white font-bold">{emp.firstName} {emp.lastName}</span>
                    </div>
                  </td>
                  <td className="py-6 text-gray-400 font-medium">{emp.jobTitle || 'Non défini'}</td>
                  <td className="py-6">
                    {editingId === emp.id ? (
                      <input 
                        type="number" 
                        value={newSalary} 
                        onChange={e => setNewSalary(Number(e.target.value))}
                        className="bg-white/5 border border-brand-primary/50 p-2 rounded-lg text-white font-bold w-32 outline-none"
                      />
                    ) : (
                      <span className="text-white font-black">{(emp.baseSalary || 0).toLocaleString()}</span>
                    )}
                  </td>
                  <td className="py-6">
                    {editingId === emp.id ? (
                      <select 
                        value={newCurrency} 
                        onChange={e => setNewCurrency(e.target.value)}
                        className="bg-white/5 border border-white/10 p-2 rounded-lg text-white font-bold outline-none"
                      >
                        {CURRENCIES.map(c => <option key={c.code} value={c.code} className="bg-brand-900">{c.label}</option>)}
                      </select>
                    ) : (
                      <span className="bg-brand-primary/10 text-brand-primary px-2 py-1 rounded text-[10px] font-black">{emp.salaryCurrency}</span>
                    )}
                  </td>
                  <td className="py-6 text-gray-500 text-xs font-mono">{emp.bankDetails || '--'}</td>
                  <td className="py-6 text-right">
                    {editingId === emp.id ? (
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleUpdateSalary(emp.id)} className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg hover:bg-emerald-500/30 transition-all">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="p-2 bg-rose-500/20 text-rose-500 rounded-lg hover:bg-rose-500/30 transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => {
                          setEditingId(emp.id);
                          setNewSalary(emp.baseSalary || 0);
                          setNewCurrency(emp.salaryCurrency || 'XOF');
                        }}
                        className="p-2 bg-white/5 text-gray-400 rounded-lg hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <Banknote className="w-12 h-12 text-gray-800" />
                      <p className="text-gray-600 font-bold">Aucun employé trouvé.</p>
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
