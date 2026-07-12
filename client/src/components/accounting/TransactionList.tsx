import { useState, useEffect } from 'react';
import { Plus, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../../utils/api';

export interface CompanyTransaction {
  id: string;
  title: string;
  amount: number;
  type: 'INCOME' | 'EXPENSE';
  category: string;
  date: string;
  reference?: string;
}

const TransactionList = () => {
  const [transactions, setTransactions] = useState<CompanyTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ title: '', amount: '', type: 'INCOME', category: 'VENTE', reference: '' });

  const fetchTransactions = async () => {
    try {
      const res = await api.get('/accounting/transactions');
      setTransactions(res.data);
    } catch (error) {
      console.error('Error fetching transactions', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchTransactions();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/accounting/transactions', formData);
      setIsFormOpen(false);
      setFormData({ title: '', amount: '', type: 'INCOME', category: 'VENTE', reference: '' });
      void fetchTransactions();
    } catch (error) {
      alert("Erreur lors de l'ajout de la transaction");
    }
  };

  if (isLoading) return <div className="text-white text-center py-10">Chargement...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-white">Registre de Trésorerie</h2>
        <button 
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="bg-brand-primary text-white px-4 py-2 rounded-xl font-bold flex items-center gap-2 hover:opacity-90"
        >
          {isFormOpen ? 'Annuler' : <><Plus className="w-4 h-4" /> Nouvelle Entrée</>}
        </button>
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Type</label>
              <select value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white">
                <option value="INCOME">Entrée (Revenu)</option>
                <option value="EXPENSE">Sortie (Dépense)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Motif</label>
              <input type="text" required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Montant (FCFA)</label>
              <input type="number" required value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Catégorie</label>
              <input type="text" required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} placeholder="ex: Loyer, Vente, Achat matériel" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-400 mb-1">Référence (Optionnel)</label>
              <input type="text" value={formData.reference} onChange={e => setFormData({...formData, reference: e.target.value})} placeholder="N° Facture" className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-white" />
            </div>
          </div>
          <button type="submit" className="bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold">Enregistrer</button>
        </form>
      )}

      <div className="glass-card p-6 rounded-2xl border border-white/5 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 text-gray-400 text-sm">
              <th className="pb-4">Date</th>
              <th className="pb-4">Opération</th>
              <th className="pb-4">Catégorie</th>
              <th className="pb-4 text-right">Montant</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.map(tx => (
              <tr key={tx.id} className="text-white hover:bg-white/5">
                <td className="py-4 text-gray-400">{new Date(tx.date).toLocaleDateString('fr-FR')}</td>
                <td className="py-4">
                  <div className="font-bold flex items-center gap-2">
                    {tx.type === 'INCOME' ? <TrendingUp className="w-4 h-4 text-emerald-400"/> : <TrendingDown className="w-4 h-4 text-red-400"/>}
                    {tx.title}
                  </div>
                  {tx.reference && <div className="text-xs text-gray-500">Réf: {tx.reference}</div>}
                </td>
                <td className="py-4"><span className="bg-white/10 px-2 py-1 rounded text-xs">{tx.category}</span></td>
                <td className={`py-4 text-right font-black ${tx.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {tx.type === 'INCOME' ? '+' : '-'}{tx.amount.toLocaleString()} FCFA
                </td>
              </tr>
            ))}
            {transactions.length === 0 && <tr><td colSpan={4} className="py-10 text-center text-gray-500">Aucune transaction</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionList;
