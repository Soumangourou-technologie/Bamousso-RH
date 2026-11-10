import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { trackMetaEvent } from '../utils/metaPixel';
import { useAuth } from '../context/AuthContext';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const { user } = useAuth();

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const verifyPayment = async () => {
      const token = searchParams.get('reference') || searchParams.get('transaction_id') || searchParams.get('token') || sessionStorage.getItem('bamousso.pendingPayment');
      if (!token) {
        if (isMounted) setStatus('error');
        return;
      }

      try {
        const url = `/api/payment/confirm/${encodeURIComponent(token)}`;
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}${url}`, {
          headers: { 
            'Accept': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && isMounted) {
            setStatus('success');
            sessionStorage.removeItem('bamousso.pendingPayment');
            trackMetaEvent('Subscribe', { status: 'SUCCESS', method: 'API_VERIFY' });
          } else if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(verifyPayment, 3000);
          } else if (isMounted) {
            setStatus('error');
          }
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(verifyPayment, 3000);
        } else if (isMounted) {
          setStatus('error');
        }
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(verifyPayment, 3000);
        } else if (isMounted) {
          setStatus('error');
        }
      }
    };

    verifyPayment();
    return () => { isMounted = false; };
  }, [searchParams]);

  // Redirection automatique après 2 secondes si succès
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        try {
          navigate(user ? '/dashboard' : '/login');
        } catch (e) {
          window.location.assign(user ? '/dashboard' : '/login');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate, user]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a1614] px-6">
      <div className="text-center p-10 bg-[#251f1c] rounded-3xl shadow-2xl max-w-md w-full border border-white/5">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-16 h-16 text-[#ff5722] animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2 text-white">Vérification du paiement...</h1>
            <p className="text-gray-400">Veuillez patienter quelques instants.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6 drop-shadow-[0_0_15px_rgba(34,197,94,0.4)]" />
            <h1 className="text-4xl font-black mb-4 text-white tracking-tight">Paiement Réussi !</h1>
            <p className="text-gray-400 mb-8 font-medium">
              Félicitations ! Votre espace entreprise Bamousso RH est maintenant activé.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-[#ff5722] text-white px-8 py-5 rounded-2xl font-black hover:scale-[1.02] transition-all shadow-xl shadow-orange-500/30 uppercase tracking-widest text-xs premium-glow"
            >
              Se connecter maintenant
            </button>
            <p className="mt-6 text-[10px] text-gray-500 font-black uppercase tracking-[0.2em]">Redirection automatique dans 2s...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-20 h-20 text-orange-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 text-white">Traitement en cours</h1>
            <p className="text-gray-400 mb-8">
              Votre paiement est en cours de validation. Vous recevrez un e-mail dès que votre accès sera prêt.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-white text-gray-900 px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 transition-all"
            >
              Aller à la page de connexion
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
