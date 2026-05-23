import { useEffect, useMemo, useState } from 'react';
// Force redeploy - 2026-04-30
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Lock, Unlock, Download, Trash2, Edit2, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

type Role = 'COMPANY_ADMIN' | 'HR_MANAGER' | 'COMMERCIAL' | 'EMPLOYEE';
type Status = 'INVITED' | 'ACTIVE' | 'INACTIVE';

interface Department {
  id: string;
  name: string;
}

interface CustomRole {
  id: string;
  name: string;
}

interface Employee {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role | string;
  status?: Status | string;
  jobTitle?: string | null;
  phone?: string | null;
  hireDate?: string | null;
  department?: { id: string; name: string } | null;
  customRoleId?: string | null;
  customRole?: { id: string; name: string } | null;
}

const Employees = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role>('EMPLOYEE');
  const [departmentId, setDepartmentId] = useState<string>('');
  const [customRoleId, setCustomRoleId] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingDeptId, setEditingDeptId] = useState<string | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [selectedNewDept, setSelectedNewDept] = useState<string>('');
  const [selectedNewRole, setSelectedNewRole] = useState<string>('');
  const { user } = useAuth();

  const fetchEmployees = async () => {
    const res = await api.get<Employee[]>('/employees');
    setEmployees(res.data);
  };

  const fetchDepartments = async () => {
    try {
      const res = await api.get<Department[]>('/departments');
      setDepartments(res.data);
    } catch (err) { console.error(err); }
  };

  const fetchCustomRoles = async () => {
    try {
      const res = await api.get<CustomRole[]>('/roles');
      setCustomRoles(res.data);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    void fetchEmployees();
    void fetchDepartments();
    void fetchCustomRoles();
  }, []);

  const canPickDepartment = departments.length > 0;

  const sortedEmployees = useMemo(() => {
    return [...employees].sort((a, b) => {
      const nameA = `${a.lastName || ''} ${a.firstName || ''}`.trim().toLowerCase();
      const nameB = `${b.lastName || ''} ${b.firstName || ''}`.trim().toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }, [employees]);

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setRole('EMPLOYEE');
    setDepartmentId('');
    setCustomRoleId('');
  };

  const createEmployee = async () => {
    setError(null);
    setIsCreating(true);
    try {
      await api.post('/employees', {
        firstName,
        lastName,
        email,
        password,
        role,
        status: 'INVITED',
        ...(departmentId ? { departmentId } : {}),
        ...(customRoleId ? { customRoleId } : {}),
      });
      resetForm();
      await fetchEmployees();
    } catch (e: any) {
      const serverError = e?.response?.data;
      if (serverError?.errors) {
        // Concaténer les messages d'erreur de Zod
        const details = serverError.errors.map((err: any) => `${err.path.join('.')}: ${err.message}`).join(', ');
        setError(`Données invalides : ${details}`);
      } else {
        setError(serverError?.message || 'Erreur lors de la création');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleStatus = async (employeeId: string, currentStatus: string | undefined) => {
    try {
      const isSuspended = currentStatus === 'INACTIVE' || currentStatus === 'SUSPENDED';
      if (!window.confirm(`Voulez-vous vraiment ${isSuspended ? 'réactiver' : 'suspendre'} cet employé ?`)) return;

      // Optimistic UI Update
      setEmployees(prev => prev.map(e => e.id === employeeId ? { ...e, status: isSuspended ? 'ACTIVE' : 'INACTIVE' } : e));

      if (isSuspended) {
        await api.post(`/employees/${employeeId}/activate`);
      } else {
        await api.post(`/employees/${employeeId}/suspend`);
      }
      
      void fetchEmployees();
    } catch (err) {
      console.error(err);
      alert('Erreur lors de la modification du statut.');
      void fetchEmployees(); // Revert on error
    }
  };

  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!window.confirm(`ATTENTION : Êtes-vous sûr de vouloir supprimer définitivement l'employé ${name} ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await api.delete(`/employees/${id}`);
      setEmployees(prev => prev.filter(e => e.id !== id));
      alert('Employé supprimé avec succès.');
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Erreur lors de la suppression.');
    }
  };

  const exportEmployeePDF = (employee: Employee) => {
    const doc = new (jsPDF as any)();
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(249, 115, 22); // Orange 500
    doc.text('BAMOUSSO', 14, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(31, 41, 55); // Gray 800
    doc.text('Fiche Historique Employé', 14, 30);
    
    // Employee Info
    doc.setFontSize(12);
    doc.setTextColor(75, 85, 99); // Gray 600
    
    const startY = 45;
    const lineSpace = 10;
    
    doc.text(`Nom complet : ${employee.firstName} ${employee.lastName}`, 14, startY);
    doc.text(`Email : ${employee.email}`, 14, startY + lineSpace);
    doc.text(`Rôle : ${employee.role}`, 14, startY + lineSpace * 2);
    doc.text(`Département : ${employee.department?.name || 'Non assigné'}`, 14, startY + lineSpace * 3);
    doc.text(`Statut Actuel : ${employee.status || 'Inconnu'}`, 14, startY + lineSpace * 4);
    doc.text(`Date d'embauche : ${employee.hireDate ? new Date(employee.hireDate).toLocaleDateString('fr-FR') : 'Non renseignée'}`, 14, startY + lineSpace * 5);
    
    // Footer
    doc.setFontSize(10);
    doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')} par ${user?.firstName} ${user?.lastName}`, 14, 280);

    doc.save(`Fiche_Employe_${employee.lastName}_${employee.firstName}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employés</h1>
        <p className="text-gray-600 dark:text-gray-300">Annuaire + invitations.</p>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-4">
        <div className="font-semibold text-gray-900 dark:text-white">Inviter un employé</div>

        {error ? (
          <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Prénom</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-black dark:text-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Nom</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-black dark:text-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-black dark:text-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Mot de passe (test)</label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="text"
              minLength={6}
              placeholder="Min. 6 caractères"
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-black dark:text-white dark:bg-gray-700"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Rôle</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-black dark:text-white dark:bg-gray-700"
            >
              <option value="EMPLOYEE">Employé</option>
              <option value="COMMERCIAL">Commercial</option>
              <option value="HR_MANAGER">RH Manager</option>
              <option value="COMPANY_ADMIN">Admin entreprise</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Rôle Spécifique (LOUBA/KORO)</label>
            <select
              value={customRoleId}
              onChange={(e) => setCustomRoleId(e.target.value)}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-black dark:text-white dark:bg-gray-700"
            >
              <option value="">— Aucun rôle personnalisé —</option>
              {customRoles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Département (optionnel)</label>
            <select
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              disabled={!canPickDepartment}
              className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded text-black dark:text-white dark:bg-gray-700 disabled:opacity-50"
            >
              <option value="">{canPickDepartment ? '— Aucun —' : 'Crée un département d’abord'}</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          onClick={() => void createEmployee()}
          disabled={isCreating || !firstName || !lastName || !email}
          className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {isCreating ? 'Création…' : 'Inviter (status INVITED)'}
        </button>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          Astuce : Vous pouvez définir un mot de passe ici ou laisser l'employé utiliser "Mot de passe oublié".
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
          Annuaire
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900/40 text-gray-600 dark:text-gray-300">
              <tr>
                <th className="text-left p-3">Nom</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Rôle</th>
                <th className="text-left p-3">Statut</th>
                <th className="text-left p-3">Département</th>
                <th className="text-right p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedEmployees.map((e) => (
                <tr key={e.id} className="border-t border-gray-200 dark:border-gray-700">
                  <td className="p-3 text-gray-900 dark:text-white">{e.lastName} {e.firstName}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">{e.email}</td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">
                    {editingRoleId === e.id ? (
                      <div className="flex items-center gap-1">
                        <select 
                          value={selectedNewRole}
                          onChange={(e) => setSelectedNewRole(e.target.value)}
                          className="text-xs p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-black dark:text-white"
                        >
                          <option value="">— Aucun —</option>
                          {customRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <button 
                          onClick={async () => {
                            try {
                              await api.put(`/employees/${e.id}`, { customRoleId: selectedNewRole || null });
                              setEditingRoleId(null);
                              void fetchEmployees();
                            } catch (err) { alert("Erreur"); }
                          }}
                          className="p-1 text-green-500 hover:bg-green-500/10 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setEditingRoleId(null)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group/role">
                        <span>{e.customRole?.name || e.role}</span>
                        {(user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER') && (
                          <button 
                            onClick={() => {
                              setEditingRoleId(e.id);
                              setSelectedNewRole(e.customRoleId || '');
                            }}
                            className="p-1 text-gray-400 hover:text-brand-primary opacity-0 group-hover/role:opacity-100 transition-opacity"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">
                    <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                      e.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                      e.status === 'INVITED' ? 'bg-blue-100 text-blue-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {e.status || '-'}
                    </span>
                  </td>
                  <td className="p-3 text-gray-700 dark:text-gray-300">
                    {editingDeptId === e.id ? (
                      <div className="flex items-center gap-1">
                        <select 
                          value={selectedNewDept}
                          onChange={(e) => setSelectedNewDept(e.target.value)}
                          className="text-xs p-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-black dark:text-white"
                        >
                          <option value="">— Aucun —</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                        <button 
                          onClick={async () => {
                            try {
                              await api.put(`/employees/${e.id}`, { departmentId: selectedNewDept || null });
                              setEditingDeptId(null);
                              void fetchEmployees();
                            } catch (err) { alert("Erreur"); }
                          }}
                          className="p-1 text-green-500 hover:bg-green-500/10 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button onClick={() => setEditingDeptId(null)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group/dept">
                        <span>{e.department?.name || '-'}</span>
                        {(user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER') && (
                          <button 
                            onClick={() => {
                              setEditingDeptId(e.id);
                              setSelectedNewDept(e.department?.id || '');
                            }}
                            className="p-1 text-gray-400 hover:text-brand-primary opacity-0 group-hover/dept:opacity-100 transition-opacity"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => exportEmployeePDF(e)}
                        title="Télécharger l'historique PDF"
                        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                      
                      {(user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER') && e.role !== 'COMPANY_ADMIN' && e.id !== user?.id && (
                        <button
                          onClick={() => handleToggleStatus(e.id, e.status)}
                          title={e.status === 'INACTIVE' || e.status === 'SUSPENDED' ? "Réactiver l'employé" : "Suspendre l'employé"}
                          className={`p-2 rounded transition ${
                            e.status === 'INACTIVE' || e.status === 'SUSPENDED'
                              ? 'bg-green-100 text-green-600 hover:bg-green-200'
                              : 'bg-red-100 text-red-600 hover:bg-red-200'
                          }`}
                        >
                          {e.status === 'INACTIVE' || e.status === 'SUSPENDED' ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                      )}

                      {(user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER') && e.id !== user?.id && (
                        <button
                          onClick={() => handleDeleteEmployee(e.id, `${e.firstName} ${e.lastName}`)}
                          title="Supprimer l'employé"
                          className="p-2 bg-rose-500/10 text-rose-600 rounded hover:bg-rose-500/20 transition"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sortedEmployees.length === 0 ? (
                <tr>
                  <td className="p-3 text-gray-600 dark:text-gray-300 text-center" colSpan={6}>
                    Aucun employé pour le moment.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Employees;

