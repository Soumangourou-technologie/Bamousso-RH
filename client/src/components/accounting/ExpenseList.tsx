import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Clock, Banknote, Plus } from 'lucide-react';
import api from '../../utils/api';
import { useAuth } from '../../context/AuthContext';

export interface ExpenseReport {
  id: string;
  title: string;
  amount: number;
  date: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
  category: string;
  description?: string;
  receiptUrl?: string;
  employee: { firstName: string; lastName: string; jobTitle: string | null };
  approvedBy?: { firstName: string; lastName: string };
  createdAt: string;
}

const ExpenseList = ({ refreshTrigger }: { refreshTrigger?: number }) => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState<ExpenseReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Pour le formulaire (version simplifiée)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: '', category: 'DÉPLACEMENT', description: '' });

  const canManage = ['COMPANY_ADMIN', 'HR_MANAGER', 'COMPTABLE', 'SUPER_ADMIN'].includes(user?.role || '');

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/accounting/expenses');
      setExpenses(res.data);
    } catch (error) {
      console.error('Error fetching expenses', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchExpenses();
  }, [refreshTrigger]);

  const handleStatusChange = async (id: string, status: string) => {
    if (!window.confirm(`Confirmer le changement de statut vers ${status} ?\n(Cliquer sur Annuler pour revoir la décision)`)) return;
    if (!window.confirm(`⚠️ ATTENTION : Une fois validée, cette action est irréversible pour le comptable.\n\nÊtes-vous absolument sûr de valider définitivement le statut ${status} ?`)) return;
    try {
      await api.patch(`/accounting/expenses/${id}/status`, { status });
      void fetchExpenses();
    } catch (error) {
      alert("Erreur lors de la mise à jour");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm("Êtes-vous sûr de vouloir soumettre cette note de frais ?\n(Cliquez sur Annuler pour retourner au formulaire et la modifier)")) {
      return;
    }
    if (!window.confirm("⚠️ ATTENTION : Une fois soumise, cette note de frais ne pourra plus être modifiée par l'employé.\n\nÊtes-vous absolument sûr de valider définitivement ?")) {
      return;
    }
    try {
      await api.post('/accounting/expenses', formData);
      setIsFormOpen(false);
      setFormData({ title: '', amount: '', category: 'DÉPLACEMENT', description: '' });
      void fetchExpenses();
    } catch (error) {
      alert("Erreur lors de la soumission");
    }
  };

  if (isLoading) return <div className="text-white text-center py-10">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-white">Notes de Frais</h2>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-brand-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-90"
        >
          {isFormOpen ? 'Annuler' : <><Plus className="w-4 h-4" /> Nouvelle Note</>}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Titre (Motif)</label>
              <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Montant (FCFA)</label>
              <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Catégorie</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                <option value="DÉPLACEMENT">Déplacement / Transport</option>
                <option value="REPAS">Repas</option>
                <option value="MATÉRIEL">Matériel / Fournitures</option>
                <option value="AUTRE">Autre</option>
              </select>
            </div>
          </div>
          <button type="submit" className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold">Soumettre</button>
        </form>
      )}

      <div className="glass-card p-6 rounded-2xl border border-white/5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-gray-400 text-sm">
              <th className="pb-4">Employé</th>
              <th className="pb-4">Motif</th>
              <th className="pb-4">Montant</th>
              <th className="pb-4">Statut</th>
              {canManage && <th className="pb-4 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {expenses.map(exp => (
              <tr key={exp.id} className="text-white hover:bg-white/5">
                <td className="py-4">
                  <div className="font-bold">{exp.employee.firstName} {exp.employee.lastName}</div>
                  <div className="text-xs text-gray-500">{new Date(exp.createdAt).toLocaleDateString('fr-FR')}</div>
                </td>
                <td className="py-4">
                  <div className="font-bold">{exp.title}</div>
                  <div className="text-xs text-gray-400">{exp.category}</div>
                </td>
                <td className="py-4 font-black">{exp.amount.toLocaleString()} FCFA</td>
                <td className="py-4">
                  {exp.status === 'PENDING' && <span className="inline-flex items-center gap-1 bg-yellow-500/20 text-yellow-500 px-2 py-1 rounded text-xs font-bold"><Clock className="w-3 h-3"/> En attente</span>}
                  {exp.status === 'APPROVED' && <span className="inline-flex items-center gap-1 bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold"><CheckCircle className="w-3 h-3"/> Approuvé</span>}
                  {exp.status === 'PAID' && <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded text-xs font-bold"><Banknote className="w-3 h-3"/> Remboursé</span>}
                  {exp.status === 'REJECTED' && <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-400 px-2 py-1 rounded text-xs font-bold"><XCircle className="w-3 h-3"/> Rejeté</span>}
                </td>
                {canManage && (
                  <td className="py-4 text-right space-x-2">
                    {exp.status === 'PENDING' && (
                      <>
                        <button onClick={() => handleStatusChange(exp.id, 'APPROVED')} className="text-blue-400 hover:underline text-sm font-bold">Approuver</button>
                        <button onClick={() => handleStatusChange(exp.id, 'REJECTED')} className="text-red-400 hover:underline text-sm font-bold">Rejeter</button>
                      </>
                    )}
                    {exp.status === 'APPROVED' && (
                      <button onClick={() => handleStatusChange(exp.id, 'PAID')} className="text-emerald-400 hover:underline text-sm font-bold">Marquer Payé</button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {expenses.length === 0 && <tr><td colSpan={5} className="py-10 text-center text-gray-500">Aucune note de frais</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ExpenseList;
