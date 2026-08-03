import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, FolderOpen, ArrowLeft, Eye, MapPin, Phone, Mail,
  Calendar, Building2, FileText, Download, User, Briefcase, Clock, Globe, Trash2, Loader2
} from 'lucide-react';

import api from '../utils/api';

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
  birthDate: string | null;
  clientType: string;
  companyName: string | null;
  legalStatus: string | null;
  sector: string | null;
  companyDescription: string | null;
  address: string | null;
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

interface CommercialGroup {
  commercial: { id: string; firstName: string; lastName: string; email: string };
  registrations: Registration[];
  count: number;
}

type View = 'folders' | 'list' | 'detail';

const ClientRegistrationAdmin = () => {
  const [groups, setGroups] = useState<CommercialGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('folders');
  const [selectedGroup, setSelectedGroup] = useState<CommercialGroup | null>(null);
  const [selectedReg, setSelectedReg] = useState<Registration | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void fetchData();
    window.addEventListener('app:refresh', fetchData);
    return () => window.removeEventListener('app:refresh', fetchData);
  }, []);

  const fetchData = async () => {
    try {
      const res = await api.get('/client-registrations');
      setGroups(res.data.data || []);
    } catch (err) {
      console.error('Erreur chargement enregistrements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet enregistrement client ? Cette action est irréversible.')) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete(`/client-registrations/${id}`);
      setSelectedReg(null);
      setView('list');
      await fetchData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Erreur lors de la suppression.');
    } finally {
      setIsDeleting(false);
    }
  };



  const totalClients = groups.reduce((sum, g) => sum + g.count, 0);

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null | undefined }) => {
    if (!value) return null;
    return (
      <div className="flex items-start gap-3 py-2">
        <Icon className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-[10px] uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold">{label}</p>
          <p className="text-sm text-white font-medium">{value}</p>
        </div>
      </div>
    );
  };

  // FOLDERS VIEW
  const renderFolders = () => (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="glass-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-black text-orange-400">{totalClients}</p>
          <p className="text-xs text-gray-400 font-bold mt-1">Clients enregistrés</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center">
          <p className="text-3xl font-black text-blue-400">{groups.length}</p>
          <p className="text-xs text-gray-400 font-bold mt-1">Commerciaux actifs</p>
        </div>
        <div className="glass-card rounded-2xl p-5 text-center hidden md:block">
          <p className="text-3xl font-black text-green-400">
            {groups.length > 0 ? Math.round(totalClients / groups.length) : 0}
          </p>
          <p className="text-xs text-gray-400 font-bold mt-1">Moy. par commercial</p>
        </div>
      </div>

      {/* Folders Grid */}
      {groups.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-600 dark:text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400 font-medium">Aucun enregistrement client pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g, i) => (
            <motion.button key={g.commercial.id}
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              onClick={() => { setSelectedGroup(g); setView('list'); }}
              className="glass-card rounded-2xl p-6 text-left hover:border-orange-500/30 border border-transparent transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-black text-lg shadow-lg shadow-orange-500/20 group-hover:scale-105 transition-transform">

                  {g.commercial.firstName[0]}{g.commercial.lastName[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-white font-bold truncate">{g.commercial.firstName} {g.commercial.lastName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{g.commercial.email}</p>
                </div>
              </div>
              <div className="flex items-center justify-between bg-white dark:bg-[#1f1f1f]/5 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 text-gray-400">
                  <Users className="w-4 h-4" />
                  <span className="text-sm font-bold">{g.count} client{g.count > 1 ? 's' : ''}</span>
                </div>
                <FolderOpen className="w-4 h-4 text-orange-400 group-hover:scale-110 transition-transform" />
              </div>
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );

  // LIST VIEW
  const renderList = () => {
    if (!selectedGroup) return null;
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
        <button onClick={() => { setView('folders'); setSelectedGroup(null); }}
          className="flex items-center gap-2 text-orange-400 hover:text-orange-300 font-bold text-sm transition-colors mb-2">
          <ArrowLeft className="w-4 h-4" /> Retour aux dossiers
        </button>

        <div className="glass-card rounded-2xl p-5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-linear-to-br from-orange-500 to-orange-700 flex items-center justify-center text-white font-black shadow-lg">

            {selectedGroup.commercial.firstName[0]}{selectedGroup.commercial.lastName[0]}
          </div>
          <div>
            <p className="text-white font-bold text-lg">{selectedGroup.commercial.firstName} {selectedGroup.commercial.lastName}</p>
            <p className="text-xs text-gray-400">{selectedGroup.count} enregistrement{selectedGroup.count > 1 ? 's' : ''}</p>
          </div>
        </div>

        <div className="space-y-3">
          {selectedGroup.registrations.map((reg, i) => (
            <motion.button key={reg.id}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => { setSelectedReg(reg); setView('detail'); }}
              className="w-full glass-card rounded-2xl p-5 text-left hover:border-orange-500/20 border border-transparent transition-all group">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white dark:bg-[#1f1f1f]/5 flex items-center justify-center">
                    {reg.clientType === 'ENTREPRISE' ? <Building2 className="w-5 h-5 text-blue-400" /> : <User className="w-5 h-5 text-green-400" />}
                  </div>
                  <div>
                    <p className="text-white font-bold">{reg.firstName} {reg.lastName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{reg.clientType === 'ENTREPRISE' ? reg.companyName || 'Entreprise' : 'Particulier'} • {reg.city || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] bg-green-50 dark:bg-green-500/100/10 text-green-400 px-2 py-1 rounded-lg font-bold uppercase">{reg.status}</span>
                  <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 text-xs">
                    <Clock className="w-3 h-3" />
                    {new Date(reg.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                  <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400 group-hover:text-orange-400 transition-colors" />
                </div>
              </div>
              {reg.documents.length > 0 && (
                <div className="mt-3 flex items-center gap-2">
                  <FileText className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 font-bold">{reg.documents.length} document(s) joint(s)</span>
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    );
  };

  // DETAIL VIEW
  const renderDetail = () => {
    if (!selectedReg) return null;
    const r = selectedReg;
    return (
      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
        <button onClick={() => { setView('list'); setSelectedReg(null); }}
          className="flex items-center gap-2 text-orange-400 hover:text-orange-300 font-bold text-sm transition-colors">
          <ArrowLeft className="w-4 h-4" /> Retour à la liste
        </button>

        {/* Client Header */}
        <div className="glass-card rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-black text-lg shadow-lg">

              {r.firstName[0]}{r.lastName[0]}
            </div>
            <div>
              <h2 className="text-xl font-black text-white">{r.firstName} {r.lastName}</h2>
              <p className="text-xs text-gray-400 flex items-center gap-2">
                {r.clientType === 'ENTREPRISE' ? <Building2 className="w-3 h-3" /> : <User className="w-3 h-3" />}
                {r.clientType} • Enregistré le {new Date(r.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>

          <button
            onClick={() => handleDelete(r.id)}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-500/100/10 hover:bg-red-50 dark:bg-red-500/100/20 text-red-400 border border-red-500/30 rounded-xl font-bold text-xs transition-all self-start md:self-auto disabled:opacity-50"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            Supprimer le client
          </button>
        </div>


        {/* Info sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Identité */}
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Identité</h4>
            <InfoRow icon={User} label="Sexe" value={r.gender === 'HOMME' ? 'Homme' : r.gender === 'FEMME' ? 'Femme' : null} />
            <InfoRow icon={Calendar} label="Date de naissance" value={r.birthDate ? new Date(r.birthDate).toLocaleDateString('fr-FR') : null} />
            <InfoRow icon={FileText} label="Pièce d'identité" value={r.idDocumentType} />
          </div>

          {/* Localisation */}
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Localisation</h4>
            <InfoRow icon={MapPin} label="Adresse" value={r.address} />
            <InfoRow icon={MapPin} label="Ville" value={r.city} />
            <InfoRow icon={MapPin} label="Commune" value={r.commune} />
            <InfoRow icon={Globe} label="Pays" value={r.country} />
          </div>

          {/* Contacts */}
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2"><Phone className="w-4 h-4" /> Contacts</h4>
            <InfoRow icon={Phone} label="Fixe" value={r.phoneFix} />
            <InfoRow icon={Phone} label="Mobile" value={r.phoneMobile} />
            <InfoRow icon={Globe} label="WhatsApp" value={r.whatsapp} />
            <InfoRow icon={Mail} label="Email" value={r.email} />
          </div>

          {/* Entreprise */}
          {r.clientType === 'ENTREPRISE' && (
            <div className="glass-card rounded-2xl p-5">
              <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" /> Entreprise</h4>
              <InfoRow icon={Building2} label="Nom" value={r.companyName} />
              <InfoRow icon={Briefcase} label="Statut juridique" value={r.legalStatus} />
              <InfoRow icon={Briefcase} label="Secteur" value={r.sector} />
              {r.companyDescription && <p className="text-xs text-gray-400 mt-2 bg-white dark:bg-[#1f1f1f]/5 rounded-lg p-3">{r.companyDescription}</p>}
            </div>
          )}

          {/* RDV */}
          {r.rdvSubject && (
            <div className="glass-card rounded-2xl p-5">
              <h4 className="text-sm font-bold text-red-400 mb-3 flex items-center gap-2"><Calendar className="w-4 h-4" /> Rendez-vous</h4>
              <InfoRow icon={Calendar} label="Objet" value={r.rdvSubject} />
              <InfoRow icon={Calendar} label="Date" value={r.rdvDate ? new Date(r.rdvDate).toLocaleDateString('fr-FR') : null} />
              <InfoRow icon={Clock} label="Heure" value={r.rdvTime} />
              <InfoRow icon={Briefcase} label="Mode" value={r.rdvMode} />
              {r.rdvDescription && <p className="text-xs text-gray-400 mt-2 bg-white dark:bg-[#1f1f1f]/5 rounded-lg p-3">{r.rdvDescription}</p>}
            </div>
          )}
        </div>

        {/* Signatures */}
        {(r.clientSignatureUrl || r.commercialSignatureUrl) && (
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-sm font-bold text-purple-400 mb-4 flex items-center gap-2">✍️ Signatures</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {r.clientSignatureUrl && (
                <div className="bg-white dark:bg-[#1f1f1f]/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-2">Signature Client</p>
                  <img src={r.clientSignatureUrl} alt="Signature client" className="max-h-24 mx-auto rounded" />
                </div>
              )}
              {r.commercialSignatureUrl && (
                <div className="bg-white dark:bg-[#1f1f1f]/5 rounded-xl p-3 text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-bold mb-2">Signature Commercial</p>
                  <img src={r.commercialSignatureUrl} alt="Signature commercial" className="max-h-24 mx-auto rounded" />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pièce d'identité */}
        {(r.idDocumentUrlRecto || r.idDocumentUrlVerso || r.idDocumentUrl) && (
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Pièce d'identité ({r.idDocumentType || 'Document'})</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {r.idDocumentUrlRecto && (
                <a href={r.idDocumentUrlRecto} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 bg-white dark:bg-[#1f1f1f]/5 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-xl p-4 transition-all">
                  <Download className="w-5 h-5 text-orange-400" />
                  <span className="text-sm text-gray-300 font-medium">Télécharger le Recto</span>
                </a>
              )}
              {r.idDocumentUrlVerso && (
                <a href={r.idDocumentUrlVerso} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 bg-white dark:bg-[#1f1f1f]/5 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-xl p-4 transition-all">
                  <Download className="w-5 h-5 text-orange-400" />
                  <span className="text-sm text-gray-300 font-medium">Télécharger le Verso</span>
                </a>
              )}
              {r.idDocumentUrl && !r.idDocumentUrlRecto && (
                <a href={r.idDocumentUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 bg-white dark:bg-[#1f1f1f]/5 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-xl p-4 transition-all">
                  <Download className="w-5 h-5 text-orange-400" />
                  <span className="text-sm text-gray-300 font-medium">Télécharger la pièce d'identité</span>
                </a>
              )}
            </div>
          </div>
        )}


        {/* Documents */}
        {r.documents.length > 0 && (
          <div className="glass-card rounded-2xl p-5">
            <h4 className="text-sm font-bold text-orange-400 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Documents légaux ({r.documents.length})</h4>
            <div className="space-y-2">
              {r.documents.map(doc => (
                <a key={doc.id} href={doc.url} target="_blank" rel="noreferrer"
                  className="flex items-center gap-3 bg-white dark:bg-[#1f1f1f]/5 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-xl p-3 transition-all">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-gray-300 flex-1">{doc.title}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400">{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</span>
                  <Download className="w-4 h-4 text-gray-400" />
                </a>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-3xl p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-linear-to-bl from-orange-500/10 to-transparent rounded-bl-full" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-lg">

            <Briefcase className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Clients Commerciaux</h1>
            <p className="text-sm text-gray-400">Enregistrements clients par commercial</p>
          </div>
        </div>
      </motion.div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {view === 'folders' && renderFolders()}
          {view === 'list' && renderList()}
          {view === 'detail' && renderDetail()}
        </AnimatePresence>
      )}
    </div>
  );
};

export default ClientRegistrationAdmin;
