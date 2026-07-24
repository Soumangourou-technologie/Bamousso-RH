import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UserPlus, User, Building2, MapPin, Phone, CreditCard, Calendar,
  PenTool, CheckCircle, Upload, X, Loader2, Briefcase, Mail, Globe,
  Search, Eye, History, AlertCircle
} from 'lucide-react';
import api from '../utils/api';
import SignaturePad from '../components/SignaturePad';

interface ClientDoc {
  id: string;
  title: string;
  url: string;
  type: string;
  createdAt: string;
}

interface Registration {
  id: string;
  lastName: string;
  firstName: string;
  gender: string | null;
  clientType: string;
  companyName: string | null;
  legalStatus: string | null;
  sector: string | null;
  companyDescription: string | null;
  city: string | null;
  commune: string | null;
  country: string | null;
  phoneFix: string | null;
  phoneMobile: string | null;
  whatsapp: string | null;
  email: string | null;
  idDocumentType: string | null;
  idDocumentUrl: string | null;
  idDocumentUrlRecto: string | null;
  idDocumentUrlVerso: string | null;
  rdvSubject: string | null;
  rdvDescription: string | null;
  rdvDate: string | null;
  rdvTime: string | null;
  rdvMode: string | null;
  clientSignatureUrl: string | null;
  commercialSignatureUrl: string | null;
  consentMode: string | null;
  consentGiven: boolean;
  status: string;
  documents: ClientDoc[];
  createdAt: string;
}

const SectionHeader = ({ icon: Icon, title, color = 'text-orange-400' }: { icon: any; title: string; color?: string }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
      <Icon className={`w-4 h-4 ${color}`} />
    </div>
    <h3 className={`text-lg font-bold ${color}`}>{title}</h3>
  </div>
);

const InputField = ({ label, icon: Icon, ...props }: any) => (
  <div className="flex flex-col gap-1.5">
    {label && <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>}
    <div className="relative">
      {Icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">
          <Icon className="w-4 h-4" />
        </div>
      )}
      <input
        {...props}
        className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500/50 focus:ring-1 focus:ring-orange-500/30 transition-all ${Icon ? 'pl-10' : ''} ${props.className || ''}`}
      />
    </div>
  </div>
);

const ClientRegistration = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [clientType, setClientType] = useState('ENTREPRISE');
  const [idDocType, setIdDocType] = useState('CNI');
  const [rdvMode, setRdvMode] = useState('PRESENTIEL');
  const [consentMode, setConsentMode] = useState<'SIGNATURE' | 'CHECKBOX'>('SIGNATURE');
  const [consentChecked, setConsentChecked] = useState(false);
  const [clientSig, setClientSig] = useState<string | null>(null);
  const [commercialSig, setCommercialSig] = useState<string | null>(null);

  // Files
  const [idRectoFile, setIdRectoFile] = useState<File | null>(null);
  const [idVersoFile, setIdVersoFile] = useState<File | null>(null);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [rdvDesc, setRdvDesc] = useState('');

  // Contacts
  const [phoneFix, setPhoneFix] = useState('');
  const [phoneMobile, setPhoneMobile] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');

  // Confirmation Modal State
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [summaryData, setSummaryData] = useState<any>(null);

  // History State
  const [myRegistrations, setMyRegistrations] = useState<Registration[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);

  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (activeTab === 'history') {
      void fetchMyHistory();
    }
  }, [activeTab]);

  const fetchMyHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await api.get('/client-registrations/my');
      setMyRegistrations(res.data.data || []);
    } catch (err) {
      console.error('Erreur chargement historique commercial:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Pre-validate before showing Confirmation Modal
  const handlePreSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Check contact rule: at least 1 contact
    if (!phoneFix.trim() && !phoneMobile.trim() && !whatsapp.trim() && !email.trim()) {
      setError('Veuillez renseigner au moins un moyen de contact (Téléphone fixe, Mobile, WhatsApp ou Email).');
      return;
    }

    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);

    const isRectoVerso = idDocType === 'CNI' || idDocType === 'PERMIS';

    // Add files
    if (isRectoVerso) {
      if (idRectoFile) fd.append('idDocumentRecto', idRectoFile);
      if (idVersoFile) fd.append('idDocumentVerso', idVersoFile);
    } else {
      if (idRectoFile) fd.append('idDocument', idRectoFile);
    }
    docFiles.forEach(f => fd.append('documents', f));

    // Add signatures
    if (clientSig) fd.append('clientSignatureBase64', clientSig);
    if (commercialSig) fd.append('commercialSignatureBase64', commercialSig);

    // Controlled inputs override/set
    fd.set('phoneFix', phoneFix);
    fd.set('phoneMobile', phoneMobile);
    fd.set('whatsapp', whatsapp);
    fd.set('email', email);

    // Add extra fields
    fd.set('clientType', clientType);
    fd.set('idDocumentType', idDocType);
    fd.set('rdvMode', rdvMode);
    fd.set('consentMode', consentMode);
    fd.set('consentGiven', consentMode === 'CHECKBOX' ? String(consentChecked) : String(!!clientSig));
    fd.set('rdvDescription', rdvDesc);

    // Summary data for confirmation modal
    setSummaryData({
      lastName: fd.get('lastName'),
      firstName: fd.get('firstName'),
      gender: fd.get('gender'),
      clientType,
      companyName: fd.get('companyName'),
      city: fd.get('city'),
      commune: fd.get('commune'),
      country: fd.get('country'),
      contacts: {
        phoneFix,
        phoneMobile,
        whatsapp,
        email,
      },
      idDocType,
      isRectoVerso,
      idDocument: idRectoFile ? idRectoFile.name : null,
      idRecto: idRectoFile ? idRectoFile.name : null,
      idVerso: idVersoFile ? idVersoFile.name : null,
      rdvSubject: fd.get('rdvSubject'),
      rdvDate: fd.get('rdvDate'),
      rdvTime: fd.get('rdvTime'),
      rdvMode,
    });

    setPendingFormData(fd);
    setShowConfirmModal(true);
  };

  // Actual submission after user confirms in Modal
  const handleFinalSubmit = async () => {
    if (!pendingFormData || isSubmitting) return;
    setIsSubmitting(true);
    setError('');

    try {
      await api.post('/client-registrations', pendingFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setShowConfirmModal(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        formRef.current?.reset();
        setClientSig(null);
        setCommercialSig(null);
        setIdRectoFile(null);
        setIdVersoFile(null);
        setDocFiles([]);
        setConsentChecked(false);
        setRdvDesc('');
        setPhoneFix('');
        setPhoneMobile('');
        setWhatsapp('');
        setEmail('');
        setPendingFormData(null);
        setSummaryData(null);
      }, 3000);
    } catch (err: any) {
      setShowConfirmModal(false);
      setError(err?.response?.data?.message || 'Erreur lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const idDocTypes = [
    { value: 'CNI', label: 'Carte Nationale d\'Identité', icon: '🪪' },
    { value: 'PASSEPORT', label: 'Passeport', icon: '📘' },
    { value: 'PERMIS', label: 'Permis de conduire', icon: '🚗' },
    { value: 'AUTRE', label: 'Autre', icon: '📄' },
  ];

  const rdvModes = [
    { value: 'PRESENTIEL', label: 'Présentiel', icon: '🤝' },
    { value: 'APPEL', label: 'Appel téléphonique', icon: '📞' },
    { value: 'VISIO', label: 'Visioconférence', icon: '💻' },
  ];

  const filteredRegistrations = myRegistrations.filter(r => {
    const q = searchTerm.toLowerCase();
    const fullName = `${r.firstName} ${r.lastName}`.toLowerCase();
    const company = (r.companyName || '').toLowerCase();
    const phone = (r.phoneMobile || r.phoneFix || r.whatsapp || '').toLowerCase();
    return fullName.includes(q) || company.includes(q) || phone.includes(q);
  });

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">{label}</p>
          <p className="text-sm text-white font-medium">{value}</p>
        </div>
      </div>
    );
  };

  if (success) {
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white">Enregistrement réussi !</h2>
          <p className="text-gray-400">Le client a été enregistré avec succès.</p>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-linear-to-bl from-orange-500/10 to-transparent rounded-bl-full" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg">
                <UserPlus className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-white tracking-tight">ESPACE COMMERCIAL</h1>
                <p className="text-sm text-gray-400">Gestion et enregistrement des prospects terrain</p>
              </div>
            </div>
            <div className="mt-4 h-1 w-32 bg-linear-to-r from-orange-500 to-orange-300 rounded-full" />

          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-2xl self-start md:self-auto">
            <button
              onClick={() => setActiveTab('form')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'form' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
            >
              <UserPlus className="w-4 h-4" /> Nouveau Client
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all ${activeTab === 'history' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-gray-400 hover:text-white'}`}
            >
              <History className="w-4 h-4" /> Mes Enregistrements
            </button>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 text-sm font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TAB 1: FORMULAIRE ENREGISTREMENT */}
      {activeTab === 'form' && (
        <form ref={formRef} onSubmit={handlePreSubmit} className="space-y-6">
          {/* Section 1: Infos Commercial */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card rounded-3xl p-6">
            <SectionHeader icon={User} title="Informations du Commercial" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Nom du commercial" icon={User} value={`${user?.firstName} ${user?.lastName}`} disabled />
              <InputField label="Date" icon={Calendar} type="date" defaultValue={new Date().toISOString().split('T')[0]} disabled />
              <InputField label="Heure" icon={Calendar} type="time" defaultValue={new Date().toTimeString().slice(0, 5)} disabled />
            </div>
          </motion.div>

          {/* Section 2: Identité Client */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card rounded-3xl p-6">
            <SectionHeader icon={User} title="Informations du Client" />
            <p className="text-xs text-gray-500 font-bold mb-4 uppercase tracking-wider">Identité du Client</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <InputField label="Nom" name="lastName" placeholder="Entrez le nom" required />
              <InputField label="Prénom(s)" name="firstName" placeholder="Entrez le prénom" required />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sexe</label>
                <select name="gender" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-all">
                  <option value="HOMME" className="bg-gray-900">Homme</option>
                  <option value="FEMME" className="bg-gray-900">Femme</option>
                </select>
              </div>
            </div>

            {/* Type de client */}
            <p className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Type de Client</p>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {['ENTREPRISE', 'PARTICULIER'].map(type => (
                <button key={type} type="button" onClick={() => setClientType(type)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border transition-all duration-300 ${clientType === type ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'}`}>
                  {type === 'ENTREPRISE' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  <span className="font-bold text-sm">{type === 'ENTREPRISE' ? 'Entreprise' : 'Particulier'}</span>
                  {clientType === type && <div className="ml-auto w-5 h-5 rounded-full bg-orange-500 flex items-center justify-center"><CheckCircle className="w-3 h-3 text-white" /></div>}
                </button>
              ))}
            </div>

            {/* Infos Entreprise (conditionnel) */}
            {clientType === 'ENTREPRISE' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-4">
                <p className="text-xs text-orange-400 font-bold uppercase tracking-wider">Informations Entreprise (si applicable)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Nom de l'entreprise" name="companyName" placeholder="Entrez le nom de l'entreprise" icon={Building2} />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Statut juridique</label>
                    <select name="legalStatus" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-all">
                      <option value="" className="bg-gray-900">Sélectionnez le statut</option>
                      <option value="SARL" className="bg-gray-900">SARL</option>
                      <option value="SA" className="bg-gray-900">SA</option>
                      <option value="SAS" className="bg-gray-900">SAS</option>
                      <option value="EI" className="bg-gray-900">Entreprise Individuelle</option>
                      <option value="ASSOCIATION" className="bg-gray-900">Association</option>
                      <option value="AUTRE" className="bg-gray-900">Autre</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <InputField label="Secteur d'activité" name="sector" placeholder="Entrez le secteur" />
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description de l'entreprise</label>
                    <textarea name="companyDescription" rows={3} maxLength={500} placeholder="Décrivez brièvement l'entreprise..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Section 3: Localisation */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card rounded-3xl p-6">
            <SectionHeader icon={MapPin} title="Localisation" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <InputField label="Ville" name="city" placeholder="Entrez la ville" icon={MapPin} />
              <InputField label="Commune / Quartier" name="commune" placeholder="Entrez la commune ou le quartier" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pays</label>
                <select name="country" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-all">
                  <option value="Mali" className="bg-gray-900">🇲🇱 Mali</option>
                  <option value="Sénégal" className="bg-gray-900">🇸🇳 Sénégal</option>
                  <option value="Côte d'Ivoire" className="bg-gray-900">🇨🇮 Côte d'Ivoire</option>
                  <option value="Burkina Faso" className="bg-gray-900">🇧🇫 Burkina Faso</option>
                  <option value="Guinée" className="bg-gray-900">🇬🇳 Guinée</option>
                  <option value="Niger" className="bg-gray-900">🇳🇪 Niger</option>
                  <option value="Autre" className="bg-gray-900">Autre</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Section 4: Contacts (Au moins 1 contact requis) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader icon={Phone} title="Contacts" />
              <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">
                * Au moins 1 contact requis
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <InputField
                label="Téléphone fixe"
                icon={Phone}
                value={phoneFix}
                onChange={(e: any) => setPhoneFix(e.target.value)}
                placeholder="Ex: 20 22 00 00"
              />
              <InputField
                label="Téléphone mobile"
                icon={Phone}
                value={phoneMobile}
                onChange={(e: any) => setPhoneMobile(e.target.value)}
                placeholder="Ex: 70 00 00 00"
              />
              <InputField
                label="Numéro WhatsApp"
                icon={Globe}
                value={whatsapp}
                onChange={(e: any) => setWhatsapp(e.target.value)}
                placeholder="Ex: +223 70 00 00 00"
              />
              <InputField
                label="Adresse email"
                type="email"
                icon={Mail}
                value={email}
                onChange={(e: any) => setEmail(e.target.value)}
                placeholder="Ex: client@email.com"
              />
            </div>
          </motion.div>

          {/* Section 5: Pièce d'Identité */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-3xl p-6">
            <SectionHeader icon={CreditCard} title="Pièce d'Identité" />
            <p className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Type de document</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {idDocTypes.map(dt => (
                <button key={dt.value} type="button" onClick={() => {
                  setIdDocType(dt.value);
                  if (dt.value !== 'CNI' && dt.value !== 'PERMIS') {
                    setIdVersoFile(null);
                  }
                }}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${idDocType === dt.value ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'}`}>
                  <span>{dt.icon}</span>
                  <span className="truncate">{dt.label}</span>
                </button>
              ))}
            </div>

            {idDocType === 'CNI' || idDocType === 'PERMIS' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* RECTO */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Télécharger le Recto (Face)</label>
                  <div className="relative">
                    <input type="file" accept="image/*,.pdf" onChange={e => setIdRectoFile(e.target.files?.[0] || null)}
                      className="hidden" id="idRectoFile" />
                    <label htmlFor="idRectoFile"
                      className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/20 bg-white/5 cursor-pointer hover:border-orange-500/50 transition-all">
                      <Upload className="w-5 h-5 text-orange-400" />
                      <span className="text-sm text-gray-300 truncate">{idRectoFile ? idRectoFile.name : 'Photo Recto (Face)'}</span>
                      {idRectoFile && <button type="button" onClick={e => { e.preventDefault(); setIdRectoFile(null); }} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>}
                    </label>
                  </div>
                </div>

                {/* VERSO */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Télécharger le Verso (Dos)</label>
                  <div className="relative">
                    <input type="file" accept="image/*,.pdf" onChange={e => setIdVersoFile(e.target.files?.[0] || null)}
                      className="hidden" id="idVersoFile" />
                    <label htmlFor="idVersoFile"
                      className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/20 bg-white/5 cursor-pointer hover:border-orange-500/50 transition-all">
                      <Upload className="w-5 h-5 text-orange-400" />
                      <span className="text-sm text-gray-300 truncate">{idVersoFile ? idVersoFile.name : 'Photo Verso (Dos)'}</span>
                      {idVersoFile && <button type="button" onClick={e => { e.preventDefault(); setIdVersoFile(null); }} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>}
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              /* DOCUMENT UNIQUE (Passeport / Autre) */
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Télécharger la pièce d'identité</label>
                <div className="relative">
                  <input type="file" accept="image/*,.pdf" onChange={e => setIdRectoFile(e.target.files?.[0] || null)}
                    className="hidden" id="idSingleFile" />
                  <label htmlFor="idSingleFile"
                    className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/20 bg-white/5 cursor-pointer hover:border-orange-500/50 transition-all">
                    <Upload className="w-5 h-5 text-orange-400" />
                    <span className="text-sm text-gray-300 truncate">{idRectoFile ? idRectoFile.name : `Scan / Photo (${idDocType === 'PASSEPORT' ? 'Passeport' : 'Document'})`}</span>
                    {idRectoFile && <button type="button" onClick={e => { e.preventDefault(); setIdRectoFile(null); }} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>}
                  </label>
                </div>
              </div>
            )}
          </motion.div>

          {/* Section 6: Documents légaux additionnels (Optionnel) */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }} className="glass-card rounded-3xl p-6">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader icon={Briefcase} title="Documents Légaux" />
              <span className="text-xs font-bold text-gray-500 bg-white/5 px-3 py-1 rounded-full border border-white/10">
                Optionnel / Recommandé
              </span>
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pièces justificatives entreprise / RCCM / NIF (max 5)</label>
              <input type="file" accept="image/*,.pdf" multiple onChange={e => { if (e.target.files) setDocFiles(Array.from(e.target.files).slice(0, 5)); }}
                className="hidden" id="docFiles" />
              <label htmlFor="docFiles"
                className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/20 bg-white/5 cursor-pointer hover:border-orange-500/50 transition-all">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400">{docFiles.length > 0 ? `${docFiles.length} fichier(s) sélectionné(s)` : 'Cliquez pour ajouter des documents optionnels'}</span>
              </label>
              {docFiles.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {docFiles.map((f, i) => (
                    <span key={i} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-300 flex items-center gap-2">
                      {f.name}
                      <button type="button" onClick={() => setDocFiles(prev => prev.filter((_, idx) => idx !== i))}><X className="w-3 h-3 text-red-400" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* Section 7: Rendez-vous */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="glass-card rounded-3xl p-6">
            <SectionHeader icon={Calendar} title="Informations du Rendez-vous" color="text-red-400" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <InputField label="Objet du rendez-vous" name="rdvSubject" placeholder="Entrez l'objet du rendez-vous" />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Description / Notes commerciales</label>
                <textarea value={rdvDesc} onChange={e => setRdvDesc(e.target.value)} rows={3} maxLength={1000} placeholder="Ajoutez des notes ou des informations complémentaires..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 text-sm focus:outline-none focus:border-orange-500/50 transition-all resize-none" />
                <span className="text-right text-xs text-gray-600">{rdvDesc.length}/1000</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <InputField label="Date prévue" name="rdvDate" type="date" icon={Calendar} />
              <InputField label="Heure prévue" name="rdvTime" type="time" icon={Calendar} />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Mode de rendez-vous</label>
                <div className="flex gap-2">
                  {rdvModes.map(m => (
                    <button key={m.value} type="button" onClick={() => setRdvMode(m.value)}
                      className={`flex-1 flex items-center justify-center gap-1 p-2.5 rounded-xl border text-xs font-bold transition-all ${rdvMode === m.value ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-white/10 bg-white/5 text-gray-400'}`}>
                      <span>{m.icon}</span>
                      <span className="hidden md:inline">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Section 8: Signature */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="glass-card rounded-3xl p-6">
            <SectionHeader icon={PenTool} title="Signature Numérique" color="text-purple-400" />

            <div className="mb-6">
              <p className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Mode de consentement du client</p>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setConsentMode('SIGNATURE')}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${consentMode === 'SIGNATURE' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-white/10 bg-white/5 text-gray-400'}`}>
                  <PenTool className="w-4 h-4" /> Signature
                </button>
                <button type="button" onClick={() => setConsentMode('CHECKBOX')}
                  className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${consentMode === 'CHECKBOX' ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-white/10 bg-white/5 text-gray-400'}`}>
                  <CheckCircle className="w-4 h-4" /> Accord verbal
                </button>
              </div>
            </div>

            {consentMode === 'SIGNATURE' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SignaturePad label="Signature du Client" onSignatureChange={setClientSig} />
                <SignaturePad label="Signature du Commercial" onSignatureChange={setCommercialSig} />
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <CheckCircle className="w-10 h-10 text-purple-400 mx-auto mb-3" />
                <p className="text-gray-300 text-sm font-medium">Le client donne son accord verbal. Pas de signature requise.</p>
              </div>
            )}
          </motion.div>

          {/* Section 9: Consentement */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="glass-card rounded-3xl p-6">
            <SectionHeader icon={CheckCircle} title="Consentement" color="text-green-400" />
            <div className="flex items-start gap-3">
              <input type="checkbox" id="consent" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} required
                className="mt-1 w-5 h-5 rounded bg-white/5 border-white/20 text-orange-500 focus:ring-orange-500/30" />
              <label htmlFor="consent" className="text-sm text-gray-300 leading-relaxed">
                Je confirme que les informations fournies sont exactes et j'autorise leur utilisation dans le cadre du suivi commercial.
              </label>
            </div>
          </motion.div>

          {/* Bouton de Soumission -> Ouvre le Popup */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <button type="submit" disabled={isSubmitting || !consentChecked}
              className="w-full py-4 bg-linear-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-lg rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 flex items-center justify-center gap-3">
              <CheckCircle className="w-5 h-5" /> Enregistrer le formulaire
            </button>
          </motion.div>

        </form>
      )}

      {/* TAB 2: HISTORIQUE DU COMMERCIAL (LECTURE SEULE) */}
      {activeTab === 'history' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
          {/* Bar de recherche */}
          <div className="glass-card rounded-2xl p-4 flex items-center gap-3">
            <Search className="w-5 h-5 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Rechercher par nom, entreprise ou téléphone..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none"
            />
          </div>

          {loadingHistory ? (
            <div className="glass-card rounded-3xl p-12 text-center text-gray-400">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-orange-400" />
              <p>Chargement de vos enregistrements...</p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center text-gray-400">
              <User className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <p className="font-medium">Aucun client trouvé dans votre historique.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRegistrations.map((reg) => (
                <div key={reg.id} className="glass-card rounded-2xl p-5 border border-white/5 hover:border-orange-500/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                        {reg.clientType}
                      </span>
                      <h3 className="text-base font-bold text-white mt-1">{reg.firstName} {reg.lastName}</h3>
                      {reg.companyName && <p className="text-xs text-gray-400 font-medium">{reg.companyName}</p>}
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">{new Date(reg.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-300 mb-4 border-t border-white/5 pt-3">
                    <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /> {reg.phoneMobile || reg.phoneFix || reg.whatsapp || 'Aucun tel'}</p>
                    <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-gray-400" /> {reg.city ? `${reg.city}, ${reg.country || ''}` : 'Non spécifié'}</p>
                  </div>

                  {/* Bouton consultation uniquement */}
                  <button
                    onClick={() => setSelectedReg(reg)}
                    className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                  >
                    <Eye className="w-4 h-4 text-orange-400" /> Consulter le détail
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* POPUP DE CONFIRMATION AVANT ENREGISTREMENT */}
      <AnimatePresence>
        {showConfirmModal && summaryData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card bg-gray-900 border border-white/10 rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5">
              
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-400">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirmation de l'enregistrement</h3>
                  <p className="text-xs text-gray-400">Veuillez vérifier les informations saisies avant de valider.</p>
                </div>
              </div>

              <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto pr-1">
                <div className="bg-white/5 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-orange-400 uppercase">Identité Client</p>
                  <p className="text-white font-medium">{summaryData.firstName} {summaryData.lastName} ({summaryData.clientType})</p>
                  {summaryData.companyName && <p className="text-xs text-gray-400">Entreprise: {summaryData.companyName}</p>}
                </div>

                <div className="bg-white/5 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-orange-400 uppercase">Localisation</p>
                  <p className="text-white font-medium">{summaryData.city ? `${summaryData.city} (${summaryData.commune || ''}) - ${summaryData.country}` : summaryData.country}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-orange-400 uppercase">Contacts fournis</p>
                  {summaryData.contacts.phoneMobile && <p className="text-xs text-gray-300">📱 Mobile: {summaryData.contacts.phoneMobile}</p>}
                  {summaryData.contacts.phoneFix && <p className="text-xs text-gray-300">☎️ Fixe: {summaryData.contacts.phoneFix}</p>}
                  {summaryData.contacts.whatsapp && <p className="text-xs text-gray-300">💬 WhatsApp: {summaryData.contacts.whatsapp}</p>}
                  {summaryData.contacts.email && <p className="text-xs text-gray-300">✉️ Email: {summaryData.contacts.email}</p>}
                </div>

                <div className="bg-white/5 rounded-xl p-3 space-y-1">
                  <p className="text-xs font-bold text-orange-400 uppercase">Pièce d'identité ({summaryData.idDocType})</p>
                  {summaryData.isRectoVerso ? (
                    <>
                      <p className="text-xs text-gray-300">Recto: {summaryData.idRecto || 'Non joint'}</p>
                      <p className="text-xs text-gray-300">Verso: {summaryData.idVerso || 'Non joint'}</p>
                    </>
                  ) : (
                    <p className="text-xs text-gray-300">Document: {summaryData.idDocument || 'Non joint'}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-gray-300 font-bold text-sm rounded-xl transition-all"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={handleFinalSubmit}
                  disabled={isSubmitting}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isSubmitting ? 'Envoi...' : 'Confirmer et Enregistrer'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE DETAIL EN HISTORIQUE COMMERCIAL (LECTURE SEULE STRICTE) */}
      <AnimatePresence>
        {selectedReg && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card bg-gray-900 border border-white/10 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                    {selectedReg.clientType}
                  </span>
                  <h2 className="text-xl font-bold text-white mt-1">{selectedReg.firstName} {selectedReg.lastName}</h2>
                  {selectedReg.companyName && <p className="text-xs text-gray-400">{selectedReg.companyName}</p>}
                </div>
                <button onClick={() => setSelectedReg(null)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 bg-white/5 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Localisation</p>
                  <InfoRow icon={MapPin} label="Ville" value={selectedReg.city} />
                  <InfoRow icon={MapPin} label="Commune / Quartier" value={selectedReg.commune} />
                  <InfoRow icon={Globe} label="Pays" value={selectedReg.country} />
                </div>

                <div className="space-y-3 bg-white/5 p-4 rounded-2xl">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Contacts</p>
                  <InfoRow icon={Phone} label="Fixe" value={selectedReg.phoneFix} />
                  <InfoRow icon={Phone} label="Mobile" value={selectedReg.phoneMobile} />
                  <InfoRow icon={Globe} label="WhatsApp" value={selectedReg.whatsapp} />
                  <InfoRow icon={Mail} label="Email" value={selectedReg.email} />
                </div>
              </div>

              {/* Display Recto/Verso images if available */}
              {(selectedReg.idDocumentUrlRecto || selectedReg.idDocumentUrlVerso || selectedReg.idDocumentUrl) && (
                <div className="bg-white/5 p-4 rounded-2xl space-y-3">
                  <p className="text-xs font-bold text-orange-400 uppercase tracking-wider">Pièce d'Identité ({selectedReg.idDocumentType || 'Document'})</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedReg.idDocumentUrlRecto && (
                      <a href={selectedReg.idDocumentUrlRecto} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-white/5 rounded-xl text-xs text-orange-400 hover:underline">
                        <CreditCard className="w-4 h-4" /> Voir le Recto
                      </a>
                    )}
                    {selectedReg.idDocumentUrlVerso && (
                      <a href={selectedReg.idDocumentUrlVerso} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-white/5 rounded-xl text-xs text-orange-400 hover:underline">
                        <CreditCard className="w-4 h-4" /> Voir le Verso
                      </a>
                    )}
                    {selectedReg.idDocumentUrl && !selectedReg.idDocumentUrlRecto && (
                      <a href={selectedReg.idDocumentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-white/5 rounded-xl text-xs text-orange-400 hover:underline">
                        <CreditCard className="w-4 h-4" /> Voir le document
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Signatures */}
              <div className="grid grid-cols-2 gap-4">
                {selectedReg.clientSignatureUrl && (
                  <div className="bg-white/5 p-3 rounded-2xl text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Signature Client</p>
                    <img src={selectedReg.clientSignatureUrl} alt="Signature client" className="max-h-20 mx-auto rounded bg-white/10 p-1" />
                  </div>
                )}
                {selectedReg.commercialSignatureUrl && (
                  <div className="bg-white/5 p-3 rounded-2xl text-center">
                    <p className="text-[10px] text-gray-400 font-bold uppercase mb-2">Signature Commercial</p>
                    <img src={selectedReg.commercialSignatureUrl} alt="Signature commercial" className="max-h-20 mx-auto rounded bg-white/10 p-1" />
                  </div>
                )}
              </div>

              <div className="pt-2 text-right">
                <button onClick={() => setSelectedReg(null)} className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all">
                  Fermer
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ClientRegistration;
