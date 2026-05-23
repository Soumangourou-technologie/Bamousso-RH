import { motion } from 'framer-motion';
import { ShieldCheck, UserX, MessageSquare, Info, Lightbulb } from 'lucide-react';
import { useState, useEffect } from 'react';
import api from '../utils/api';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

interface Suggestion {
  id: string;
  nature: string;
  description: string;
  isAnonymous: boolean;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';
  createdAt: string;
  reporter?: {
    firstName: string;
    lastName: string;
  };
}

const Suggestions = () => {
  const { user } = useAuth();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [nature, setNature] = useState('Amélioration du cadre de travail');
  const [description, setDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const isAdmin = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER' || user?.role === 'HR_ASSISTANT';

  const fetchSuggestions = async () => {
    try {
      const res = await api.get('/suggestions');
      setSuggestions(res.data);
    } catch (error) {
      console.error('Error fetching suggestions', error);
    }
  };

  useEffect(() => {
    fetchSuggestions();

    // Abonnement Temps Réel via Supabase
    const channel = supabase
      .channel('suggestions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'Suggestion',
          filter: `companyId=eq.${user?.companyId}`
        },
        () => {
          fetchSuggestions();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.companyId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/suggestions', { nature, description, isAnonymous });
      setNature('Amélioration du cadre de travail');
      setDescription('');
      setIsAnonymous(false);
      void fetchSuggestions();
      alert('Votre suggestion a été envoyée avec succès.');
    } catch (error: any) {
      console.error('Error reporting suggestion', error);
      alert(error.response?.data?.message || "Erreur lors de l'envoi de la suggestion. Vérifiez votre connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.patch(`/suggestions/${id}`, { status });
      void fetchSuggestions();
    } catch (error) {
      console.error('Error updating status', error);
    }
  };

  return (
    <div className="space-y-8">
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-center"
      >
        <div>
          <h1 className="text-4xl font-black text-white tracking-tight">Boîte à Suggestions</h1>
          <p className="text-gray-400 font-medium mt-1">Partagez vos idées pour améliorer la vie au sein de l'entreprise.</p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {!isAdmin ? (
            // VUE EMPLOYÉ : Formulaire de suggestion
            <div className="glass-card p-10 rounded-[2.5rem] border border-white/5">
              <h2 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <Lightbulb className="w-6 h-6 text-brand-primary" /> Nouvelle Suggestion
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Nature de la suggestion</label>
                  <select 
                    value={nature}
                    onChange={e => setNature(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary appearance-none"
                  >
                    <option className="bg-gray-800 text-white">Amélioration du cadre de travail</option>
                    <option className="bg-gray-800 text-white">Processus interne</option>
                    <option className="bg-gray-800 text-white">Bien-être au travail</option>
                    <option className="bg-gray-800 text-white">Autre</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-3">Détails de votre idée</label>
                  <textarea 
                    required
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 p-6 rounded-2xl text-white font-medium outline-none focus:ring-2 focus:ring-brand-primary h-40 resize-none placeholder-gray-500"
                    placeholder="Comment pourrions-nous améliorer les choses ?..."
                  />
                </div>

                <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-dashed border-white/10">
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isAnonymous ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-gray-800'}`}>
                      <UserX className={`w-6 h-6 ${isAnonymous ? 'text-white' : 'text-gray-500'}`} />
                    </div>
                    <div>
                      <p className="text-white font-bold text-sm">Rester Anonyme</p>
                      <p className="text-xs text-gray-500 font-medium">Votre identité ne sera pas révélée.</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className={`w-14 h-8 rounded-full relative transition-all ${isAnonymous ? 'bg-emerald-500' : 'bg-gray-700'}`}
                  >
                    <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${isAnonymous ? 'left-7' : 'left-1'}`} />
                  </button>
                </div>

                <button 
                  disabled={isLoading}
                  type="submit" 
                  className="w-full bg-brand-primary text-white py-5 rounded-2xl font-black text-lg uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-brand-primary/20 flex justify-center items-center"
                >
                  {isLoading ? 'Envoi...' : 'Envoyer la suggestion'}
                </button>
              </form>
            </div>
          ) : (
            // VUE ADMIN : Liste des suggestions
            <div className="space-y-6">
              {suggestions.map((suggestion) => (
                <div key={suggestion.id} className="glass-card p-8 rounded-[2rem] border border-white/5 space-y-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        suggestion.status === 'OPEN' ? 'bg-rose-500/20 text-rose-500' : 
                        suggestion.status === 'IN_PROGRESS' ? 'bg-amber-500/20 text-amber-500' : 
                        'bg-emerald-500/20 text-emerald-500'
                      }`}>
                        {suggestion.status}
                      </div>
                      <span className="text-xs text-gray-500 font-bold">{new Date(suggestion.createdAt).toLocaleString('fr-FR')}</span>
                    </div>
                    <div className="flex gap-2">
                      {suggestion.status !== 'RESOLVED' && (
                        <button 
                          onClick={() => updateStatus(suggestion.id, suggestion.status === 'OPEN' ? 'IN_PROGRESS' : 'RESOLVED')}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[10px] font-black text-white uppercase tracking-widest rounded-xl transition-all"
                        >
                          {suggestion.status === 'OPEN' ? 'Examiner' : 'Marquer comme traité'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-xl font-black text-white mb-2">{suggestion.nature}</h3>
                    <p className="text-gray-400 font-medium leading-relaxed">{suggestion.description}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                        {suggestion.isAnonymous ? <UserX className="w-4 h-4 text-gray-500" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                      </div>
                      <span className="text-xs font-bold text-gray-500">
                        Suggéré par : {suggestion.isAnonymous ? 'Anonyme' : `${suggestion.reporter?.firstName} ${suggestion.reporter?.lastName}`}
                      </span>
                    </div>
                    <button className="flex items-center gap-2 text-brand-primary text-xs font-black uppercase tracking-widest hover:underline">
                      <MessageSquare className="w-4 h-4" /> Discuter
                    </button>
                  </div>
                </div>
              ))}
              {suggestions.length === 0 && (
                <div className="glass-card p-20 text-center rounded-[2.5rem] border border-dashed border-white/10">
                  <Lightbulb className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">Aucune suggestion pour le moment.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 rounded-[2.5rem] border border-white/5">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
              <Lightbulb className="w-5 h-5 text-brand-primary" /> {isAdmin ? 'Suivi des Idées' : 'Vos Suggestions'}
            </h3>
            {!isAdmin ? (
              <div className="space-y-4">
                {suggestions.map(s => (
                  <div key={s.id} className="p-4 bg-white/5 rounded-2xl border border-white/5">
                    <p className="text-white font-bold text-sm line-clamp-1">{s.nature}</p>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-[10px] text-gray-500 font-bold">{new Date(s.createdAt).toLocaleDateString()}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        s.status === 'OPEN' ? 'text-rose-500' : 'text-emerald-500'
                      }`}>{s.status}</span>
                    </div>
                  </div>
                ))}
                {suggestions.length === 0 && <p className="text-gray-500 text-sm font-bold italic">Aucune suggestion envoyée.</p>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <Info className="w-5 h-5 text-emerald-500 shrink-0" />
                  <p className="text-[10px] text-emerald-500/80 font-bold leading-tight">
                    Prenez connaissance des idées de vos collaborateurs pour faire progresser l'entreprise.
                  </p>
                </div>
              </div>
            )}
          </div>
          
          <div className="glass-card p-8 rounded-[2.5rem] border border-brand-primary/20 bg-brand-primary/5">
            <h3 className="text-lg font-black text-brand-primary mb-3 uppercase tracking-tighter">Esprit d'Équipe</h3>
            <p className="text-xs text-gray-400 leading-relaxed font-medium">
              Chaque idée compte. Bamousso vous permet de participer activement à l'évolution de votre environnement de travail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Suggestions;
