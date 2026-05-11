import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  UserPlus, User, Building2, MapPin, Phone, CreditCard, Calendar,
  PenTool, CheckCircle, Upload, X, Loader2, Briefcase, Mail, Globe
} from 'lucide-react';
import api from '../utils/api';
import SignaturePad from '../components/SignaturePad';

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
  const [idFile, setIdFile] = useState<File | null>(null);
  const [docFiles, setDocFiles] = useState<File[]>([]);
  const [rdvDesc, setRdvDesc] = useState('');
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setError('');

    const form = formRef.current;
    if (!form) return;
    const fd = new FormData(form);

    // Add files
    if (idFile) fd.append('idDocument', idFile);
    docFiles.forEach(f => fd.append('documents', f));

    // Add signatures
    if (clientSig) fd.append('clientSignatureBase64', clientSig);
    if (commercialSig) fd.append('commercialSignatureBase64', commercialSig);

    // Add extra fields
    fd.set('clientType', clientType);
    fd.set('idDocumentType', idDocType);
    fd.set('rdvMode', rdvMode);
    fd.set('consentMode', consentMode);
    fd.set('consentGiven', consentMode === 'CHECKBOX' ? String(consentChecked) : String(!!clientSig));
    fd.set('rdvDescription', rdvDesc);

    setIsSubmitting(true);
    try {
      await api.post('/client-registrations', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        form.reset();
        setClientSig(null);
        setCommercialSig(null);
        setIdFile(null);
        setDocFiles([]);
        setConsentChecked(false);
        setRdvDesc('');
      }, 3000);
    } catch (err: any) {
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
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-bl-full" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg">
              <UserPlus className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">ENREGISTREMENT CLIENT</h1>
              <p className="text-sm text-gray-400">Formulaire de nouveau client</p>
            </div>
          </div>
          <div className="mt-4 h-1 w-32 bg-gradient-to-r from-orange-500 to-orange-300 rounded-full" />
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-2xl p-4 text-sm font-medium">{error}</div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <InputField label="Nom" name="lastName" placeholder="Entrez le nom" required />
            <InputField label="Prénom(s)" name="firstName" placeholder="Entrez le prénom" required />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sexe</label>
              <select name="gender" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-orange-500/50 transition-all">
                <option value="HOMME" className="bg-gray-900">Homme</option>
                <option value="FEMME" className="bg-gray-900">Femme</option>
              </select>
            </div>
            <InputField label="Date de naissance" name="birthDate" type="date" icon={Calendar} />
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InputField label="Adresse / Localisation" name="address" placeholder="Entrez l'adresse" icon={MapPin} />
            <InputField label="Ville" name="city" placeholder="Entrez la ville" />
            <InputField label="Commune / Quartier" name="commune" placeholder="Entrez la commune" />
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

        {/* Section 4: Contacts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="glass-card rounded-3xl p-6">
          <SectionHeader icon={Phone} title="Contacts" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InputField label="Téléphone fixe" name="phoneFix" placeholder="Entrez le fixe" icon={Phone} />
            <InputField label="Téléphone mobile" name="phoneMobile" placeholder="Entrez le mobile" icon={Phone} />
            <InputField label="Numéro WhatsApp" name="whatsapp" placeholder="Entrez le WhatsApp" icon={Globe} />
            <InputField label="Adresse email" name="email" type="email" placeholder="exemple@email.com" icon={Mail} />
          </div>
        </motion.div>

        {/* Section 5: Pièce d'Identité */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-3xl p-6">
          <SectionHeader icon={CreditCard} title="Pièce d'Identité" />
          <p className="text-xs text-gray-500 font-bold mb-3 uppercase tracking-wider">Type de document</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {idDocTypes.map(dt => (
              <button key={dt.value} type="button" onClick={() => setIdDocType(dt.value)}
                className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-bold transition-all ${idDocType === dt.value ? 'border-orange-500 bg-orange-500/10 text-orange-400' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'}`}>
                <span>{dt.icon}</span>
                <span className="truncate">{dt.label}</span>
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Télécharger le document</label>
            <div className="relative">
              <input type="file" accept="image/*,.pdf" onChange={e => setIdFile(e.target.files?.[0] || null)}
                className="hidden" id="idDocFile" />
              <label htmlFor="idDocFile"
                className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/20 bg-white/5 cursor-pointer hover:border-orange-500/50 transition-all">
                <Upload className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-400">{idFile ? idFile.name : 'Cliquez pour sélectionner un fichier'}</span>
                {idFile && <button type="button" onClick={e => { e.preventDefault(); setIdFile(null); }} className="ml-auto"><X className="w-4 h-4 text-red-400" /></button>}
              </label>
            </div>
          </div>
        </motion.div>

        {/* Section 6: Documents légaux additionnels */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.33 }} className="glass-card rounded-3xl p-6">
          <SectionHeader icon={Briefcase} title="Documents Légaux" />
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Pièces justificatives (max 5)</label>
            <input type="file" accept="image/*,.pdf" multiple onChange={e => { if (e.target.files) setDocFiles(Array.from(e.target.files).slice(0, 5)); }}
              className="hidden" id="docFiles" />
            <label htmlFor="docFiles"
              className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-white/20 bg-white/5 cursor-pointer hover:border-orange-500/50 transition-all">
              <Upload className="w-5 h-5 text-gray-400" />
              <span className="text-sm text-gray-400">{docFiles.length > 0 ? `${docFiles.length} fichier(s) sélectionné(s)` : 'Cliquez pour sélectionner'}</span>
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

          {/* Choix du mode de consentement client */}
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
              Je confirme que les informations fournies sont exactes et j'autorise leur utilisation dans le cadre du suivi commercial et de la prise de rendez-vous.
              <br />
              <span className="text-orange-400 underline cursor-pointer text-xs">J'accepte les conditions de traitement des données personnelles.</span>
            </label>
          </div>
          <div className="flex items-center gap-4 mt-4">
            <span className="text-xs text-gray-500 font-bold uppercase">Date</span>
            <span className="text-sm text-gray-300">{new Date().toLocaleDateString('fr-FR')}</span>
          </div>
        </motion.div>

        {/* Submit */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <button type="submit" disabled={isSubmitting || !consentChecked}
            className="w-full py-4 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-black text-lg rounded-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-red-500/20 flex items-center justify-center gap-3">
            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
            {isSubmitting ? 'Enregistrement en cours...' : 'Enregistrer le formulaire'}
          </button>
        </motion.div>
      </form>
    </div>
  );
};

export default ClientRegistration;
