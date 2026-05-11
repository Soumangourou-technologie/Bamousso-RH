import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');

  useEffect(() => {
    let isMounted = true;
    let retryCount = 0;
    const maxRetries = 3;

    const verifyPayment = async () => {
      const token = searchParams.get('token') || searchParams.get('reference') || searchParams.get('transaction_id');
      const companyId = searchParams.get('companyId') || searchParams.get('comp_id');
      const urlStatus = searchParams.get('status');
      
      // Si GeniusPay nous dit déjà que c'est bon dans l'URL
      if (urlStatus === 'completed' || urlStatus === 'success') {
        if (isMounted) setStatus('success');
        return;
      }

      if (!token && !companyId) {
        if (isMounted) setStatus('error');
        return;
      }

      try {
        const url = token 
          ? `/api/payment/confirm/${token}` 
          : `/api/payment/confirm/by-company/${companyId}`;
        
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

  // Redirection automatique vers LOGIN après 2 secondes si succès
  useEffect(() => {
    if (status === 'success') {
      const timer = setTimeout(() => {
        try {
          navigate('/login?success=true');
        } catch (e) {
          window.location.assign('/login?success=true');
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [status, navigate]);

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
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 text-white">Paiement Réussi !</h1>
            <p className="text-gray-400 mb-8">
              Votre espace entreprise est maintenant activé.
            </p>
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-[#ff5722] text-white px-8 py-4 rounded-2xl font-bold hover:opacity-90 transition-all shadow-lg shadow-orange-500/20"
            >
              Se connecter maintenant
            </button>
            <p className="mt-4 text-xs text-gray-500">Redirection vers la page de connexion dans 2s...</p>
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
