import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send, Mail, Bell, Paperclip, CheckCircle, AlertCircle,
  Users, Building2, ShieldCheck, Filter, FileText, Download,
  Loader2, Search, X, History, Sparkles, Megaphone
} from 'lucide-react';
import api from '../utils/api';

interface Company {
  id: string;
  name: string;
  plan: string;
  subscriptionStatus: string;
  manager?: {
    email: string;
    firstName: string;
    lastName: string;
  };
}

interface BroadcastHistory {
  id: string;
  subject: string;
  message: string;
  targetType: string;
  targetPlan?: string | null;
  targetRole?: string | null;
  targetCompanyIds: string[];
  sendEmail: boolean;
  sendInApp: boolean;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  createdAt: string;
}

const SuperAdminBroadcast = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [history, setHistory] = useState<BroadcastHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchCompany, setSearchCompany] = useState('');

  // Form State
  const [targetType, setTargetType] = useState<'ALL' | 'SELECTED_COMPANIES' | 'PLAN_FILTER' | 'ROLE_FILTER'>('ALL');
  const [selectedCompanyIds, setSelectedCompanyIds] = useState<string[]>([]);
  const [targetPlan, setTargetPlan] = useState('FITINI');
  const [targetRole, setTargetRole] = useState('COMPANY_ADMIN');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sendEmail, setSendEmail] = useState(true);
  const [sendInApp, setSendInApp] = useState(true);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // Status & Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchCompanies();
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/admin/companies');
      setCompanies(res.data || []);
    } catch (err) {
      console.error('Erreur chargement entreprises:', err);
    }
  };

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await api.get('/admin/broadcasts');
      setHistory(res.data || []);
    } catch (err) {
      console.error('Erreur chargement historique diffusions:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleSelectCompany = (id: string) => {
    setSelectedCompanyIds(prev =>
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

  const selectAllCompanies = () => {
    if (selectedCompanyIds.length === companies.length) {
      setSelectedCompanyIds([]);
    } else {
      setSelectedCompanyIds(companies.map(c => c.id));
    }
  };

  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!subject.trim()) {
      setErrorMessage("Veuillez saisir un objet / sujet pour le message.");
      return;
    }
    if (!message.trim()) {
      setErrorMessage("Veuillez rédiger le contenu du message.");
      return;
    }
    if (!sendEmail && !sendInApp) {
      setErrorMessage("Veuillez cocher au moins un canal de diffusion (Email ou Notification In-App).");
      return;
    }
    if (targetType === 'SELECTED_COMPANIES' && selectedCompanyIds.length === 0) {
      setErrorMessage("Veuillez sélectionner au moins une entreprise cible.");
      return;
    }

    setShowConfirmModal(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const fd = new FormData();
      fd.append('subject', subject);
      fd.append('message', message);
      fd.append('targetType', targetType);
      fd.append('targetPlan', targetPlan);
      fd.append('targetRole', targetRole);
      fd.append('sendEmail', String(sendEmail));
      fd.append('sendInApp', String(sendInApp));
      fd.append('targetCompanyIds', JSON.stringify(selectedCompanyIds));

      if (attachmentFile) {
        fd.append('attachment', attachmentFile);
      }

      const res = await api.post('/admin/broadcast', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setShowConfirmModal(false);
      setSuccessMessage(res.data.message || 'Diffusion effectuée avec succès !');

      // Reset Form
      setSubject('');
      setMessage('');
      setAttachmentFile(null);
      setSelectedCompanyIds([]);
      setTargetType('ALL');

      setTimeout(() => setSuccessMessage(''), 5000);
      if (activeTab === 'history') fetchHistory();
    } catch (err: any) {
      setShowConfirmModal(false);
      setErrorMessage(err?.response?.data?.message || 'Erreur lors de l\'envoi de la diffusion.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredCompanies = companies.filter(c => {
    const q = searchCompany.toLowerCase();
    const name = c.name.toLowerCase();
    const managerName = c.manager ? `${c.manager.firstName} ${c.manager.lastName}`.toLowerCase() : '';
    const email = c.manager?.email ? c.manager.email.toLowerCase() : '';
    return name.includes(q) || managerName.includes(q) || email.includes(q);
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-bl from-orange-500/10 to-transparent rounded-bl-full" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Megaphone className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">DIFFUSION & EMAILINGS SAAS</h1>
              <p className="text-sm text-gray-400">Envoyez des annonces, mises à jour et e-mails ciblés à vos entreprises clientes</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 p-1.5 rounded-2xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'create' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
            >
              <Send className="w-4 h-4" /> Nouvelle Diffusion
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'history' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
            >
              <History className="w-4 h-4" /> Historique ({history.length})
            </button>
          </div>
        </div>
      </motion.div>

      {/* Success Alert */}
      <AnimatePresence>
        {successMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-green-50 dark:bg-green-500/100/10 border border-green-500/30 text-green-400 rounded-2xl p-4 text-sm font-medium flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Alert */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="bg-red-50 dark:bg-red-500/100/10 border border-red-500/30 text-red-400 rounded-2xl p-4 text-sm font-medium flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TAB 1: FORMULAIRE DE CRÉATION DE DIFFUSION */}
      {activeTab === 'create' && (
        <form onSubmit={handlePreSubmit} className="space-y-6">
          {/* Section 1: Choix des Destinataires */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">1. Cible & Destinataires</h3>
                <p className="text-xs text-gray-400">Sélectionnez les entreprises ou profils qui recevront ce message</p>
              </div>
            </div>

            {/* Target Type selector cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                { id: 'ALL', label: 'Toutes les Entreprises', desc: 'Diffusion globale à 100% des clients', icon: Sparkles },
                { id: 'SELECTED_COMPANIES', label: 'Sélection au cas par cas', desc: 'Choisir des entreprises spécifiques', icon: Building2 },
                { id: 'PLAN_FILTER', label: 'Filtrer par Forfait', desc: 'FITINI, LOUBA ou Kôrô', icon: ShieldCheck },
                { id: 'ROLE_FILTER', label: 'Filtrer par Rôle', desc: 'Dirigeants, RH ou Salariés', icon: Filter },
              ].map(item => {
                const Icon = item.icon;
                const isSelected = targetType === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTargetType(item.id as any)}
                    className={`p-4 rounded-2xl border text-left transition-all duration-300 flex flex-col justify-between ${isSelected ? 'border-orange-500 bg-orange-500/10 text-white shadow-lg shadow-orange-500/10' : 'border-white/10 bg-white dark:bg-[#1f1f1f]/5 text-gray-400 hover:border-white/20 hover:text-gray-200'}`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <Icon className={`w-5 h-5 ${isSelected ? 'text-orange-400' : 'text-gray-500 dark:text-gray-400'}`} />
                        {isSelected && <CheckCircle className="w-4 h-4 text-orange-400" />}
                      </div>
                      <p className="font-bold text-sm text-white mb-1">{item.label}</p>
                      <p className="text-[11px] text-gray-400 leading-tight">{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Conditionnel: SELECTED_COMPANIES */}
            {targetType === 'SELECTED_COMPANIES' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4 pt-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-500 dark:text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Rechercher une entreprise ou un gérant..."
                      value={searchCompany}
                      onChange={e => setSearchCompany(e.target.value)}
                      className="w-full bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-gray-900 dark:text-white text-xs placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-orange-500/50"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={selectAllCompanies}
                    className="px-3.5 py-2.5 bg-white dark:bg-[#1f1f1f]/5 hover:bg-white dark:bg-[#1f1f1f]/10 text-orange-400 text-xs font-bold rounded-xl border border-white/10 transition-all shrink-0"
                  >
                    {selectedCompanyIds.length === companies.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto pr-1">
                  {filteredCompanies.map(c => {
                    const isChecked = selectedCompanyIds.includes(c.id);
                    return (
                      <div
                        key={c.id}
                        onClick={() => toggleSelectCompany(c.id)}
                        className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${isChecked ? 'border-orange-500/50 bg-orange-500/10 text-white' : 'border-white/5 bg-white dark:bg-[#1f1f1f]/5 text-gray-400 hover:border-white/10'}`}
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-white truncate">{c.name}</p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">{c.manager ? `${c.manager.firstName} ${c.manager.lastName} (${c.manager.email})` : 'Aucun gérant'}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => { }}
                          className="w-4 h-4 rounded bg-white dark:bg-[#1f1f1f]/5 border-white/20 text-orange-500 focus:ring-orange-500/30 shrink-0 ml-2"
                        />
                      </div>
                    );
                  })}
                </div>
                <p className="text-xs text-orange-400 font-bold">{selectedCompanyIds.length} entreprise(s) sélectionnée(s)</p>
              </motion.div>
            )}

            {/* Conditionnel: PLAN_FILTER */}
            {targetType === 'PLAN_FILTER' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Choix du Forfait Client</label>
                <div className="grid grid-cols-3 gap-3">
                  {['FITINI', 'LOUBA', 'KORO'].map(plan => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => setTargetPlan(plan)}
                      className={`py-3 px-4 rounded-xl border text-sm font-bold transition-all ${targetPlan === plan ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white dark:bg-[#1f1f1f]/5 text-gray-400 hover:border-white/20'}`}
                    >
                      {plan === 'KORO' ? 'Kôrô' : plan}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Conditionnel: ROLE_FILTER */}
            {targetType === 'ROLE_FILTER' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Choix du Rôle Destinataire</label>
                <select
                  value={targetRole}
                  onChange={e => setTargetRole(e.target.value)}
                  className="w-full bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-orange-500/50"
                >
                  <option value="ALL" className="bg-gray-900">Tous les rôles (Ensemble du personnel)</option>
                  <option value="COMPANY_ADMIN" className="bg-gray-900">Administrateurs / Dirigeants d'Entreprise uniquement</option>
                  <option value="HR_MANAGER" className="bg-gray-900">Responsables RH uniquement</option>
                  <option value="COMMERCIAL" className="bg-gray-900">Commerciaux uniquement</option>
                  <option value="LIVREUR" className="bg-gray-900">Livreurs uniquement</option>
                </select>
              </motion.div>
            )}
          </motion.div>

          {/* Section 2: Canaux de diffusion */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                <Send className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">2. Canaux de Diffusion</h3>
                <p className="text-xs text-gray-400">Choisissez comment les clients recevront ce message</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${sendEmail ? 'border-orange-500/50 bg-orange-500/10 text-white' : 'border-white/10 bg-white dark:bg-[#1f1f1f]/5 text-gray-400'}`}>
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f1f]/5 flex items-center justify-center text-orange-400 shrink-0">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-white">Envoi par E-mail</p>
                  <p className="text-xs text-gray-400">Envoyé directement sur l'adresse e-mail enregistrée</p>
                </div>
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={e => setSendEmail(e.target.checked)}
                  className="w-5 h-5 rounded bg-white dark:bg-[#1f1f1f]/5 border-white/20 text-orange-500 focus:ring-orange-500/30"
                />
              </label>

              <label className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all ${sendInApp ? 'border-orange-500/50 bg-orange-500/10 text-white' : 'border-white/10 bg-white dark:bg-[#1f1f1f]/5 text-gray-400'}`}>
                <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f1f]/5 flex items-center justify-center text-orange-400 shrink-0">
                  <Bell className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-white">Notification In-App</p>
                  <p className="text-xs text-gray-400">Affiché dans le centre de notifications de l'application</p>
                </div>
                <input
                  type="checkbox"
                  checked={sendInApp}
                  onChange={e => setSendInApp(e.target.checked)}
                  className="w-5 h-5 rounded bg-white dark:bg-[#1f1f1f]/5 border-white/20 text-orange-500 focus:ring-orange-500/30"
                />
              </label>
            </div>
          </motion.div>

          {/* Section 3: Rédiger le Message */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">3. Contenu de la Communication</h3>
                <p className="text-xs text-gray-400">Rédigez l'objet, le message et joignez un document si nécessaire</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* Sujet */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Objet / Sujet du message</label>
                <input
                  type="text"
                  placeholder="Ex: 🚀 Mise à jour Bamousso RH : Nouvelle fonctionnalité de Messagerie"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl px-4 py-3 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500/50"
                  required
                />
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Corps du Message</label>
                <textarea
                  rows={6}
                  placeholder="Bonjour,\n\nNous avons le plaisir de vous informer qu'une nouvelle mise à jour est disponible..."
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-xl p-4 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500/50 resize-y"
                  required
                />
              </div>

              {/* Upload Pièce Jointe */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pièce jointe (Optionnel : PDF, Image, Document)</label>
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.xlsx"
                    onChange={e => setAttachmentFile(e.target.files?.[0] || null)}
                    className="hidden"
                    id="broadcastAttachment"
                  />
                  <label
                    htmlFor="broadcastAttachment"
                    className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/20 bg-white dark:bg-[#1f1f1f]/5 cursor-pointer hover:border-orange-500/50 transition-all"
                  >
                    <Paperclip className="w-5 h-5 text-orange-400" />
                    <span className="text-sm text-gray-300 truncate">
                      {attachmentFile ? attachmentFile.name : 'Cliquez pour joindre un document (Guide PDF, Note de version...)'}
                    </span>
                    {attachmentFile && (
                      <button
                        type="button"
                        onClick={e => { e.preventDefault(); setAttachmentFile(null); }}
                        className="ml-auto p-1 text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </label>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Bouton de Soumission */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <button
              type="submit"
              className="w-full py-4 bg-linear-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-black text-base rounded-2xl transition-all duration-300 shadow-lg shadow-orange-500/20 flex items-center justify-center gap-3"
            >
              <Send className="w-5 h-5" /> Prévisualiser et Diffuser
            </button>
          </motion.div>
        </form>
      )}

      {/* TAB 2: HISTORIQUE DES DIFFUSIONS */}
      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          {loadingHistory ? (
            <div className="glass-card rounded-3xl p-12 text-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-400" />
              <p>Chargement de l'historique des diffusions...</p>
            </div>
          ) : history.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center text-gray-400">
              <Megaphone className="w-12 h-12 text-gray-600 dark:text-gray-400 mx-auto mb-3" />
              <p className="font-medium">Aucune diffusion envoyée pour le moment.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map(item => (
                <div key={item.id} className="glass-card rounded-2xl p-6 border border-white/5 space-y-3">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                        {item.targetType === 'ALL' ? 'Toutes les entreprises' : item.targetType === 'SELECTED_COMPANIES' ? `${item.targetCompanyIds.length} entreprise(s)` : item.targetType}
                      </span>
                      <h3 className="text-base font-bold text-white">{item.subject}</h3>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed bg-white dark:bg-[#1f1f1f]/5 p-4 rounded-xl">
                    {item.message}
                  </p>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <span className="flex items-center gap-1.5">
                        <Mail className={`w-4 h-4 ${item.sendEmail ? 'text-green-400' : 'text-gray-600 dark:text-gray-400'}`} /> E-mail: {item.sendEmail ? 'Oui' : 'Non'}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Bell className={`w-4 h-4 ${item.sendInApp ? 'text-green-400' : 'text-gray-600 dark:text-gray-400'}`} /> In-App: {item.sendInApp ? 'Oui' : 'Non'}
                      </span>
                    </div>

                    {item.attachmentUrl && (
                      <a
                        href={item.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-xs text-orange-400 hover:text-orange-300 font-bold bg-orange-500/10 px-3 py-1.5 rounded-lg border border-orange-500/20 transition-all"
                      >
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>{item.attachmentName || 'Télécharger le document'}</span>
                        <Download className="w-3.5 h-3.5 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* POP-UP DE CONFIRMATION AVANT DIFFUSION */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card bg-gray-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
              
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirmation de Diffusion</h3>
                  <p className="text-xs text-gray-400">Veuillez valider l'envoi de cette communication SaaS.</p>
                </div>
              </div>

              <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto pr-1">
                <div className="bg-white dark:bg-[#1f1f1f]/5 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-orange-400 uppercase">Cible sélectionnée</p>
                  <p className="text-white font-medium">
                    {targetType === 'ALL' && 'Toutes les entreprises du SaaS'}
                    {targetType === 'SELECTED_COMPANIES' && `${selectedCompanyIds.length} entreprise(s) sélectionnée(s)`}
                    {targetType === 'PLAN_FILTER' && `Clients du forfait ${targetPlan}`}
                    {targetType === 'ROLE_FILTER' && `Destinataires du rôle ${targetRole}`}
                  </p>
                </div>

                <div className="bg-white dark:bg-[#1f1f1f]/5 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-orange-400 uppercase">Canaux d'envoi</p>
                  <p className="text-gray-300 text-xs">
                    {sendEmail && '📧 E-mail (via Resend)  '}
                    {sendInApp && '🔔 Notification In-App'}
                  </p>
                </div>

                <div className="bg-white dark:bg-[#1f1f1f]/5 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-orange-400 uppercase">Sujet / Objet</p>
                  <p className="text-white font-medium">{subject}</p>
                </div>

                {attachmentFile && (
                  <div className="bg-white dark:bg-[#1f1f1f]/5 rounded-xl p-3 space-y-1">
                    <p className="text-xs font-bold text-orange-400 uppercase">Document attaché</p>
                    <p className="text-xs text-gray-300">📎 {attachmentFile.name} ({(attachmentFile.size / 1024).toFixed(1)} KB)</p>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-white dark:bg-[#1f1f1f]/5 hover:bg-white dark:bg-[#1f1f1f]/10 text-gray-700 dark:text-gray-300 font-bold text-sm rounded-xl transition-all"
                >
                  Annuler / Editer
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isSubmitting ? 'Diffusion...' : 'Confirmer l\'Envoi'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdminBroadcast;
