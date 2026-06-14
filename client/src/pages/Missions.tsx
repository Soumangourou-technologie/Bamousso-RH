import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Plus, CheckCircle, FileText, X, Search, FileSpreadsheet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../utils/api';
import SignatureCanvas from 'react-signature-canvas';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import DeliveryMapModal from '../components/DeliveryMapModal';

interface Mission {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  clientName: string;
  clientPhone: string;
  address: string;
  dueDate: string;
  validationMode: string;
  signatureUrl: string;
  validatedAt: string;
  assignedTo: { firstName: string; lastName: string; role: string; id: string };
  createdBy: { firstName: string; lastName: string; id: string };
  createdAt: string;
}

const Missions = () => {
  const { type } = useParams<{ type: string }>(); // 'livraison' ou 'prospection'
  const missionType = type?.toUpperCase() || 'LIVRAISON';
  const { user } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showValidateModal, setShowValidateModal] = useState<Mission | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [showMapModal, setShowMapModal] = useState(false);

  // Validation Form State
  const sigPad = useRef<SignatureCanvas>(null);
  const [validationMode, setValidationMode] = useState<'SIGNATURE' | 'CHECKBOX'>('SIGNATURE');
  const [checkboxConfirmed, setCheckboxConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    clientName: '',
    clientPhone: '',
    address: '',
    dueDate: '',
    assignedToId: ''
  });

  const canManage = user?.role === 'SUPER_ADMIN' || user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER';

  useEffect(() => {
    fetchMissions();
    if (canManage) fetchEmployees();
  }, [missionType]);

  const fetchMissions = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/missions?type=${missionType}`);
      setMissions(res.data);
    } catch (error) {
      console.error("Error fetching missions", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      // Pour LIVRAISON, chercher les LIVREURs. Pour PROSPECTION, chercher les COMMERCIALs.
      // On prend tous les employés par simplicité pour que l'admin choisisse.
      const res = await api.get('/employees');
      setEmployees(res.data);
    } catch (error) {
      console.error("Error fetching employees", error);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/missions', { ...formData, type: missionType });
      setShowAddModal(false);
      setFormData({ title: '', description: '', clientName: '', clientPhone: '', address: '', dueDate: '', assignedToId: '' });
      fetchMissions();
    } catch (error) {
      console.error("Error creating mission", error);
      alert("Erreur lors de la création de la mission.");
    }
  };

  const handleValidate = async () => {
    if (!showValidateModal) return;
    
    let signatureUrl = null;
    if (validationMode === 'SIGNATURE') {
      if (sigPad.current?.isEmpty()) {
        alert("Veuillez fournir une signature.");
        return;
      }
      signatureUrl = sigPad.current?.getTrimmedCanvas().toDataURL('image/png');
    } else {
      if (!checkboxConfirmed) {
        alert("Veuillez cocher la case de confirmation.");
        return;
      }
    }

    if (!window.confirm("Confirmez-vous la validation définitive de cette mission ?")) return;

    try {
      setIsSubmitting(true);
      await api.put(`/missions/${showValidateModal.id}/validate`, {
        validationMode,
        signatureUrl
      });
      setShowValidateModal(null);
      fetchMissions();
    } catch (error) {
      console.error("Error validating mission", error);
      alert("Erreur lors de la validation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const exportPDF = (mission: Mission) => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text(`Rapport de ${mission.type === 'LIVRAISON' ? 'Livraison' : 'Prospection'}`, 14, 22);
    
    doc.setFontSize(12);
    doc.text(`Titre: ${mission.title}`, 14, 32);
    doc.text(`Client: ${mission.clientName || 'N/A'} - Tel: ${mission.clientPhone || 'N/A'}`, 14, 40);
    doc.text(`Adresse: ${mission.address || 'N/A'}`, 14, 48);
    doc.text(`Assigné à: ${mission.assignedTo?.firstName} ${mission.assignedTo?.lastName}`, 14, 56);
    doc.text(`Statut: ${mission.status}`, 14, 64);
    
    if (mission.status === 'VALIDEE') {
      doc.text(`Validé le: ${new Date(mission.validatedAt).toLocaleString()}`, 14, 72);
      doc.text(`Mode de validation: ${mission.validationMode}`, 14, 80);
      
      if (mission.validationMode === 'SIGNATURE' && mission.signatureUrl) {
        doc.text("Signature du client:", 14, 90);
        doc.addImage(mission.signatureUrl, 'PNG', 14, 95, 80, 40);
      }
    }

    doc.save(`mission_${mission.id.substring(0, 8)}.pdf`);
  };

  const exportExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Missions");

    worksheet.columns = [
      { header: 'ID', key: 'ID', width: 15 },
      { header: 'Titre', key: 'Titre', width: 25 },
      { header: 'Type', key: 'Type', width: 15 },
      { header: 'Client', key: 'Client', width: 20 },
      { header: 'Téléphone', key: 'Téléphone', width: 15 },
      { header: 'Adresse', key: 'Adresse', width: 30 },
      { header: 'Assigné', key: 'Assigné', width: 20 },
      { header: 'Statut', key: 'Statut', width: 15 },
      { header: 'ValidationMode', key: 'ValidationMode', width: 15 },
      { header: 'DateValidation', key: 'DateValidation', width: 20 },
    ];

    filteredMissions.forEach(m => {
      worksheet.addRow({
        ID: m.id.substring(0, 8),
        Titre: m.title,
        Type: m.type,
        Client: m.clientName || '-',
        Téléphone: m.clientPhone || '-',
        Adresse: m.address || '-',
        Assigné: `${m.assignedTo?.firstName} ${m.assignedTo?.lastName}`,
        Statut: m.status,
        ValidationMode: m.validationMode || '-',
        DateValidation: m.validatedAt ? new Date(m.validatedAt).toLocaleString() : '-'
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Missions_${missionType}.xlsx`);
  };

  const filteredMissions = missions.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (m.clientName && m.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">
            Gestion des {missionType === 'LIVRAISON' ? 'Livraisons' : 'Prospections'}
          </h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium mt-1">
            {canManage ? 'Gérez et assignez les missions sur le terrain.' : 'Consultez et validez vos missions en cours.'}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {canManage && (
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center justify-center gap-2 bg-brand-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-brand-primary/90 transition-all w-full md:w-auto"
            >
              <Plus className="w-5 h-5" />
              Nouvelle Mission
            </button>
          )}
          {canManage && (
             <button
             onClick={exportExcel}
             className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition-all w-full md:w-auto"
           >
             <FileSpreadsheet className="w-5 h-5" />
             Export Excel
           </button>
          )}
          {canManage && missionType === 'LIVRAISON' && (
            <button
              onClick={() => setShowMapModal(true)}
              className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all w-full md:w-auto"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="18"></line><line x1="15" y1="6" x2="15" y2="21"></line></svg>
              Carte en direct
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par titre ou nom de client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-[#1a0f0a] border border-gray-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-brand-primary outline-none text-gray-900 dark:text-white font-medium"
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
           <div className="w-8 h-8 border-4 border-brand-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMissions.map((mission) => (
            <div key={mission.id} className="bg-white dark:bg-[#1a0f0a] border border-gray-200 dark:border-white/10 rounded-2xl p-6 shadow-sm flex flex-col gap-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-lg">{mission.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mission.description}</p>
                </div>
                <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  mission.status === 'VALIDEE' ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400' : 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400'
                }`}>
                  {mission.status}
                </span>
              </div>
              
              <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl space-y-2 text-sm">
                <p><span className="text-gray-500 dark:text-gray-400">Client:</span> <span className="font-medium text-gray-900 dark:text-white">{mission.clientName || '-'}</span></p>
                <p><span className="text-gray-500 dark:text-gray-400">Adresse:</span> <span className="font-medium text-gray-900 dark:text-white">{mission.address || '-'}</span></p>
                <p><span className="text-gray-500 dark:text-gray-400">Téléphone:</span> <span className="font-medium text-gray-900 dark:text-white">{mission.clientPhone || '-'}</span></p>
                {canManage && <p><span className="text-gray-500 dark:text-gray-400">Assigné à:</span> <span className="font-bold text-brand-primary">{mission.assignedTo?.firstName} {mission.assignedTo?.lastName}</span></p>}
              </div>

              <div className="flex justify-end gap-2 mt-auto pt-4">
                {canManage && mission.status === 'VALIDEE' && (
                  <button onClick={() => exportPDF(mission)} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-600 hover:bg-red-500/20 rounded-lg text-sm font-bold transition-colors">
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                )}
                {!canManage && mission.status !== 'VALIDEE' && (
                  <button onClick={() => setShowValidateModal(mission)} className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white py-2 rounded-xl font-bold hover:bg-brand-primary/90 transition-all">
                    <CheckCircle className="w-5 h-5" /> Valider
                  </button>
                )}
              </div>
            </div>
          ))}
          {filteredMissions.length === 0 && (
            <div className="col-span-full py-12 text-center text-gray-500 font-medium">
              Aucune mission trouvée.
            </div>
          )}
        </div>
      )}

      {/* CREATE MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-[#1a0f0a] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10">
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Nouvelle Mission</h2>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <form onSubmit={handleCreate} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Titre de la mission *</label>
                  <input required type="text" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border-none text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nom du Client</label>
                  <input type="text" value={formData.clientName} onChange={e => setFormData({...formData, clientName: e.target.value})} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border-none text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/50" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Téléphone Client</label>
                    <input type="text" value={formData.clientPhone} onChange={e => setFormData({...formData, clientPhone: e.target.value})} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border-none text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/50" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Date d'échéance</label>
                    <input type="date" value={formData.dueDate} onChange={e => setFormData({...formData, dueDate: e.target.value})} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border-none text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/50" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Adresse</label>
                  <input type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border-none text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/50" />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Assigner à *</label>
                  <select required value={formData.assignedToId} onChange={e => setFormData({...formData, assignedToId: e.target.value})} className="w-full p-3 rounded-xl bg-gray-50 dark:bg-white/5 border-none text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/50">
                    <option value="">Sélectionner un employé</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.role})</option>
                    ))}
                  </select>
                </div>
                <button type="submit" className="w-full p-4 bg-brand-primary text-white rounded-xl font-bold mt-4">Créer la mission</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VALIDATE MODAL */}
      <AnimatePresence>
        {showValidateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowValidateModal(null)} />
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative bg-white dark:bg-[#1a0f0a] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-gray-200 dark:border-white/10">
              <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Validation Mission</h2>
                <button onClick={() => setShowValidateModal(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-6">
                
                <div className="flex gap-4 p-1 bg-gray-100 dark:bg-white/5 rounded-xl">
                  <button onClick={() => setValidationMode('SIGNATURE')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${validationMode === 'SIGNATURE' ? 'bg-white dark:bg-[#1a0f0a] shadow text-brand-primary' : 'text-gray-500'}`}>
                    Signature Client
                  </button>
                  <button onClick={() => setValidationMode('CHECKBOX')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-colors ${validationMode === 'CHECKBOX' ? 'bg-white dark:bg-[#1a0f0a] shadow text-brand-primary' : 'text-gray-500'}`}>
                    Confirmation simple
                  </button>
                </div>

                {validationMode === 'SIGNATURE' ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Faites signer le client ci-dessous :</label>
                    <div className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-xl overflow-hidden bg-white touch-none">
                      <SignatureCanvas 
                        ref={sigPad}
                        canvasProps={{ className: 'w-full h-48' }}
                        penColor="black"
                      />
                    </div>
                    <button onClick={() => sigPad.current?.clear()} className="text-sm font-bold text-brand-primary underline">Effacer la signature</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-white/5 rounded-xl">
                    <input 
                      type="checkbox" 
                      id="confirm" 
                      checked={checkboxConfirmed} 
                      onChange={e => setCheckboxConfirmed(e.target.checked)} 
                      className="w-5 h-5 rounded text-brand-primary focus:ring-brand-primary"
                    />
                    <label htmlFor="confirm" className="text-sm font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                      Je confirme que cette mission a été menée à bien et que le client a été livré / visité.
                    </label>
                  </div>
                )}

                <button 
                  onClick={handleValidate} 
                  disabled={isSubmitting}
                  className="w-full p-4 bg-brand-primary text-white rounded-xl font-black mt-4 shadow-lg shadow-brand-primary/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Validation en cours...' : 'Valider définitivement'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMapModal && <DeliveryMapModal onClose={() => setShowMapModal(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default Missions;
