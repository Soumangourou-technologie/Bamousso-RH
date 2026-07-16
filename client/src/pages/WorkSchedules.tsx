import { motion } from 'framer-motion';
import { Clock, Plus, Trash2, Users, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

interface WorkSchedule {
  id: string;
  name: string;
  type: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  hoursPerDay: number;
  hoursPerWeek: number;
  _count?: { users: number };
}

const WorkSchedules = () => {
  const { user } = useAuth();
  const [schedules, setSchedules] = useState<WorkSchedule[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  const [name, setName] = useState('');
  const [type, setType] = useState('STANDARD');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [breakMinutes, setBreakMinutes] = useState(60);
  const [hoursPerDay, setHoursPerDay] = useState(8);
  const [hoursPerWeek, setHoursPerWeek] = useState(40);

  const canManageHr = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'HR_ASSISTANT' || user?.role === 'RH';

  const [departments, setDepartments] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [assignModal, setAssignModal] = useState<{isOpen: boolean, scheduleId: string | null}>({isOpen: false, scheduleId: null});
  const [assignType, setAssignType] = useState('EMPLOYEE');
  const [selectedAssignId, setSelectedAssignId] = useState('');

  const [createAssignType, setCreateAssignType] = useState('NONE');
  const [createAssignId, setCreateAssignId] = useState('');

  const fetchData = async () => {
    try {
      const [schedRes, depsRes, empsRes] = await Promise.all([
        api.get('/work-schedules'),
        api.get('/departments'),
        api.get('/employees')
      ]);
      setSchedules(schedRes.data);
      setDepartments(depsRes.data);
      setEmployees(empsRes.data.filter((u: any) => u.role !== 'COMPANY_ADMIN' && u.role !== 'SUPER_ADMIN'));
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  useEffect(() => {
    const refreshData = () => {
      if (canManageHr) void fetchData();
    };
    refreshData();
    window.addEventListener('app:refresh', refreshData);
    return () => window.removeEventListener('app:refresh', refreshData);
  }, [canManageHr]);

  if (!canManageHr) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/work-schedules', {
        name, type, startTime, endTime, breakMinutes, hoursPerDay, hoursPerWeek
      });
      
      const newScheduleId = res.data.id;
      
      if (createAssignType === 'EMPLOYEE' && createAssignId) {
        await api.post('/work-schedules/assign', {
          scheduleId: newScheduleId,
          employeeId: createAssignId
        });
      } else if (createAssignType === 'DEPARTMENT' && createAssignId) {
        await api.post('/work-schedules/assign-department', {
          scheduleId: newScheduleId,
          departmentId: createAssignId
        });
      }

      setIsCreating(false);
      setName('');
      setCreateAssignType('NONE');
      setCreateAssignId('');
      
      await fetchData();
    } catch (error) {
      console.error(error);
      alert('Erreur lors de la création');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Supprimer cet horaire ?")) return;
    try {
      await api.delete(`/work-schedules/${id}`);
      void fetchData();
    } catch (error) {
      console.error(error);
      alert('Erreur de suppression');
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignModal.scheduleId || !selectedAssignId) return;
    try {
      let assignedName = '';
      if (assignType === 'EMPLOYEE') {
        const emp = employees.find(e => e.id === selectedAssignId);
        assignedName = emp ? `${emp.firstName} ${emp.lastName}` : "l'employé";
        await api.post('/work-schedules/assign', {
          scheduleId: assignModal.scheduleId,
          employeeId: selectedAssignId
        });
      } else {
        const dep = departments.find(d => d.id === selectedAssignId);
        assignedName = dep ? `le département ${dep.name}` : 'le département';
        await api.post('/work-schedules/assign-department', {
          scheduleId: assignModal.scheduleId,
          departmentId: selectedAssignId
        });
      }
      alert(`Horaire assigné avec succès à ${assignedName} !`);
      setAssignModal({isOpen: false, scheduleId: null});
      setSelectedAssignId('');
      void fetchData();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de l'assignation");
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
            <Clock className="w-10 h-10 text-orange-500" /> Horaires de travail
          </h1>
          <p className="text-gray-500 mt-2">Définissez les règles de temps de travail pour calculer les heures supp.</p>
        </div>
        <button 
          onClick={() => setIsCreating(!isCreating)}
          className="bg-brand-primary text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-brand-primary/90"
        >
          <Plus className="w-5 h-5" /> Nouvel horaire
        </button>
      </motion.div>

      {isCreating && (
        <motion.form 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleCreate}
          className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700"
        >
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Nom de l'horaire</label>
              <input required value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" placeholder="ex: Équipe de nuit 20h-04h" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Type</label>
              <select value={type} onChange={e => setType(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white">
                <option value="STANDARD">Standard</option>
                <option value="SHIFT">Travail posté (Shift)</option>
                <option value="NIGHT">Travail de nuit</option>
                <option value="FLEXIBLE">Flexible</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Heure d'arrivée</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Heure de départ</label>
              <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Pause (min)</label>
              <input type="number" required value={breakMinutes} onChange={e => setBreakMinutes(Number(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Heures/Jour</label>
              <input type="number" step="0.5" required value={hoursPerDay} onChange={e => setHoursPerDay(Number(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Heures/Semaine</label>
              <input type="number" step="0.5" required value={hoursPerWeek} onChange={e => setHoursPerWeek(Number(e.target.value))} className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white" />
            </div>

            <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Assigner automatiquement à</label>
              <select 
                value={createAssignType} 
                onChange={(e) => {
                  setCreateAssignType(e.target.value);
                  setCreateAssignId('');
                }} 
                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
              >
                <option value="NONE">Ne pas assigner pour le moment</option>
                <option value="EMPLOYEE">Un employé</option>
                <option value="DEPARTMENT">Un département</option>
              </select>
            </div>
            
            {createAssignType !== 'NONE' && (
              <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {createAssignType === 'EMPLOYEE' ? 'Sélectionner l\'employé' : 'Sélectionner le département'}
                </label>
                <select 
                  required 
                  value={createAssignId} 
                  onChange={(e) => setCreateAssignId(e.target.value)} 
                  className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                >
                  <option value="">Sélectionnez...</option>
                  {createAssignType === 'EMPLOYEE' 
                    ? employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                      ))
                    : departments.map(dep => (
                        <option key={dep.id} value={dep.id}>{dep.name}</option>
                      ))
                  }
                </select>
              </div>
            )}
          </div>
          <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg font-bold">Enregistrer</button>
        </motion.form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {schedules.map(schedule => (
          <div key={schedule.id} className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow border border-gray-100 dark:border-gray-700 relative group">
            <button onClick={() => handleDelete(schedule.id)} className="absolute top-4 right-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-5 h-5" />
            </button>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-4">{schedule.name}</h3>
            
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Plage horaire</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{schedule.startTime} - {schedule.endTime}</span>
              </div>
              <div className="flex justify-between">
                <span>Temps de pause</span>
                <span className="font-mono font-bold text-gray-900 dark:text-white">{schedule.breakMinutes} min</span>
              </div>
              <div className="flex justify-between">
                <span>Heures / Jour</span>
                <span className="font-mono font-bold text-emerald-600">{schedule.hoursPerDay}h</span>
              </div>
              <div className="flex justify-between">
                <span>Heures / Semaine</span>
                <span className="font-mono font-bold text-brand-primary">{schedule.hoursPerWeek}h</span>
              </div>
              <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider font-bold">Employés assignés</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full text-xs font-bold">{schedule._count?.users || 0}</span>
              </div>
              <button onClick={() => setAssignModal({isOpen: true, scheduleId: schedule.id})} className="w-full mt-4 bg-brand-primary/10 text-brand-primary py-2 rounded-lg font-bold flex items-center justify-center gap-2 hover:bg-brand-primary/20 transition-colors">
                <Users className="w-4 h-4" /> Assigner
              </button>
            </div>
          </div>
        ))}
        {schedules.length === 0 && (
          <div className="col-span-full p-10 text-center text-gray-500">
            Aucun horaire créé. Les employés utiliseront les règles par défaut.
          </div>
        )}
      </div>

      {assignModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-3xl p-8 max-w-md w-full relative"
          >
            <button 
              onClick={() => setAssignModal({isOpen: false, scheduleId: null})}
              className="absolute top-4 right-4 p-2 bg-gray-100 dark:bg-gray-700 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6">Assigner l'horaire</h2>
            <form onSubmit={handleAssign} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Assigner à</label>
                <select 
                  value={assignType} 
                  onChange={(e) => {
                    setAssignType(e.target.value);
                    setSelectedAssignId('');
                  }} 
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                >
                  <option value="EMPLOYEE">Un employé</option>
                  <option value="DEPARTMENT">Un département</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">
                  {assignType === 'EMPLOYEE' ? 'Employé' : 'Département'}
                </label>
                <select 
                  required 
                  value={selectedAssignId} 
                  onChange={(e) => setSelectedAssignId(e.target.value)} 
                  className="w-full p-3 border rounded-xl dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white"
                >
                  <option value="">Sélectionnez...</option>
                  {assignType === 'EMPLOYEE' 
                    ? employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                      ))
                    : departments.map(dep => (
                        <option key={dep.id} value={dep.id}>{dep.name}</option>
                      ))
                  }
                </select>
              </div>
              <button type="submit" className="w-full bg-brand-primary text-white py-3 rounded-xl font-bold uppercase tracking-wider hover:bg-brand-primary/90 transition-colors">
                Confirmer l'assignation
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default WorkSchedules;
