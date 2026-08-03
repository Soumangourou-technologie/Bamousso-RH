import { useEffect, useState } from 'react';
import api from '../utils/api';
import { 
  Building2, CheckCircle, Ban, 
  X, Search, Filter, Plus, 
  RefreshCw, MoreVertical, Wallet
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Company {
  id: string;
  name: string;
  plan: 'FITINI' | 'LOUBA' | 'KORO';
  billingCycle: 'MONTHLY' | 'YEARLY';
  subscriptionStatus: string;
  subscriptionEndsAt?: string | null;
  paymentMode: string;
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
  };
}

const PLAN_LABELS: Record<string, string> = {
  FITINI: 'FITINI',
  LOUBA: 'LOUBA',
  KORO: 'Kôrô',
};

const SuperAdminOfflineClients = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('ALL');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    companyName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    plan: 'FITINI',
    billingCycle: 'MONTHLY'
  });

  const fetchData = async () => {
    try {
      const res = await api.get('/admin/companies');
      // On ne garde que les entreprises HORS-LIGNE
      const offlineOnly = res.data.filter((c: Company) => c.paymentMode === 'OFFLINE');
      setCompanies(offlineOnly);
    } catch (error) {
      console.error('Error fetching companies', error);
    }
  };

  useEffect(() => {
    void fetchData();
    window.addEventListener('app:refresh', fetchData);
    return () => window.removeEventListener('app:refresh', fetchData);
  }, []);

  const handleToggleLock = async (company: Company) => {
    try {
      await api.patch(`/admin/companies/${company.id}/toggle-lock`);
      void fetchData();
    } catch (error) {
      console.error('Error toggling lock', error);
    }
  };

  const handleRenew = async (company: Company) => {
    if (!window.confirm(`Voulez-vous vraiment prolonger l'abonnement de ${company.name} ?`)) return;
    try {
      await api.patch(`/admin/companies/offline/${company.id}/renew`);
      void fetchData();
      alert("Abonnement prolongé avec succès !");
    } catch (error) {
      console.error('Error renewing subscription', error);
      alert('Erreur lors du renouvellement');
    }
  };

  const handleDelete = async (company: Company) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir supprimer définitivement ${company.name} ? Action irréversible.`)) return;
    try {
      await api.delete(`/admin/companies/${company.id}`);
      void fetchData();
    } catch (error) {
      console.error('Error deleting company', error);
      alert('Erreur lors de la suppression');
    }
  };

  const handleCreateOfflineCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/admin/companies/offline', formData);
      setIsCreateModalOpen(false);
      setFormData({ companyName: '', firstName: '', lastName: '', email: '', phone: '', password: '', plan: 'FITINI', billingCycle: 'MONTHLY' });
      void fetchData();
      alert("Entreprise créée et e-mail envoyé à l'administrateur !");
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erreur lors de la création';
      const errorDetails = error.response?.data?.error ? `\nDétails: ${error.response.data.error}` : '';
      alert(errorMessage + errorDetails);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePlanCycle = async (plan: string, cycle: string) => {
    if (!selectedCompany) return;
    try {
      await api.patch(`/admin/companies/offline/${selectedCompany.id}/plan`, { plan, billingCycle: cycle });
      setIsPlanModalOpen(false);
      void fetchData();
      alert("Plan mis à jour !");
    } catch (error) {
      console.error('Error updating plan', error);
    }
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
    if (days === 0) return "Aujourd'hui";
    return `${days} jours`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return 'Non activé';
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
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
              <Wallet className="w-10 h-10" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-white mb-2 tracking-tight">Clients Hors-Ligne</h1>
              <p className="text-brand-accent font-bold uppercase tracking-[0.3em] text-xs">Paiement Comptant (Cash)</p>
            </div>
          </div>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-brand-primary hover:bg-orange-600 text-white px-8 py-4 rounded-2xl font-black flex items-center gap-3 shadow-xl shadow-brand-primary/20 transition-all active:scale-95 premium-glow"
          >
            <Plus className="w-5 h-5" /> Ajouter Client
          </button>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto md:overflow-visible pb-4 md:pb-0 snap-x snap-mandatory no-scrollbar">
        {[
          { label: 'Total Clients Offline', value: companies.length, icon: Building2, color: 'from-blue-600 to-blue-800' },
          { label: 'Abonnements Actifs', value: companies.filter(c => !c.isLocked && c.subscriptionStatus === 'ACTIVE').length, icon: CheckCircle, color: 'from-emerald-600 to-emerald-800' },
          { label: 'Comptes Suspendus', value: companies.filter(c => c.isLocked).length, icon: Ban, color: 'from-rose-600 to-rose-800' }
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

      {/* Main Content */}
      <div className="glass-card rounded-[2.5rem] p-10">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10">
          <h2 className="text-3xl font-black text-white tracking-tight">Liste des entreprises</h2>
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
                      <span className="text-[10px] font-black text-brand-accent uppercase tracking-[0.2em]">{PLAN_LABELS[company.plan]} ({company.billingCycle === 'YEARLY' ? 'Annuel' : 'Mensuel'})</span>
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
                    <span className="shrink-0">Contact / Email</span>
                    <span className="text-brand-accent font-bold truncate">{company.manager?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest gap-2">
                    <span className="shrink-0">Effectif</span>
                    <span className="text-gray-300 font-black">{company._count?.users || 0} membres</span>
                  </div>
                  <div className="flex justify-between text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest gap-2">
                    <span className="shrink-0">Échéance</span>
                    <div className="text-right min-w-0">
                      <div className="text-brand-accent truncate">{formatDate(company.subscriptionEndsAt)}</div>
                      <div className={`text-[9px] ${getDaysRemaining(company.subscriptionEndsAt) === 'Expiré' ? 'text-rose-500' : 'text-emerald-500'}`}>{getDaysRemaining(company.subscriptionEndsAt)}</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mt-auto">
                  <button 
                    onClick={() => handleRenew(company)}
                    title="Renouveler l'abonnement"
                    className="p-3 bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20 rounded-xl transition-all flex items-center justify-center"
                  >
                    <RefreshCw className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleToggleLock(company)}
                    title={company.isLocked ? "Réactiver" : "Suspendre"}
                    className={`p-3 rounded-xl flex items-center justify-center transition-all ${company.isLocked ? 'bg-emerald-600/10 text-emerald-500 hover:bg-emerald-600/20' : 'bg-rose-600/10 text-rose-500 hover:bg-rose-600/20'}`}
                  >
                    {company.isLocked ? <CheckCircle className="w-5 h-5" /> : <Ban className="w-5 h-5" />}
                  </button>
                  <button 
                    onClick={() => handleDelete(company)}
                    className="p-3 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 text-gray-500 dark:text-gray-400 hover:text-rose-500 hover:border-rose-500/30 rounded-xl transition-all flex items-center justify-center"
                    title="Supprimer définitivement"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Création Modal */}
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl border-white/20 max-h-[90vh] overflow-y-auto custom-scrollbar">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-black text-white tracking-tight">Ajouter un Client (Espèces)</h3>
                <button onClick={() => setIsCreateModalOpen(false)} className="p-2 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-full transition-colors"><X className="w-6 h-6 text-gray-500 dark:text-gray-400" /></button>
              </div>
              <form onSubmit={handleCreateOfflineCompany} className="space-y-6">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Nom de l'entreprise</label>
                    <input required placeholder="Ex: Soumangourou Tech" className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold"
                      value={formData.companyName} onChange={e => setFormData({...formData, companyName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Téléphone</label>
                    <input required placeholder="+225 0102030405" className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold"
                      value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Prénom Admin</label>
                    <input required placeholder="Prénom" className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold"
                      value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Nom Admin</label>
                    <input required placeholder="Nom" className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold"
                      value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Email Admin</label>
                    <input required type="email" placeholder="admin@entreprise.com" className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold"
                      value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Mot de passe provisoire</label>
                    <input required type="text" placeholder="Mot de passe" className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold"
                      value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Forfait Choisi</label>
                    <select value={formData.plan} onChange={e => setFormData({...formData, plan: e.target.value})} className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold appearance-none">
                      <option value="FITINI" className="bg-brand-900">FITINI</option>
                      <option value="LOUBA" className="bg-brand-900">LOUBA</option>
                      <option value="KORO" className="bg-brand-900">KÔRÔ</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-brand-accent uppercase tracking-widest">Cycle</label>
                    <select value={formData.billingCycle} onChange={e => setFormData({...formData, billingCycle: e.target.value})} className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold appearance-none">
                      <option value="MONTHLY" className="bg-brand-900">Mensuel</option>
                      <option value="YEARLY" className="bg-brand-900">Annuel</option>
                    </select>
                  </div>
                </div>

                <button disabled={loading} className="w-full py-5 bg-brand-primary hover:bg-orange-600 text-white rounded-2xl font-black shadow-xl shadow-brand-primary/20 active:scale-95 transition-all premium-glow uppercase tracking-widest mt-4">
                  {loading ? 'Création en cours...' : 'Créer et Activer'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Plan Update Modal */}
      <AnimatePresence>
        {isPlanModalOpen && selectedCompany && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card rounded-[3rem] p-10 max-w-sm w-full shadow-2xl border-white/20">
              <h3 className="text-3xl font-black text-white mb-8 tracking-tight">Modifier Plan/Cycle</h3>
              
              <div className="space-y-4">
                <div className="space-y-2 mb-4">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Nouveau Forfait</label>
                  <select 
                    id="planSelect"
                    defaultValue={selectedCompany.plan}
                    className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold appearance-none"
                  >
                    <option value="FITINI" className="bg-brand-900">FITINI</option>
                    <option value="LOUBA" className="bg-brand-900">LOUBA</option>
                    <option value="KORO" className="bg-brand-900">KÔRÔ</option>
                  </select>
                </div>
                
                <div className="space-y-2 mb-8">
                  <label className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Nouveau Cycle</label>
                  <select 
                    id="cycleSelect"
                    defaultValue={selectedCompany.billingCycle}
                    className="p-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary w-full text-white font-bold appearance-none"
                  >
                    <option value="MONTHLY" className="bg-brand-900">Mensuel</option>
                    <option value="YEARLY" className="bg-brand-900">Annuel</option>
                  </select>
                </div>

                <button 
                  onClick={() => {
                    const plan = (document.getElementById('planSelect') as HTMLSelectElement).value;
                    const cycle = (document.getElementById('cycleSelect') as HTMLSelectElement).value;
                    handleUpdatePlanCycle(plan, cycle);
                  }}
                  className="w-full py-4 bg-brand-primary hover:bg-orange-600 text-white rounded-xl font-black shadow-lg"
                >
                  Valider
                </button>
                <button onClick={() => setIsPlanModalOpen(false)} className="w-full mt-4 py-4 text-gray-500 dark:text-gray-400 font-black hover:text-white transition-colors uppercase tracking-widest text-xs">Annuler</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminOfflineClients;
