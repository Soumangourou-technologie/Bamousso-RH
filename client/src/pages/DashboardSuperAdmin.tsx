import { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import api from '../utils/api';
import { 
  Building2, CheckCircle, Ban, 
  X, Search, Filter, ShieldCheck, UserPlus, 
  Wallet, MoreVertical, FileText, Terminal, Megaphone, Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Company {
  id: string;
  name: string;
  plan: 'FITINI' | 'LOUBA' | 'KORO';
  subscriptionStatus: string;
  subscriptionEndsAt?: string | null;
  createdAt: string;
  isLocked: boolean;
  manager?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  _count?: {
    users: number;
    departments: number;
  };
}

interface SuperAdmin {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  isOnline?: boolean;
}

interface SystemLog {
  id: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
  details: any;
  source: string;
  createdAt: string;
}

const PLAN_LABELS: Record<string, string> = {
  FITINI: 'FITINI',
  LOUBA: 'LOUBA',
  KORO: 'Kôrô',
};

const PLAN_PRICES: Record<string, number> = {
  FITINI: 4500,
  LOUBA: 7500,
  KORO: 14700,
};

const DashboardSuperAdmin = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  // Reserved for future list of admins
  const [superAdmins, setSuperAdmins] = useState<SuperAdmin[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('ALL');
  const [activeTab, setActiveTab] = useState<'companies' | 'payments' | 'settings'>('companies');
  const [payments, setPayments] = useState<any[]>([]);
  
  // Settings State
  const [whatsappContacts, setWhatsappContacts] = useState<string[]>(['', '']);
  const [isSavingSettings, setIsSavingSettings] = useState(false);


  // Modal States
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  // Forms
  const [newAdmin, setNewAdmin] = useState({ email: '', password: '', firstName: '', lastName: '' });
  const [adminLoading, setAdminLoading] = useState(false);

  const location = useLocation();

  const fetchData = async () => {
    try {
      const [compRes, statsRes, payRes, settingsRes] = await Promise.all([
        api.get('/admin/companies'),
        api.get('/admin/stats'),
        api.get('/admin/payments'),
        api.get('/admin/settings')
      ]);
      setCompanies(compRes.data);
      setSuperAdmins(statsRes.data.superAdmins);
      setPayments(payRes.data);
      if (settingsRes.data?.WHATSAPP_CONTACTS) {
        // Ensure at least 2 inputs
        const contacts = settingsRes.data.WHATSAPP_CONTACTS;
        setWhatsappContacts([contacts[0] || '', contacts[1] || '']);
      }
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  useEffect(() => {
    void fetchData();
    window.addEventListener('app:refresh', fetchData);
    return () => window.removeEventListener('app:refresh', fetchData);
  }, []);

  // Gestion de la navigation par Hash (#companies, #payments)
  useEffect(() => {
    if (location.hash === '#payments') {
      setActiveTab('payments');
      setTimeout(() => {
        document.getElementById('payments-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else if (location.hash === '#companies') {
      setActiveTab('companies');
      setTimeout(() => {
        document.getElementById('companies-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location.hash]);

  const handleToggleLock = async (company: Company) => {
    try {
      await api.patch(`/admin/companies/${company.id}/toggle-lock`);
      void fetchData();
    } catch (error) {
      console.error('Error toggling lock', error);
    }
  };

  const handleDeleteCompany = async (company: Company) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${company.name} ? Cette action est irréversible.`)) return;
    try {
      await api.delete(`/admin/companies/${company.id}`);
      void fetchData();
    } catch (error) {
      console.error('Error deleting company', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleUpdatePlan = async (newPlan: string) => {
    if (!selectedCompany) return;
    try {
      await api.patch(`/admin/companies/${selectedCompany.id}/plan`, { plan: newPlan });
      setIsPlanModalOpen(false);
      void fetchData();
    } catch (error) {
      console.error('Error updating plan', error);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    try {
      await api.post('/admin/super-admins', newAdmin);
      setIsAdminModalOpen(false);
      setNewAdmin({ email: '', password: '', firstName: '', lastName: '' });
      void fetchData();
      alert('Super-Admin créé avec succès');
    } catch (error: any) {
      alert(error.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setAdminLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      // Filter out empty strings before saving
      const validContacts = whatsappContacts.filter(c => c.trim() !== '');
      await api.put('/admin/settings', {
        WHATSAPP_CONTACTS: validContacts
      });
      alert('Paramètres enregistrés avec succès !');
    } catch (error) {
      console.error('Error saving settings', error);
      alert('Erreur lors de la sauvegarde des paramètres');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await api.get('/admin/logs');
      setLogs(res.data);
      setIsLogsModalOpen(true);
    } catch (error) {
      console.error('Error fetching logs', error);
      alert('Erreur lors de la récupération des logs');
    } finally {
      setLogsLoading(false);
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const tableData = filteredCompanies.map(c => [
      c.name,
      `${c.manager?.firstName ?? ''} ${c.manager?.lastName ?? ''}`.trim() || 'N/A',
      c.manager?.phone || 'N/A',
      c.manager?.email || 'N/A',
      PLAN_LABELS[c.plan] || c.plan,
      c.isLocked ? 'Suspendu' : 'Actif',
      new Date(c.createdAt).toLocaleDateString('fr-FR')
    ]);

    doc.setFontSize(18);
    doc.text('Liste des Entreprises Inscrites - Bamousso RH', 14, 20);
    doc.setFontSize(11);
    doc.text(`Généré le : ${new Date().toLocaleString()}`, 14, 30);

    autoTable(doc, {
      startY: 35,
      head: [['Entreprise', 'Admin', 'Téléphone', 'Email', 'Plan', 'Statut', 'Inscription']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [255, 87, 34], textColor: 255 },
      styles: { fontSize: 8 }
    });

    doc.save(`Bamousso_Entreprises_${new Date().getTime()}.pdf`);
  };

  const filteredCompanies = companies.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         c.manager?.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.manager?.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         c.manager?.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterPlan === 'ALL' || c.plan === filterPlan;
    return matchesSearch && matchesFilter;
  });

  const getDaysRemaining = (date?: string | null) => {
    if (!date) return 'En attente';
    const diff = new Date(date).getTime() - new Date().getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    if (days < 0) return 'Expiré';
    if (days === 0) return 'Aujourd\'hui';
    return `${days} jours`;
  };

  const totalRevenue = companies.reduce((acc, c) => {
    const price = PLAN_PRICES[c.plan] || 0;
    return acc + (c.subscriptionStatus === 'ACTIVE' ? price : 0);
  }, 0);

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Non activé';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleDownloadInvoice = async (paymentId: string, companyName: string, reference: string) => {
    try {
      const response = await api.get(`/admin/payments/${paymentId}/invoice`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Facture_${companyName.replace(/\s+/g, '_')}_${reference}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading invoice', error);
      alert('Erreur lors du téléchargement de la facture');
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-20">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-linear-to-bl from-brand-primary/20 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 duration-700" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 rounded-3xl bg-linear-to-br from-brand-primary to-brand-accent text-white flex items-center justify-center shadow-2xl shadow-brand-primary/30">
              <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Super-Admin Panel</h1>
              <p className="text-brand-accent font-bold uppercase tracking-[0.3em] text-xs">Gestion globale • Bamousso RH</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/dashboard/super-admin/pixel-analytics"
              className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3.5 rounded-2xl font-black flex items-center gap-2.5 shadow-lg shadow-blue-500/20 transition-all active:scale-95 text-sm"
            >
              <Activity className="w-5 h-5 text-white" /> Pixel & Pubs Meta
            </Link>
            <Link
              to="/dashboard/super-admin/broadcast"
              className="bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white px-6 py-3.5 rounded-2xl font-black flex items-center gap-2.5 shadow-lg shadow-orange-500/20 transition-all active:scale-95 text-sm"
            >
              <Megaphone className="w-5 h-5 text-white" /> Diffusion & Emails
            </Link>
            <button 
              onClick={fetchLogs}
              disabled={logsLoading}
              className="bg-white dark:bg-[#1f1f1f]/10 hover:bg-white dark:bg-[#1f1f1f]/20 text-white px-6 py-3.5 rounded-2xl font-black flex items-center gap-2.5 border border-white/10 transition-all active:scale-95 text-sm"
            >
              <Terminal className={`w-5 h-5 ${logsLoading ? 'animate-spin' : 'text-brand-accent'}`} /> {logsLoading ? 'Chargement...' : 'Logs Système'}
            </button>
            <button 
              onClick={exportToPDF}
              className="bg-white dark:bg-[#1f1f1f]/10 hover:bg-white dark:bg-[#1f1f1f]/20 text-white px-6 py-3.5 rounded-2xl font-black flex items-center gap-2.5 border border-white/10 transition-all active:scale-95 text-sm"
            >
              <FileText className="w-5 h-5 text-brand-accent" /> Exporter PDF
            </button>
            <button 
              onClick={() => setIsAdminModalOpen(true)}
              className="bg-brand-primary hover:bg-orange-600 text-white px-6 py-3.5 rounded-2xl font-black flex items-center gap-2.5 shadow-xl shadow-brand-primary/20 transition-all active:scale-95 premium-glow text-sm"
            >
              <UserPlus className="w-5 h-5" /> Ajouter un Admin
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards - Slidable on mobile */}
      <div className="flex md:grid md:grid-cols-4 gap-6 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory no-scrollbar">
        {[
          { label: 'Entreprises', value: companies.length, icon: Building2, color: 'from-blue-600 to-blue-800' },
          { label: 'Abonnements Actifs', value: companies.filter(c => c.subscriptionStatus === 'ACTIVE').length, icon: CheckCircle, color: 'from-emerald-600 to-emerald-800' },
          { label: 'Revenu Mensuel', value: `${totalRevenue.toLocaleString()} FCFA`, icon: Wallet, color: 'from-amber-600 to-amber-800' },
          { label: 'Suspendus', value: companies.filter(c => c.isLocked).length, icon: Ban, color: 'from-rose-600 to-rose-800' }
        ].map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}
            key={stat.label} 
            className="glass-card p-8 rounded-4xl relative overflow-hidden group min-w-70 md:min-w-0 snap-center"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-linear-to-br ${stat.color} opacity-10 rounded-bl-[3rem] transition-transform group-hover:scale-125 duration-500`} />
            <stat.icon className="w-8 h-8 text-white/20 mb-6" />
            <p className="text-gray-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">{stat.label}</p>
            <p className="text-3xl font-black text-white tracking-tighter">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Super Admins List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
        className="glass-card rounded-[2.5rem] p-10"
      >
        <div className="flex items-center gap-4 mb-8">
           <ShieldCheck className="w-8 h-8 text-brand-primary" />
           <h2 className="text-3xl font-black text-white tracking-tight">Équipe Super-Admin</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {superAdmins.map((admin) => (
             <div key={admin.id} className="p-6 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-4xl flex items-center gap-4 group hover:bg-white dark:bg-[#1f1f1f]/10 transition-all">
                <div className="relative">
                  <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-brand-primary to-brand-accent flex items-center justify-center text-white font-black text-xl shadow-lg">
                    {admin.firstName[0]}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-4 border-[#1a0f0a] ${admin.isOnline ? 'bg-emerald-500' : 'bg-gray-50 dark:bg-gray-800/500'}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">{admin.firstName} {admin.lastName}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">{admin.isOnline ? 'En ligne' : 'Hors ligne'}</p>
                  <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium italic">Inscrit le {new Date(admin.createdAt).toLocaleDateString()}</p>
                </div>
             </div>
           ))}
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-white/10 pb-4 overflow-x-auto no-scrollbar">
        <button 
          onClick={() => setActiveTab('companies')}
          className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'companies' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'text-gray-500 dark:text-gray-400 hover:text-white'}`}
        >
          Entreprises
        </button>
        <button 
          onClick={() => setActiveTab('payments')}
          className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'payments' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'text-gray-500 dark:text-gray-400 hover:text-white'}`}
        >
          Factures (Paiements)
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-8 py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/20' : 'text-gray-500 dark:text-gray-400 hover:text-white'}`}
        >
          Paramètres Système
        </button>
      </div>

      {/* Main Content */}
      <div className="glass-card rounded-[2.5rem] p-10">
        {activeTab === 'companies' ? (
          <>
            <div id="companies-section" className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 scroll-mt-24">
              <h2 className="text-3xl font-black text-white tracking-tight">Gestion des Entreprises</h2>
              <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
                  <input 
                    type="text" placeholder="Rechercher..."
                    value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                    className="pl-12 pr-6 py-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-2xl w-full md:w-72 focus:ring-2 focus:ring-brand-primary text-white font-bold placeholder:text-gray-600 dark:text-gray-400"
                  />
                </div>
                <div className="relative">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
                  <select 
                    value={filterPlan} onChange={e => setFilterPlan(e.target.value)}
                    className="pl-12 pr-10 py-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-primary appearance-none font-bold text-white cursor-pointer"
                  >
                    <option value="ALL" className="bg-brand-900">Tous les plans</option>
                    <option value="FITINI" className="bg-brand-900">Fitini</option>
                    <option value="LOUBA" className="bg-brand-900">Louba</option>
                    <option value="KORO" className="bg-brand-900">Kôrô</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex md:grid md:grid-cols-2 lg:grid-cols-3 gap-8 overflow-x-auto md:overflow-visible pb-8 md:pb-0 snap-x snap-mandatory no-scrollbar">
              <AnimatePresence>
                {filteredCompanies.map(company => (
                  <motion.div 
                    layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    key={company.id} className={`p-8 rounded-4xl border transition-all duration-300 group hover:shadow-2xl min-w-[320px] md:min-w-0 snap-center ${company.isLocked ? 'bg-rose-500/10 border-rose-500/20' : 'bg-white dark:bg-[#1f1f1f]/5 border-white/10 hover:border-brand-primary/30'}`}
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="min-w-0">
                        <h3 className="text-2xl font-black text-white leading-tight group-hover:text-brand-primary transition-colors truncate">{company.name}</h3>
                        <div className="flex items-center gap-2 mt-2">
                          <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(255,87,34,0.8)]" />
                          <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em]">{PLAN_LABELS[company.plan]}</span>
                        </div>
                      </div>
                      <button onClick={() => { setSelectedCompany(company); setIsPlanModalOpen(true); }} className="p-3 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-2xl transition-colors shrink-0">
                        <MoreVertical className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </button>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest gap-2">
                        <span className="shrink-0">Administrateur</span>
                        <span className="text-gray-300 truncate">{company.manager?.firstName} {company.manager?.lastName}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest gap-2">
                        <span className="shrink-0">Contact / WhatsApp</span>
                        <span className="text-brand-accent font-bold truncate">{company.manager?.phone || 'N/A'}</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest gap-2">
                        <span className="shrink-0">Effectif</span>
                        <span className="text-gray-300 font-black">{company._count?.users || 0} membres</span>
                      </div>
                      <div className="flex justify-between text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest gap-2">
                        <span className="shrink-0">Échéance</span>
                        <div className="text-right min-w-0">
                          <div className="text-brand-accent truncate">{formatDate(company.subscriptionEndsAt)}</div>
                          <div className="text-[9px] text-emerald-500">{getDaysRemaining(company.subscriptionEndsAt)}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-auto">
                      <button 
                        onClick={() => handleToggleLock(company)}
                        className={`flex-1 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${company.isLocked ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'bg-rose-600 text-white shadow-lg shadow-rose-600/20 active:scale-95'}`}
                      >
                        {company.isLocked ? 'Réactiver' : 'Suspendre'}
                      </button>
                      <button 
                        onClick={() => handleDeleteCompany(company)}
                        className="p-4 rounded-2xl bg-white dark:bg-[#1f1f1f]/5 border border-white/10 text-gray-500 dark:text-gray-400 hover:text-rose-500 hover:border-rose-500/30 transition-all active:scale-95"
                        title="Supprimer définitivement"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </>
        ) : activeTab === 'payments' ? (
          <>
            <div id="payments-section" className="flex justify-between items-center mb-10 scroll-mt-24">
              <h2 className="text-3xl font-black text-white tracking-tight">Historique des Factures</h2>
              <p className="text-gray-500 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px]">{payments.length} transactions réussies</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest border-b border-white/5">
                  <tr>
                    <th className="pb-4">Date</th>
                    <th className="pb-4">Entreprise</th>
                    <th className="pb-4">Montant</th>
                    <th className="pb-4">Référence</th>
                    <th className="pb-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-sm font-bold text-gray-300">
                  {payments.map(payment => (
                    <tr key={payment.id} className="border-b border-white/5 hover:bg-white dark:bg-[#1f1f1f]/5 transition-all">
                      <td className="py-6">{new Date(payment.createdAt).toLocaleDateString()}</td>
                      <td className="py-6">
                        <span className="text-white font-black">{payment.company?.name}</span>
                        <p className="text-[9px] text-gray-500 dark:text-gray-400 font-medium">{payment.description}</p>
                      </td>
                      <td className="py-6 text-brand-accent">{payment.amount.toLocaleString()} FCFA</td>
                      <td className="py-6 font-mono text-[10px] text-gray-500 dark:text-gray-400">{payment.reference}</td>
                      <td className="py-6 text-right">
                        <button 
                          onClick={() => handleDownloadInvoice(payment.id, payment.company?.name || 'Inconnue', payment.reference)}
                          className="p-3 bg-white dark:bg-[#1f1f1f]/5 hover:bg-brand-primary/10 hover:text-brand-primary rounded-xl transition-all group"
                          title="Télécharger PDF"
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black text-white tracking-tight">Paramètres Globaux</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-8 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-4xl">
                <h3 className="text-xl font-black text-white mb-6">Contact WhatsApp (Paiements Hors-Ligne)</h3>
                <p className="text-sm text-gray-400 mb-6">
                  Ces numéros apparaîtront sur la page d'accueil pour les clients souhaitant souscrire en payant en espèces directement au siège ou par mobile money hors plateforme.
                </p>
                <form onSubmit={handleSaveSettings} className="space-y-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest mb-2">Numéro 1 (Principal)</label>
                    <input 
                      type="text" 
                      placeholder="+2250000000000" 
                      value={whatsappContacts[0]}
                      onChange={(e) => setWhatsappContacts([e.target.value, whatsappContacts[1]])}
                      className="w-full p-4 bg-black/30 border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase text-gray-500 dark:text-gray-400 tracking-widest mb-2">Numéro 2 (Optionnel)</label>
                    <input 
                      type="text" 
                      placeholder="+2250000000000" 
                      value={whatsappContacts[1]}
                      onChange={(e) => setWhatsappContacts([whatsappContacts[0], e.target.value])}
                      className="w-full p-4 bg-black/30 border border-white/10 rounded-2xl text-white font-bold focus:ring-2 focus:ring-brand-primary"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={isSavingSettings}
                    className="w-full py-4 mt-4 bg-brand-primary hover:bg-orange-600 text-white font-black rounded-2xl shadow-lg shadow-brand-primary/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {isSavingSettings ? 'Enregistrement...' : 'Enregistrer les contacts'}
                  </button>
                </form>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Plan Update Modal */}
      <AnimatePresence>
        {isPlanModalOpen && selectedCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-[3rem] p-10 max-w-sm w-full shadow-2xl border-white/20">
              <h3 className="text-3xl font-black text-white mb-8 tracking-tight">Changer le plan</h3>
              <div className="space-y-4">
                {Object.keys(PLAN_LABELS).map(p => (
                  <button 
                    key={p} onClick={() => handleUpdatePlan(p)}
                    className={`w-full p-6 rounded-4xl border-2 text-left transition-all duration-300 ${selectedCompany.plan === p ? 'border-brand-primary bg-brand-primary/10' : 'border-white/5 hover:border-white/20 bg-white dark:bg-[#1f1f1f]/5'}`}
                  >
                    <p className="font-black text-white text-lg">{PLAN_LABELS[p]}</p>
                    <p className="text-sm text-brand-accent font-bold mt-1">{PLAN_PRICES[p]} FCFA / mois</p>
                  </button>
                ))}
              </div>
              <button onClick={() => setIsPlanModalOpen(false)} className="w-full mt-8 py-4 text-gray-500 dark:text-gray-400 font-black hover:text-white transition-colors uppercase tracking-widest text-xs">Annuler</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Admin Creation Modal */}
      <AnimatePresence>
        {isAdminModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-[3rem] p-10 max-w-md w-full shadow-2xl border-white/20">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black text-white tracking-tight">Nouvel Admin</h3>
                <button onClick={() => setIsAdminModalOpen(false)} className="p-2 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-full transition-colors"><X className="w-6 h-6 text-gray-500 dark:text-gray-400" /></button>
              </div>
              <form onSubmit={handleCreateAdmin} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <input required placeholder="Prénom" className="p-5 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold"
                    value={newAdmin.firstName} onChange={e => setNewAdmin({...newAdmin, firstName: e.target.value})} />
                  <input required placeholder="Nom" className="p-5 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold"
                    value={newAdmin.lastName} onChange={e => setNewAdmin({...newAdmin, lastName: e.target.value})} />
                </div>
                <input required type="email" placeholder="Email professionnel" className="p-5 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold"
                  value={newAdmin.email} onChange={e => setNewAdmin({...newAdmin, email: e.target.value})} />
                <input required type="password" placeholder="Mot de passe" className="p-5 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold"
                  value={newAdmin.password} onChange={e => setNewAdmin({...newAdmin, password: e.target.value})} />
                <button disabled={adminLoading} className="w-full py-5 bg-brand-primary hover:bg-orange-600 text-white rounded-2xl font-black shadow-xl shadow-brand-primary/20 active:scale-95 transition-all premium-glow uppercase tracking-widest">
                  {adminLoading ? 'Création...' : 'Créer le compte'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Logs Modal */}
      <AnimatePresence>
        {isLogsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-[3rem] p-10 max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col shadow-2xl border-white/20">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black text-white tracking-tight">Logs Système (100 derniers)</h3>
                <button onClick={() => setIsLogsModalOpen(false)} className="p-2 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-full transition-colors"><X className="w-6 h-6 text-gray-500 dark:text-gray-400" /></button>
              </div>
              <div className="flex-1 overflow-y-auto space-y-4 pr-4 custom-scrollbar">
                {logs.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-10">Aucun log disponible.</p>
                ) : (
                  logs.map(log => (
                    <div key={log.id} className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-2xl">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                          log.level === 'ERROR' ? 'bg-rose-500/20 text-rose-500' :
                          log.level === 'WARN' ? 'bg-amber-500/20 text-amber-500' :
                          'bg-emerald-500/20 text-emerald-500'
                        }`}>
                          {log.level}
                        </span>
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-white font-bold text-sm mb-2">{log.message}</p>
                      {log.source && <p className="text-[10px] text-brand-accent font-black uppercase mb-2">Source: {log.source}</p>}
                      {log.details && (
                        <pre className="text-[10px] bg-black/30 p-3 rounded-lg text-gray-400 overflow-x-auto font-mono">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardSuperAdmin;
