import { motion, AnimatePresence } from 'framer-motion';
import { ListTodo, Plus, Clock, CheckCircle2, Trash2, User, Calendar as CalendarIcon, X, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'A_FAIRE' | 'EN_COURS' | 'TERMINEE';
  dueDate: string;
  assignedToId?: string;
  assignedTo?: {
    firstName: string;
    lastName: string;
  };
  createdBy: string;
}

const Tasks = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [employees, setEmployees] = useState<{id: string, firstName: string, lastName: string}[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<string | null>(null);
  
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assignedToId: '',
    dueDate: ''
  });

  const isAdmin = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER';

  const fetchTasks = async () => {
    try {
      const res = await api.get('/tasks');
      setTasks(res.data);
    } catch (error) {
      console.error('Error fetching tasks', error);
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
    void fetchTasks();
    void fetchEmployees();
  };

  useEffect(() => {
    refreshAll();
    window.addEventListener('app:refresh', refreshAll);
    return () => window.removeEventListener('app:refresh', refreshAll);
  }, []);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/tasks', newTask);
      setIsModalOpen(false);
      setNewTask({ title: '', description: '', assignedToId: '', dueDate: '' });
      void fetchTasks();
    } catch (error) {
      console.error('Error creating task', error);
      alert('Erreur lors de la création de la tâche');
    }
  };

  const handleDeleteTask = async (id: string) => {
    if (!window.confirm('Supprimer cette tâche ?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      void fetchTasks();
    } catch (error) {
      console.error('Error deleting task', error);
    }
  };

  const updateTaskStatus = async (id: string, status: string) => {
    try {
      await api.put(`/tasks/${id}`, { status });
      void fetchTasks();
      if (status === 'TERMINEE') {
        // Optionnel: Envoyer notification à l'admin (géré par le backend idéalement)
      }
    } catch (error) {
      console.error('Error updating task status', error);
    }
  };

  const confirmComplete = (id: string) => {
    setTaskToComplete(id);
    setIsConfirmOpen(true);
  };

  const handleComplete = async () => {
    if (taskToComplete) {
      await updateTaskStatus(taskToComplete, 'TERMINEE');
      setIsConfirmOpen(false);
      setTaskToComplete(null);
    }
  };

  const tasksByStatus = (status: string) => tasks.filter(t => t.status === status);

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Gestion des Tâches</h1>
          <p className="text-gray-400 font-medium mt-1">Organisez le travail de vos équipes au quotidien.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-primary hover:bg-brand-800 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" /> Nouvelle Tâche
          </button>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Colonne À Faire */}
        <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 min-h-125">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
              <Clock className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white">À Faire</h2>
          </div>
          <div className="space-y-4">
            {tasksByStatus('A_FAIRE').map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                isAdmin={isAdmin} 
                onDelete={() => handleDeleteTask(task.id)}
                onMove={() => updateTaskStatus(task.id, 'EN_COURS')}
                moveLabel="Démarrer"
              />
            ))}
            {tasksByStatus('A_FAIRE').length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm font-bold italic text-center py-10">Aucune tâche en attente.</p>
            )}
          </div>
        </div>

        {/* Colonne En Cours */}
        <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 min-h-125">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
              <ListTodo className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white">En Cours</h2>
          </div>
          <div className="space-y-4">
            {tasksByStatus('EN_COURS').map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                isAdmin={isAdmin} 
                onDelete={() => handleDeleteTask(task.id)}
                onMove={() => isAdmin ? updateTaskStatus(task.id, 'TERMINEE') : confirmComplete(task.id)}
                moveLabel="Terminer"
              />
            ))}
            {tasksByStatus('EN_COURS').length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm font-bold italic text-center py-10">Aucune tâche en cours.</p>
            )}
          </div>
        </div>

        {/* Colonne Terminé */}
        <div className="glass-card p-8 rounded-[2.5rem] border border-white/5 min-h-125">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-black text-white">Terminé</h2>
          </div>
          <div className="space-y-4">
            {tasksByStatus('TERMINEE').map(task => (
              <TaskCard 
                key={task.id} 
                task={task} 
                isAdmin={isAdmin} 
                onDelete={() => handleDeleteTask(task.id)}
                isCompleted
              />
            ))}
            {tasksByStatus('TERMINEE').length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-sm font-bold italic text-center py-10">Historique vide.</p>
            )}
          </div>
        </div>
      </div>

      {/* Modal Nouvelle Tâche */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsModalOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-brand-900 border border-white/10 p-8 rounded-[2.5rem] max-w-lg w-full shadow-2xl">
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-500 dark:text-gray-400 hover:text-white transition-colors"><X className="w-6 h-6" /></button>
              <h2 className="text-2xl font-black text-white mb-6">Nouvelle Tâche</h2>
              <form onSubmit={handleCreateTask} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Titre de la tâche</label>
                  <input required value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-white dark:bg-[#1f1f1f]/5 border border-white/10 p-4 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary" placeholder="ex: Préparer les contrats" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Description</label>
                  <textarea value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full bg-white dark:bg-[#1f1f1f]/5 border border-white/10 p-4 rounded-2xl text-gray-900 dark:text-white font-medium outline-none focus:ring-2 focus:ring-brand-primary h-24 resize-none" placeholder="Détails supplémentaires..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Assigner à</label>
                    <select required value={newTask.assignedToId} onChange={e => setNewTask({...newTask, assignedToId: e.target.value})} className="w-full bg-white dark:bg-[#1f1f1f]/5 border border-white/10 p-4 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary appearance-none">
                      <option value="" className="bg-brand-900">Choisir...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id} className="bg-brand-900">{emp.firstName} {emp.lastName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Échéance</label>
                    <input type="date" required value={newTask.dueDate} onChange={e => setNewTask({...newTask, dueDate: e.target.value})} className="w-full bg-white dark:bg-[#1f1f1f]/5 border border-white/10 p-4 rounded-2xl text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary" />
                  </div>
                </div>
                <button type="submit" className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-primary/20">
                  Créer la tâche
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmation Fin de Tâche */}
      <AnimatePresence>
        {isConfirmOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsConfirmOpen(false)} className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="relative bg-brand-900 border border-white/10 p-8 rounded-4xl max-w-sm w-full text-center shadow-2xl">
              <div className="w-20 h-20 bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Terminer la tâche ?</h3>
              <p className="text-gray-400 text-sm mb-8">Une fois marquée comme terminée, vous ne pourrez plus revenir en arrière. L'administrateur sera notifié.</p>
              <div className="flex gap-4">
                <button onClick={() => setIsConfirmOpen(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-gray-600 dark:text-gray-400 hover:bg-white dark:bg-[#1f1f1f]/5 transition-colors">Annuler</button>
                <button onClick={handleComplete} className="flex-1 px-6 py-3 bg-brand-primary text-white rounded-xl font-bold shadow-lg shadow-brand-primary/20">Confirmer</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TaskCard = ({ task, isAdmin, onDelete, onMove, moveLabel, isCompleted }: { task: Task, isAdmin: boolean, onDelete: () => void, onMove?: () => void, moveLabel?: string, isCompleted?: boolean }) => (
  <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 bg-white dark:bg-[#1f1f1f]/5 rounded-3xl border border-white/10 hover:border-white/20 transition-all group relative">
    {isAdmin && (
      <button onClick={onDelete} className="absolute top-4 right-4 text-gray-600 dark:text-gray-400 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-4 h-4" /></button>
    )}
    <h3 className="text-white font-bold mb-2 pr-6 line-clamp-2">{task.title}</h3>
    {task.description && <p className="text-gray-500 dark:text-gray-400 text-xs mb-4 line-clamp-2">{task.description}</p>}
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        <User className="w-3 h-3 text-brand-primary" /> {task.assignedTo ? `${task.assignedTo.firstName} ${task.assignedTo.lastName}` : 'Non assigné'}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
        <CalendarIcon className="w-3 h-3 text-amber-500" /> {new Date(task.dueDate).toLocaleDateString('fr-FR')}
      </div>
    </div>
    {!isCompleted && !isAdmin && onMove && (
      <button 
        onClick={onMove}
        className="mt-6 w-full py-2.5 bg-white dark:bg-[#1f1f1f]/5 hover:bg-brand-primary text-[10px] font-black text-gray-900 dark:text-white uppercase tracking-[0.2em] rounded-xl border border-white/10 hover:border-brand-primary transition-all"
      >
        {moveLabel} →
      </button>
    )}
  </motion.div>
);

export default Tasks;
