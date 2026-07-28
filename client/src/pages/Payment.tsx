import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, Lock, Phone, Loader2 } from 'lucide-react';
import api from '../utils/api';

const Payment = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'SUCCESS'>('IDLE');

  // Si on atterrit ici sans plan (ex: rafraichissement), on redirige.
  useEffect(() => {
    if (!location.state?.plan) {
      navigate('/dashboard', { replace: true });
    }
  }, [location, navigate]);

  const plan = location.state?.plan;
  const companyName = location.state?.companyName;
  const companyId = location.state?.companyId;

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('PROCESSING');

    try {
      const response = await api.post('/payment/initiate', {
        amount: plan.finalPrice.toString(),
        description: `Abonnement Bamousso - Formule ${plan.name}${location.state?.extraEmployees > 0 ? ` (+${location.state.extraEmployees} employés)` : ''}`,
        companyId: companyId,
        plan: plan.id || plan.name,
        billingCycle: location.state?.billingCycle || 'MONTHLY',
        extraEmployees: location.state?.extraEmployees || 0,
        isAddOn: location.state?.isAddOn || false
      });

      if (response.data.success && response.data.url) {
        try {
          const targetUrl = new URL(response.data.url);
          const isAllowedHost = 
            targetUrl.hostname === 'geniuspay.ci' ||
            targetUrl.hostname.endsWith('.geniuspay.ci') ||
            targetUrl.hostname === 'genius.ci' ||
            targetUrl.hostname.endsWith('.genius.ci') ||
            targetUrl.hostname === 'pay.genius.ci';

          if ((targetUrl.protocol === 'https:' || targetUrl.protocol === 'http:') && isAllowedHost) {
            window.location.href = targetUrl.toString();
          } else {
            alert("URL de paiement invalide ou non sécurisée.");
            setStatus('IDLE');
          }
        } catch {
          alert("URL de paiement invalide.");
          setStatus('IDLE');
        }
      } else {
        alert("Erreur: " + (response.data.message || "Impossible d'initier le paiement."));
        setStatus('IDLE');
      }
    } catch (error: any) {
      console.error("Payment Error:", error);
      const errorMsg = error.response?.data?.message || error.response?.data?.error || "Erreur de connexion au serveur.";
      alert(`Erreur: ${errorMsg}`);
      setStatus('IDLE');
    }
  };

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-3xl w-full space-y-8">
        
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center justify-center gap-3">
            <Lock className="w-8 h-8 text-green-500" /> Paiement Sécurisé
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Finalisez la création de votre espace <span className="font-bold">{companyName}</span>
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row border border-gray-100 dark:border-gray-700">
          
          {/* Résumé de commande */}
          <div className="md:w-2/5 bg-gray-50 dark:bg-gray-900/50 p-8 border-r border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Résumé de la commande</h3>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Forfait</p>
                  <p className="font-bold text-xl text-gray-900 dark:text-white">{plan.name}</p>
                  {location.state?.extraEmployees > 0 && (
                    <p className="text-[10px] font-bold text-orange-500 mt-1">
                      + {location.state.extraEmployees} employé(s) sup.
                    </p>
                  )}
                </div>
              </div>
              <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Total</span>
                  <span className="text-2xl font-black text-orange-500">{plan.finalPrice.toLocaleString()} FCFA</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" /> Paiement 100% sécurisé
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <CheckCircle className="w-4 h-4 text-green-500" /> Activation immédiate
              </div>
            </div>
          </div>

          {/* Formulaire de paiement */}
          <div className="md:w-3/5 p-8 relative">
            
            {status === 'SUCCESS' ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="absolute inset-0 bg-white dark:bg-gray-800 z-10 flex flex-col items-center justify-center p-8 text-center"
              >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Paiement Validé !</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-6">Votre espace entreprise est maintenant prêt.</p>
                <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-sm text-orange-500 mt-4 font-bold">Redirection vers le tableau de bord...</p>
              </motion.div>
            ) : status === 'PROCESSING' ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ repeat: Infinity, duration: 1.5 }}>
                  <Phone className="w-16 h-16 text-orange-500 mb-6" />
                </motion.div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Validation en cours</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Veuillez consulter votre téléphone et taper votre code secret pour valider le paiement.
                </p>
              </motion.div>
            ) : null}

            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-2xl mb-8 border border-orange-100 dark:border-orange-800">
              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed text-center font-medium">
                Paiement par Mobile Money ou Carte Bancaire 100% sécurisé.
                <br /><br />
                Vous allez être redirigé vers notre plateforme de paiement certifiée pour finaliser votre transaction en toute sécurité.
              </p>
            </div>

            <form onSubmit={handlePayment} className="space-y-6">
              <button
                type="submit"
                disabled={status === 'PROCESSING'}
                className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-orange-500/30 flex justify-center items-center gap-2 text-lg"
              >
                {status === 'PROCESSING' ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Lock className="w-5 h-5" /> Payer {plan.finalPrice.toLocaleString()} FCFA
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default Payment;
