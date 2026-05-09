import { useState, useEffect } from 'react';
import { Shield, PlusCircle, Edit, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomRole {
  id: string;
  name: string;
  permissions: string[];
}

// Liste prédéfinie de permissions pour simplifier
const allPermissions = [
  { id: 'view_accounting', label: 'Voir la comptabilité' },
  { id: 'manage_crm', label: 'Gérer le CRM (clients, rdv)' },
  { id: 'manage_employees', label: 'Gérer les employés' },
  { id: 'manage_salaries', label: 'Gérer les salaires' },
];

const RolesPage = () => {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState({ name: '', permissions: [] as string[] });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/roles');
      setRoles(res.data);
    } catch (error) {
      console.error("Erreur lors de la récupération des rôles", error);
    }
    setIsLoading(false);
  };

  const handleOpenModal = (role: CustomRole | null = null) => {
    setEditingRole(role);
    if (role) {
      setFormData({ name: role.name, permissions: role.permissions });
    } else {
      setFormData({ name: '', permissions: [] });
    }
    setIsModalOpen(true);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    const apiCall = editingRole
      ? api.put(`/roles/${editingRole.id}`, formData)
      : api.post('/roles', formData);

    try {
      await apiCall;
      fetchRoles();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du rôle", error);
      alert('Une erreur est survenue.');
    }
  };

  const handleDeleteRole = async (roleId: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce rôle ?')) {
      try {
        await api.delete(`/roles/${roleId}`);
        fetchRoles();
      } catch (error) {
        console.error("Erreur lors de la suppression du rôle", error);
        alert('Une erreur est survenue.');
      }
    }
  };

  const handlePermissionChange = (permissionId: string) => {
    setFormData(prev => {
      const newPermissions = prev.permissions.includes(permissionId)
        ? prev.permissions.filter(p => p !== permissionId)
        : [...prev.permissions, permissionId];
      return { ...prev, permissions: newPermissions };
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
          <Shield className="w-8 h-8 text-blue-500" />
          Rôles & Permissions
        </h1>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 bg-blue-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="w-5 h-5" />
          Créer un rôle
        </button>
      </div>

      {isLoading ? <p>Chargement...</p> : (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {roles.map(role => (
              <li key={role.id} className="py-4 flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">{role.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {role.permissions.map(p => (
                      <span key={p} className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                        {allPermissions.find(ap => ap.id === p)?.label || p}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => handleOpenModal(role)} className="text-gray-400 hover:text-blue-500"><Edit size={20} /></button>
                  <button onClick={() => handleDeleteRole(role.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={20} /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modal pour la création/modification */}
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
              className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl p-8"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-6">{editingRole ? 'Modifier le rôle' : 'Créer un nouveau rôle'}</h2>
              <form onSubmit={handleSaveRole} className="space-y-6">
                <div>
                  <label htmlFor="roleName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nom du rôle</label>
                  <input 
                    id="roleName"
                    type="text" 
                    placeholder="Ex: Comptable, Commercial"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 rounded-lg bg-gray-100 dark:bg-gray-700 border dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Permissions</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allPermissions.map(permission => (
                      <label key={permission.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50 cursor-pointer">
                        <input 
                          type="checkbox"
                          checked={formData.permissions.includes(permission.id)}
                          onChange={() => handlePermissionChange(permission.id)}
                          className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <span className="text-sm text-gray-800 dark:text-gray-200">{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="py-2 px-4 rounded-lg text-gray-600 dark:text-gray-300">Annuler</button>
                  <button type="submit" className="py-2 px-6 rounded-lg bg-blue-600 text-white font-semibold">Enregistrer</button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default RolesPage;
