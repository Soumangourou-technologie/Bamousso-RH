import { motion, AnimatePresence } from 'framer-motion';
import { FileWarning, Send, History, CheckCircle2, AlertCircle, X, MessageSquare } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface Explanation {
  id: string;
  title: string;
  description: string;
  response: string | null;
  status: 'PENDING' | 'RESPONDED' | 'CLOSED';
  createdAt: string;
  employeeId: string;
  employee: { firstName: string, lastName: string };
  creator: { firstName: string, lastName: string };
}

const Explanations = () => {
  const { user } = useAuth();
  const [explanations, setExplanations] = useState<Explanation[]>([]);
  const [employees, setEmployees] = useState<{id: string, firstName: string, lastName: string}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedExplanation, setSelectedExplanation] = useState<Explanation | null>(null);
  const [responseText, setResponseText] = useState('');
  
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    employeeId: ''
  });

  const isAdmin = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER';

  const fetchExplanations = async () => {
    try {
      const res = await api.get('/explanations');
      setExplanations(res.data);
    } catch (error) {
      console.error('Error fetching explanations', error);
    }
  };

  const fetchEmployees = async () => {
    if (isAdmin) {
      try {
        const res = await api.get('/employees');
        setEmployees(res.data);
      } catch (error) {
        console.error('Error fetching employees', error);
      }
    }
  };

  const refreshAll = () => {
    void fetchExplanations();
    void fetchEmployees();
  };

  useEffect(() => {
    refreshAll();
    window.addEventListener('app:refresh', refreshAll);
    return () => window.removeEventListener('app:refresh', refreshAll);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/explanations', newRequest);
      setIsModalOpen(false);
      setNewRequest({ title: '', description: '', employeeId: '' });
      void fetchExplanations();
      alert('Demande d\'explication envoyée.');
    } catch (error) {
      console.error('Error creating explanation', error);
    }
  };

  const handleRespond = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExplanation) return;
    try {
      await api.patch(`/explanations/${selectedExplanation.id}/respond`, { response: responseText });
      setSelectedExplanation(null);
      setResponseText('');
      void fetchExplanations();
      alert('Votre réponse a été envoyée.');
    } catch (error) {
      console.error('Error responding to explanation', error);
    }
  };

  const handleClose = async (id: string) => {
    try {
      await api.patch(`/explanations/${id}/close`);
      void fetchExplanations();
    } catch (error) {
      console.error('Error closing explanation', error);
    }
  };

  const pendingCount = explanations.filter(e => e.status === 'PENDING' || e.status === 'RESPONDED').length;
  const closedCount = explanations.filter(e => e.status === 'CLOSED').length;

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Demandes d'Explication</h1>
          <p className="text-gray-400 font-medium mt-1">Gérez les procédures disciplinaires avec rigueur et transparence.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-primary text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-brand-primary/20 flex items-center gap-2"
          >
            <Send className="w-5 h-5" /> Nouvelle Demande
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="glass-card p-8 rounded-[2rem] border border-white/5">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">En cours</p>
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <p className="text-3xl font-black text-white">{pendingCount}</p>
          </div>
        </div>
        <div className="glass-card p-8 rounded-[2rem] border border-white/5">
          <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1">Clôturées</p>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <p className="text-3xl font-black text-white">{closedCount}</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-10 rounded-[2.5rem] border border-white/5 overflow-hidden">
        <div className="flex items-center gap-4 mb-10">
          <History className="w-6 h-6 text-brand-primary" />
          <h2 className="text-2xl font-black text-white tracking-tight">Historique des Demandes</h2>
        </div>
        
        <div className="space-y-4">
          {explanations.map((exp) => (
            <div key={exp.id} className="p-8 bg-white/5 rounded-3xl border border-white/10 flex flex-col md:flex-row justify-between items-center gap-6 group hover:bg-white/10 transition-all">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  <FileWarning className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">{exp.title}</h3>
                  <p className="text-sm text-gray-500">{isAdmin ? `Pour : ${exp.employee.firstName} ${exp.employee.lastName}` : `Par : ${exp.creator.firstName} ${exp.creator.lastName}`}</p>
                  <p className="text-xs text-gray-600 mt-1">{new Date(exp.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  exp.status === 'PENDING' ? 'bg-amber-500/10 text-amber-500' :
                  exp.status === 'RESPONDED' ? 'bg-blue-500/10 text-blue-500' :
                  'bg-emerald-500/10 text-emerald-500'
                }`}>
                  {exp.status === 'PENDING' ? 'En attente' : exp.status === 'RESPONDED' ? 'Répondu' : 'Clôturé'}
                </span>
                
                <button 
                  onClick={() => setSelectedExplanation(exp)}
                  className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all"
                >
                  <MessageSquare className="w-5 h-5" />
                </button>

                {isAdmin && exp.status === 'RESPONDED' && (
                  <button 
                    onClick={() => handleClose(exp.id)}
                    className="p-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-all"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {explanations.length === 0 && (
            <div className="py-20 text-center">
              <p className="text-gray-600 font-bold italic">Aucune demande d'explication.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Nouvelle Demande */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-brand-900 border border-white/10 p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              <h2 className="text-2xl font-black text-white mb-6">Nouvelle Demande</h2>
              <form onSubmit={handleCreate} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Employé concerné</label>
                  <select required value={newRequest.employeeId} onChange={e => setNewRequest({...newRequest, employeeId: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary appearance-none">
                    <option value="" className="bg-brand-900">Choisir...</option>
                    {employees.map(emp => (
                      <option key={emp.id} value={emp.id} className="bg-brand-900">{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Objet du manquement</label>
                  <input required value={newRequest.title} onChange={e => setNewRequest({...newRequest, title: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary" placeholder="ex: Absence injustifiée du 25/04" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Description détaillée</label>
                  <textarea required value={newRequest.description} onChange={e => setNewRequest({...newRequest, description: e.target.value})} className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-medium outline-none focus:ring-2 focus:ring-brand-primary h-32 resize-none" placeholder="Veuillez expliquer les faits..." />
                </div>
                <button type="submit" className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-primary/20">
                  Envoyer la demande
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Voir/Répondre */}
      <AnimatePresence>
        {selectedExplanation && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedExplanation(null)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-brand-900 border border-white/10 p-8 rounded-[2.5rem] max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh]">
              <button onClick={() => setSelectedExplanation(null)} className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-black text-white mb-2">{selectedExplanation.title}</h2>
                  <p className="text-gray-400 font-medium">{selectedExplanation.description}</p>
                </div>

                <div className="p-6 bg-white/5 rounded-2xl border border-white/10">
                  <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Réponse de l'employé</h3>
                  {selectedExplanation.response ? (
                    <p className="text-white font-medium italic">"{selectedExplanation.response}"</p>
                  ) : (
                    <p className="text-gray-600 italic">En attente de réponse...</p>
                  )}
                </div>

                {!isAdmin && selectedExplanation.status === 'PENDING' && (
                  <form onSubmit={handleRespond} className="space-y-4">
                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest">Votre explication</label>
                    <textarea 
                      required 
                      value={responseText} 
                      onChange={e => setResponseText(e.target.value)} 
                      className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-medium outline-none focus:ring-2 focus:ring-brand-primary h-32 resize-none" 
                      placeholder="Tapez votre réponse ici..." 
                    />
                    <button type="submit" className="w-full bg-brand-primary text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest">
                      Envoyer ma réponse
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Explanations;
