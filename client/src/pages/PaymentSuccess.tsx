import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2, AlertCircle } from 'lucide-react';

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const message = 'Vérification de votre paiement en cours...';

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;

    const verifyPayment = async () => {
      // Détection plus large des paramètres (GeniusPay peut changer les noms)
      const token = searchParams.get('token') || searchParams.get('reference') || searchParams.get('transaction_id');
      const companyId = searchParams.get('companyId') || searchParams.get('comp_id');
      const urlStatus = searchParams.get('status');
      
      if (urlStatus === 'completed' || urlStatus === 'success') {
        setStatus('success');
        return;
      }

      if (!token && !companyId) {
        console.warn("Aucun token ou companyId trouvé dans l'URL");
        // Si on a rien, on attend un peu avant de déclarer une erreur ou on redirige
        return;
      }

      try {
        const url = token 
          ? `/api/payment/confirm/${token}` 
          : `/api/payment/confirm/by-company/${companyId}`;
        
        const apiUrl = import.meta.env.VITE_API_URL || '';
        const response = await fetch(`${apiUrl}${url}`, {
          headers: { 
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Accept': 'application/json'
          }
        });

        // Vérifier si la réponse est bien du JSON avant de parser
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          const data = await response.json();
          if (data.success) {
            setStatus('success');
          } else if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(verifyPayment, 3000);
          } else {
            setStatus('error');
          }
        } else {
          throw new Error("Réponse serveur non-JSON");
        }
      } catch (error) {
        console.error("Erreur vérification paiement:", error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(verifyPayment, 3000);
        } else {
          setStatus('error');
        }
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

  const handleRedirect = () => {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr || userStr === "undefined") {
        navigate('/login');
        return;
      }
      const user = JSON.parse(userStr);
      if (user?.role === 'SUPER_ADMIN') navigate('/dashboard/super-admin');
      else if (user?.role === 'COMPANY_ADMIN') navigate('/dashboard/admin');
      else navigate('/dashboard/employee');
    } catch (e) {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#1a1614] px-6">
      <div className="text-center p-10 bg-white dark:bg-[#251f1c] rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-white/5">
        {status === 'verifying' && (
          <>
            <Loader2 className="w-16 h-16 text-[#ff5722] animate-spin mx-auto mb-6" />
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">Vérification...</h1>
            <p className="text-gray-500">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Paiement Réussi !</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Votre compte est maintenant actif. Redirection automatique dans quelques secondes...
            </p>
            <button 
              onClick={handleRedirect}
              className="w-full bg-[#ff5722] text-white px-8 py-4 rounded-2xl font-bold hover:opacity-90 transition-all"
            >
              Accéder à mon tableau de bord
            </button>
            {/* Redirection automatique après 5s */}
            {useEffect(() => {
               const timer = setTimeout(handleRedirect, 5000);
               return () => clearTimeout(timer);
            }, [])}
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Vérification en cours...</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">
              Le paiement est peut-être encore en traitement par GeniusPay. Vos accès seront activés dès réception de la confirmation.
            </p>
            <button 
              onClick={() => navigate('/dashboard')}
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl font-bold"
            >
              Aller au tableau de bord
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
