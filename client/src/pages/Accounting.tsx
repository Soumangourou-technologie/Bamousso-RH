import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Wallet, TrendingUp, TrendingDown, Download } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';
import api from '../utils/api';
import ExpenseList from '../components/accounting/ExpenseList';
import TransactionList from '../components/accounting/TransactionList';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const Accounting = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'TRESO' | 'EXPENSES'>('TRESO');
  const [stats, setStats] = useState({ monthIncome: 0, monthExpense: 0, pendingExpenseReports: 0 });
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const canViewAccounting = ['COMPANY_ADMIN', 'HR_MANAGER', 'COMPTABLE', 'SUPER_ADMIN'].includes(user?.role || '');

  const fetchStats = async () => {
    try {
      const res = await api.get('/accounting/stats');
      setStats(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (canViewAccounting) {
      void fetchStats();
    }
  }, [canViewAccounting, activeTab, refreshTrigger]); // Refresh stats when changing tab or trigger

  useEffect(() => {
    const handleGlobalRefresh = () => {
      setRefreshTrigger(prev => prev + 1);
    };
    window.addEventListener('app:refresh', handleGlobalRefresh);
    return () => window.removeEventListener('app:refresh', handleGlobalRefresh);
  }, []);

  if (!canViewAccounting) {
    return <Navigate to="/dashboard" replace />;
  }

  const solde = stats.monthIncome - stats.monthExpense;

  const handleExport = async () => {
    try {
      // Fetch both for export
      const [txRes, expRes] = await Promise.all([
        api.get('/accounting/transactions'),
        api.get('/accounting/expenses')
      ]);

      const wb = new ExcelJS.Workbook();
      wb.creator = 'Bamousso-RH';
      wb.lastModifiedBy = 'Bamousso-RH';
      wb.created = new Date();

      // Sheet 1: Trésorerie
      const wsTx = wb.addWorksheet('Trésorerie');
      wsTx.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Motif', key: 'title', width: 30 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Catégorie', key: 'category', width: 20 },
        { header: 'Référence', key: 'reference', width: 20 },
        { header: 'Montant (FCFA)', key: 'amount', width: 20 }
      ];

      txRes.data.forEach((tx: any) => {
        wsTx.addRow({
          date: new Date(tx.date).toLocaleDateString(),
          title: tx.title,
          type: tx.type === 'INCOME' ? 'Entrée' : 'Sortie',
          category: tx.category,
          reference: tx.reference || '',
          amount: tx.amount
        });
      });

      // Sheet 2: Notes de Frais
      const wsExp = wb.addWorksheet('Notes de Frais');
      wsExp.columns = [
        { header: 'Date', key: 'date', width: 15 },
        { header: 'Employé', key: 'employee', width: 30 },
        { header: 'Motif', key: 'title', width: 30 },
        { header: 'Catégorie', key: 'category', width: 20 },
        { header: 'Statut', key: 'status', width: 15 },
        { header: 'Montant (FCFA)', key: 'amount', width: 20 }
      ];

      expRes.data.forEach((exp: any) => {
        wsExp.addRow({
          date: new Date(exp.createdAt).toLocaleDateString(),
          employee: `${exp.employee.firstName} ${exp.employee.lastName}`,
          title: exp.title,
          category: exp.category,
          status: exp.status,
          amount: exp.amount
        });
      });

      const buffer = await wb.xlsx.writeBuffer();
      const data = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(data, `Export_Compta_${new Date().getMonth()+1}_${new Date().getFullYear()}.xlsx`);
    } catch (error) {
      alert("Erreur lors de l'exportation");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Comptabilité</h1>
          <p className="text-gray-400 font-medium mt-1">Suivi de trésorerie et notes de frais</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExport} className="bg-white/10 text-white px-6 py-3 rounded-xl font-black text-sm uppercase tracking-widest border border-white/20 hover:bg-white/20 flex items-center gap-2 transition-all">
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-8 rounded-4xl border border-white/5 bg-linear-to-br from-green-600/10 to-green-900/10">
          <TrendingUp className="w-8 h-8 text-green-500 mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Entrées (Ce mois)</p>
          <p className="text-3xl font-black text-white tracking-tighter">{stats.monthIncome.toLocaleString()} FCFA</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-8 rounded-4xl border border-white/5 bg-linear-to-br from-red-600/10 to-red-900/10">
          <TrendingDown className="w-8 h-8 text-red-500 mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Dépenses (Ce mois)</p>
          <p className="text-3xl font-black text-white tracking-tighter">{stats.monthExpense.toLocaleString()} FCFA</p>
        </motion.div>
        
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card p-8 rounded-4xl border border-white/5">
          <Wallet className="w-8 h-8 text-brand-accent mb-6" />
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Solde (Mois)</p>
          <p className={`text-xl font-black tracking-tighter mt-2 ${solde < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
            {solde > 0 ? '+' : ''}{solde.toLocaleString()} FCFA
          </p>
        </motion.div>
      </div>

      <div className="flex space-x-2 bg-white/5 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('TRESO')}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors ${activeTab === 'TRESO' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Trésorerie
        </button>
        <button
          onClick={() => setActiveTab('EXPENSES')}
          className={`px-6 py-2 rounded-lg font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === 'EXPENSES' ? 'bg-brand-primary text-white' : 'text-gray-400 hover:text-white'}`}
        >
          Notes de Frais
          {stats.pendingExpenseReports > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{stats.pendingExpenseReports}</span>
          )}
        </button>
      </div>

      <motion.div 
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'TRESO' ? <TransactionList refreshTrigger={refreshTrigger} /> : <ExpenseList refreshTrigger={refreshTrigger} />}
      </motion.div>

    </div>
  );
};

export default Accounting;
