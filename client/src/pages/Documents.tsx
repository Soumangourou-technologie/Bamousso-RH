import { useEffect, useState } from 'react';
import api, { getFileUrl } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { FileText, Upload, Download, FileType, Search } from 'lucide-react';
import { motion } from 'framer-motion';

interface Document {
  id: string;
  title: string;
  type: 'PAYSLIP' | 'CONTRACT' | 'POLICY' | 'OTHER';
  url: string;
  createdAt: string;
  employee?: {
    firstName: string;
    lastName: string;
  };
}

const DocumentsPage = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  
  // States for upload form
  const [title, setTitle] = useState('');
  const [type, setType] = useState('PAYSLIP');
  const [employeeId, setEmployeeId] = useState('');
  const [file, setFile] = useState<File | null>(null);
  
  const [employees, setEmployees] = useState<{id: string, firstName: string, lastName: string}[]>([]);

  const fetchDocuments = async () => {
    try {
      const res = await api.get<Document[]>('/documents');
      setDocuments(res.data);
    } catch (error) {
      console.error('Error fetching documents', error);
    }
  };

  const fetchEmployees = async () => {
    if (canManage) {
      try {
        const res = await api.get('/employees');
        setEmployees(res.data);
      } catch (error) {
        console.error('Error fetching employees', error);
      }
    }
  };

  const canManage = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'HR_ASSISTANT' || user?.role === 'RH';

  const refreshAll = () => {
    void fetchDocuments();
    void fetchEmployees();
  };

  useEffect(() => {
    refreshAll();
    window.addEventListener('app:refresh', refreshAll);
    return () => window.removeEventListener('app:refresh', refreshAll);
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Veuillez sélectionner un fichier.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('type', type);
      formData.append('employeeId', employeeId);
      formData.append('document', file);

      await api.post('/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setIsUploading(false);
      setTitle('');
      setFile(null);
      void fetchDocuments();
    } catch (error: any) {
      console.error('Error uploading document', error);
      const msg = error.response?.data?.message || "Erreur lors de l'envoi du document.";
      alert(msg);
    }
  };


  const getTypeColor = (docType: string) => {
    switch (docType) {
      case 'PAYSLIP': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'CONTRACT': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'POLICY': return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  const handleDownload = (url: string) => {
    const fullUrl = getFileUrl(url);
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
            <FileText className="w-8 h-8 text-orange-500" /> Coffre-fort Documents
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Retrouvez vos fiches de paie, contrats et documents internes.</p>
        </div>
        {canManage && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsUploading(!isUploading)}
            className="flex items-center gap-2 bg-linear-to-r from-orange-500 to-orange-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-shadow"
          >
            <Upload className="w-5 h-5" /> Ajouter un document
          </motion.button>
        )}
      </div>

      {isUploading && canManage && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Uploader un nouveau document</h2>
          <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Titre du document</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none" placeholder="ex: Fiche de Paie Janvier 2026" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="PAYSLIP">Fiche de Paie</option>
                <option value="CONTRACT">Contrat</option>
                <option value="POLICY">Règlement / Politique</option>
                <option value="OTHER">Autre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employé cible</label>
              <select required value={employeeId} onChange={e => setEmployeeId(e.target.value)} className="w-full p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-orange-500 outline-none">
                <option value="">Sélectionner...</option>
                {employees.map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fichier (PDF, Image...)</label>
              <input 
                type="file" 
                required
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full p-2 rounded-xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-500 text-xs focus:ring-2 focus:ring-orange-500 outline-none"
              />
            </div>
            <div>
              <button type="submit" className="w-full bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 p-2.5 rounded-xl font-semibold hover:opacity-90 transition">
                Confirmer l'ajout
              </button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {documents.map((doc, index) => (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={doc.id}
            className="group bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-150"></div>
            
            <div className="flex items-start justify-between relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                  <FileType className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white line-clamp-1" title={doc.title}>{doc.title}</h3>
                  <div className="text-sm text-gray-500 mt-0.5">{new Date(doc.createdAt).toLocaleDateString('fr-FR')}</div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between relative z-10">
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getTypeColor(doc.type)}`}>
                {doc.type}
              </span>
              
              {canManage && doc.employee && (
                <span className="text-sm text-gray-500 truncate max-w-30">
                  👤 {doc.employee.firstName} {doc.employee.lastName[0]}.
                </span>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center relative z-10">
              <span className="text-xs text-gray-400 font-mono">{doc.id.substring(0, 8)}</span>
              <motion.button 
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => handleDownload(doc.url)}
                className="text-orange-500 hover:text-orange-600 bg-orange-50 dark:bg-gray-700 p-2 rounded-full"
              >
                <Download className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        ))}

        {documents.length === 0 && (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500">
            <Search className="w-16 h-16 text-gray-300 mb-4" />
            <p className="text-lg">Aucun document disponible dans votre coffre-fort.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;
