import { useState, useEffect } from 'react';
import { Shield, Plus, Edit, Trash2, X, Check } from 'lucide-react';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomRole {
  id: string;
  name: string;
  permissions: string[];
}

const allPermissions = [
  { id: 'view_accounting', label: 'Voir la comptabilité (Trésorerie)' },
  { id: 'manage_accounting', label: 'Gérer la comptabilité (Ajout/Modif)' },
  { id: 'view_employees', label: 'Voir l\'annuaire des employés' },
  { id: 'manage_employees', label: 'Gérer les employés (Création/Modif)' },
  { id: 'view_salaries', label: 'Voir les salaires de base' },
  { id: 'manage_salaries', label: 'Gérer les salaires et méthodes de paie' },
  { id: 'view_payroll', label: 'Voir les fiches de paie' },
  { id: 'manage_payroll', label: 'Générer/Modifier les fiches de paie' },
  { id: 'view_leaves', label: 'Voir les congés' },
  { id: 'manage_leaves', label: 'Approuver/Rejeter les congés' },
  { id: 'manage_documents', label: 'Gérer les documents administratifs' },
  { id: 'view_crm', label: 'Voir les clients (CRM)' },
  { id: 'manage_crm', label: 'Gérer le CRM (Ajout/Modif clients)' },
  { id: 'manage_tasks', label: 'Gérer les tâches et missions' },
  { id: 'manage_expenses', label: 'Valider les notes de frais' },
  { id: 'manage_products', label: 'Gérer le catalogue (Produits)' },
  { id: 'use_pos', label: 'Utiliser la Caisse (Point de Vente)' },
  { id: 'view_sales', label: 'Voir l\'historique des ventes (Lecture seule)' }
];

const RolesPage = () => {
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<CustomRole | null>(null);
  const [formData, setFormData] = useState({ name: '', permissions: [] as string[] });

  useEffect(() => {
    void fetchRoles();
    window.addEventListener('app:refresh', fetchRoles);
    return () => window.removeEventListener('app:refresh', fetchRoles);
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
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
            <Shield className="w-10 h-10 text-brand-primary" />
            Rôles & Permissions
          </h1>
          <p className="text-gray-400 font-medium mt-1">Gérez les accès sur-mesure et les droits spécifiques de vos employés.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-brand-primary hover:bg-brand-800 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-lg shadow-brand-primary/20 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" /> Créer un rôle
        </button>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-brand-primary/10 border border-brand-primary/30 p-6 rounded-4xl flex items-start gap-4"
      >
        <div className="p-3 bg-brand-primary/20 rounded-2xl shrink-0 mt-1">
          <Shield className="w-6 h-6 text-brand-primary" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white mb-2">À quoi sert un Rôle Spécifique ?</h2>
          <p className="text-gray-300 text-sm leading-relaxed">
            Par défaut, Bamousso RH propose des rôles standards (Livreur, Manager RH, Employé, etc.) qui donnent accès à de grands blocs de fonctionnalités. <br/>
            Un <strong>Rôle Spécifique</strong> permet de contourner ces réglages de base en créant un profil d'accès "à la carte". <br/>
            <span className="text-white font-bold block mt-2">Exemple d'utilisation :</span>
            Vous pouvez avoir un "Employé simple" dans le système (sans accès RH), mais lui créer un Rôle Spécifique "Aide-Comptable" en cochant <em>"Voir la comptabilité"</em> et <em>"Voir les fiches de paie"</em>. Il aura alors accès à ces modules sans avoir les pleins pouvoirs d'un Manager RH.
          </p>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="text-center py-20">
          <p className="text-brand-primary font-black uppercase tracking-widest animate-pulse">Chargement...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {roles.map(role => (
            <motion.div 
              key={role.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-card p-8 rounded-[2.5rem] border border-white/5 relative group hover:border-white/20 transition-all"
            >
              <div className="absolute top-6 right-6 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(role)} className="p-2 text-gray-400 hover:text-white bg-white dark:bg-[#1f1f1f]/5 rounded-xl transition-colors">
                  <Edit size={16} />
                </button>
                <button onClick={() => handleDeleteRole(role.id)} className="p-2 text-gray-400 hover:text-rose-500 bg-white dark:bg-[#1f1f1f]/5 rounded-xl transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>

              <h3 className="text-2xl font-black text-white mb-6 pr-16">{role.name}</h3>
              
              <div className="space-y-3">
                <p className="text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Permissions Accordées</p>
                {role.permissions.length === 0 ? (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">Aucune permission spéciale.</p>
                ) : (
                  <ul className="space-y-2">
                    {role.permissions.map(p => (
                      <li key={p} className="flex items-center gap-2 text-sm text-gray-300 font-medium">
                        <Check className="w-4 h-4 text-brand-primary" />
                        {allPermissions.find(ap => ap.id === p)?.label || p}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </motion.div>
          ))}
          {roles.length === 0 && (
            <div className="col-span-full py-12 text-center">
               <p className="text-gray-500 dark:text-gray-400 font-bold">Aucun rôle personnalisé défini.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal pour la création/modification */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-brand-900 border border-white/10 p-8 rounded-[2.5rem] max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-500 dark:text-gray-400 hover:text-white transition-colors">
                <X className="w-6 h-6" />
              </button>

              <h2 className="text-2xl font-black text-white mb-8">{editingRole ? 'Modifier le rôle' : 'Créer un nouveau rôle'}</h2>
              
              <form onSubmit={handleSaveRole} className="space-y-8">
                <div>
                  <label htmlFor="roleName" className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-2">Nom du rôle</label>
                  <input 
                    id="roleName"
                    type="text" 
                    placeholder="Ex: Comptable, Manager..."
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                    className="w-full bg-white dark:bg-[#1f1f1f]/5 border border-white/10 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-4">Permissions attribuées</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allPermissions.map(permission => {
                      const isSelected = formData.permissions.includes(permission.id);
                      return (
                        <label 
                          key={permission.id} 
                          className={`flex items-center gap-3 p-4 rounded-2xl cursor-pointer border transition-all ${
                            isSelected 
                              ? 'bg-brand-primary/10 border-brand-primary/50' 
                              : 'bg-white dark:bg-[#1f1f1f]/5 border-white/5 hover:border-white/20'
                          }`}
                        >
                          <div className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                            isSelected ? 'bg-brand-primary border-brand-primary' : 'border-gray-500'
                          }`}>
                            {isSelected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <input 
                            type="checkbox"
                            className="hidden"
                            checked={isSelected}
                            onChange={() => handlePermissionChange(permission.id)}
                          />
                          <span className={`text-sm font-bold ${isSelected ? 'text-white' : 'text-gray-400'}`}>
                            {permission.label}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-primary/20 mt-4"
                >
                  {editingRole ? 'Enregistrer les modifications' : 'Créer le rôle'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RolesPage;
