import { useState, useEffect } from 'react';
import { ShieldAlert, PlusCircle, User } from 'lucide-react';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

interface Case {
  id: string;
  title: string;
  description: string;
  status: string;
  createdAt: string;
  involvedEmployee: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

interface Employee {
  id: string;
  firstName: string;
  lastName: string;
}

const ConflictsPage = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCase, setNewCase] = useState({ title: '', description: '', involvedEmployeeId: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [casesRes, employeesRes] = await Promise.all([
        api.get('/conflicts'),
        api.get('/employees') 
      ]);
      setCases(casesRes.data);
      setEmployees(employeesRes.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des données", error);
    }
    setIsLoading(false);
  };

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCase.title || !newCase.description || !newCase.involvedEmployeeId) {
      alert('Veuillez remplir tous les champs.');
      return;
    }
    try {
      await api.post('/conflicts', newCase);
      setIsModalOpen(false);
      setNewCase({ title: '', description: '', involvedEmployeeId: '' });
      fetchData(); // Recharger les données
    } catch (error) {
      console.error("Erreur lors de la création du cas", error);
      alert('Une erreur est survenue.');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          Gestion des Conflits
        </h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-red-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-red-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          Ouvrir un dossier
        </button>
      </div>

      {isLoading ? (
        <p>Chargement...</p>
      ) : cases.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
          <p className="text-gray-500">Aucun cas disciplinaire ouvert pour le moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cases.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-start">
                <h2 className="text-lg font-bold text-gray-800 dark:text-white">{c.title}</h2>
                <span className={`px-2 py-1 text-xs font-bold rounded-full ${c.status === 'OPEN' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                  {c.status}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Ouvert le {formatDate(c.createdAt)}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mt-4 line-clamp-2">{c.description}</p>
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-gray-400"/>
                <span className="font-semibold">{c.involvedEmployee.firstName} {c.involvedEmployee.lastName}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {isModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-lg p-8"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6">Ouvrir un nouveau dossier</h2>
              <form onSubmit={handleCreateCase} className="space-y-4">
                <input 
                  type="text" 
                  placeholder="Titre du dossier"
                  value={newCase.title}
                  onChange={e => setNewCase({ ...newCase, title: e.target.value })}
                  className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <textarea 
                  placeholder="Description détaillée des faits"
                  rows={5}
                  value={newCase.description}
                  onChange={e => setNewCase({ ...newCase, description: e.target.value })}
                  className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <select
                  value={newCase.involvedEmployeeId}
                  onChange={e => setNewCase({ ...newCase, involvedEmployeeId: e.target.value })}
                  className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-red-500"
                >
                  <option value="" disabled>Sélectionner l'employé concerné</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                  ))}
                </select>
                <div className="flex justify-end gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="py-2 px-4 rounded-lg text-gray-600 dark:text-gray-300">Annuler</button>
                  <button type="submit" className="py-2 px-6 rounded-lg bg-red-600 text-white font-semibold">Créer</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ConflictsPage;
