import { motion } from 'framer-motion';
import { Lock, CheckCircle, Trash2, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

const TrialExpiredOverlay = () => {
  const { logout, company } = useAuth();

  const handleDeleteAccount = async () => {
    if (!window.confirm("🚨 ATTENTION : Êtes-vous sûr ? Cette action supprimera définitivement votre entreprise et toutes ses données (employés, pointages, etc.).")) {
      return;
    }
    
    try {
      await api.delete(`/companies/${company?.id}`);
      alert("Compte supprimé avec succès. Nous espérons vous revoir bientôt !");
      logout();
    } catch (error) {
      console.error("Erreur suppression compte:", error);
      alert("Erreur lors de la suppression du compte.");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden relative"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-primary/5 rounded-full -mr-32 -mt-32 pointer-events-none" />
        
        <div className="flex flex-col md:flex-row">
          {/* Left Side: Illustration & Status */}
          <div className="bg-brand-primary p-12 text-white md:w-2/5 flex flex-col justify-between">
            <div>
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-8">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="text-4xl font-black tracking-tighter leading-none mb-4">DÉCOUVERTE <br />TERMINÉE</h2>
              <p className="text-white/80 font-medium">Votre accès privilège de 7 jours est arrivé à terme.</p>
            </div>
            
            <div className="mt-12 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-white/50" />
                <span className="text-sm font-bold opacity-70">Données sécurisées</span>
              </div>
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-white/50" />
                <span className="text-sm font-bold opacity-70">Support prioritaire</span>
              </div>
            </div>
          </div>

          {/* Right Side: Options */}
          <div className="p-12 md:w-3/5">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">Que souhaitez-vous faire ?</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">Choisissez une formule pour continuer à utiliser Bamousso RH ou supprimez votre compte.</p>

            <div className="space-y-4 mb-10">
              <button className="w-full flex items-center justify-between p-6 rounded-2xl border-2 border-brand-primary bg-brand-primary/5 hover:bg-brand-primary/10 transition-all group">
                <div className="text-left">
                  <p className="text-brand-primary font-black uppercase text-xs tracking-widest mb-1">Populaire</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">Formule LOUBA</p>
                </div>
                <div className="text-right">
                </div>
              </button>

              <button className="w-full flex items-center justify-between p-6 rounded-2xl border-2 border-gray-100 dark:border-gray-800 hover:border-brand-primary/30 transition-all group">
                <div className="text-left">
                  <p className="text-gray-400 font-black uppercase text-xs tracking-widest mb-1">Illimité</p>
                  <p className="text-xl font-black text-gray-900 dark:text-white">Formule Kôrô</p>
                </div>
                <div className="text-right">
                </div>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <button className="w-full sm:w-auto flex-1 bg-brand-primary text-white py-5 px-8 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-brand-primary/20 hover:scale-[1.02] active:scale-95 transition-all">
                Activer maintenant
              </button>
              
              <button 
                onClick={handleDeleteAccount}
                className="w-full sm:w-auto flex items-center justify-center gap-2 text-rose-500 hover:text-rose-600 font-black uppercase text-xs tracking-widest p-5 transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Non, supprimer mon compte
              </button>
            </div>
            
            <p className="text-center mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
              L'action de suppression est irréversible.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default TrialExpiredOverlay;
