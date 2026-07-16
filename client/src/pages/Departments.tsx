import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

interface Department {
  id: string;
  name: string;
  level?: string | null;
}

const Departments = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const fetchDepartments = async () => {
    const res = await api.get<Department[]>('/departments');
    setDepartments(res.data);
  };

  useEffect(() => {
    void fetchDepartments();
    window.addEventListener('app:refresh', fetchDepartments);
    return () => window.removeEventListener('app:refresh', fetchDepartments);
  }, []);

  const sorted = useMemo(
    () => [...departments].sort((a, b) => a.name.localeCompare(b.name)),
    [departments]
  );

  const createDepartment = async () => {
    setError(null);
    setIsCreating(true);
    try {
      await api.post('/departments', { name });
      setName('');
      await fetchDepartments();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Erreur lors de la création');
    } finally {
      setIsCreating(false);
    }
  };

  const updateDepartment = async (id: string, currentName: string) => {
    const newName = window.prompt("Entrez le nouveau nom du département :", currentName);
    if (!newName || newName === currentName) return;

    try {
      await api.patch(`/departments/${id}`, { name: newName });
      await fetchDepartments();
    } catch (e: any) {
      alert("Erreur lors de la modification");
    }
  };

  const deleteDepartment = async (id: string, name: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le département "${name}" ? Cette action est irréversible.`)) {
      return;
    }

    try {
      await api.delete(`/departments/${id}`);
      await fetchDepartments();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Erreur lors de la suppression");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Départements</h1>
        <p className="text-gray-600 dark:text-gray-300">Structure interne de l’entreprise.</p>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 space-y-3">
        <div className="font-semibold text-gray-900 dark:text-white">Créer un département</div>
        {error ? <div className="text-sm text-red-600 dark:text-red-400">{error}</div> : null}

        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="ex: Finance, Sales, Tech…"
            className="flex-1 p-2 border border-gray-300 dark:border-gray-600 rounded text-black dark:text-white dark:bg-gray-700"
          />
          <button
            onClick={() => void createDepartment()}
            disabled={isCreating || !name}
            className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isCreating ? 'Création…' : 'Créer'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-5 border-b border-gray-200 dark:border-gray-700 font-semibold text-gray-900 dark:text-white">
          Liste
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nom</th>
                <th className="p-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sorted.map((d) => (
                <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                  <td className="p-4 text-gray-900 dark:text-white font-medium">{d.name}</td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => updateDepartment(d.id, d.name)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 font-medium text-sm"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => deleteDepartment(d.id, d.name)}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 font-medium text-sm"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {sorted.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400">Aucun département.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Departments;

