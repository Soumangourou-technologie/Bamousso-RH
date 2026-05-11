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
      const token = searchParams.get('token') || searchParams.get('reference');
      const companyId = searchParams.get('companyId');
      const urlStatus = searchParams.get('status');
      
      if (urlStatus === 'completed' || urlStatus === 'success') {
        setStatus('success');
        // Ne pas effacer localStorage pour garder la session
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        
        // Redirection intelligente
        setTimeout(() => {
          if (user?.role === 'SUPER_ADMIN') navigate('/dashboard-superadmin');
          else if (user?.role === 'COMPANY_ADMIN') navigate('/dashboard-admin');
          else navigate('/login');
        }, 3000);
      }

      if (!token && !companyId) return;

      try {
        const url = token 
          ? `/api/payment/confirm/${token}` 
          : `/api/payment/confirm/by-company/${companyId}`;
          
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}${url}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const data = await response.json();
        
        if (data.success) {
          setStatus('success');
          const userStr = localStorage.getItem('user');
          const user = userStr ? JSON.parse(userStr) : null;
          setTimeout(() => {
            if (user?.role === 'SUPER_ADMIN') navigate('/dashboard-superadmin');
            else if (user?.role === 'COMPANY_ADMIN') navigate('/dashboard-admin');
            else navigate('/login');
          }, 3000);
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(verifyPayment, 3000);
        }
      } catch (error) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(verifyPayment, 3000);
        }
      }
    };

    verifyPayment();
  }, [searchParams, navigate]);

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
              onClick={() => {
                const userStr = localStorage.getItem('user');
                const u = userStr ? JSON.parse(userStr) : null;
                if (u?.role === 'SUPER_ADMIN') navigate('/dashboard-superadmin');
                else if (u?.role === 'COMPANY_ADMIN') navigate('/dashboard-admin');
                else navigate('/login');
              }}
              className="w-full bg-[#ff5722] text-white px-8 py-4 rounded-2xl font-bold hover:opacity-90 transition-all"
            >
              Accéder à mon tableau de bord
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <AlertCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
            <h1 className="text-3xl font-bold mb-4 text-gray-900 dark:text-white">Oups !</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8">{message}</p>
            <button 
              onClick={() => navigate('/')}
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl font-bold"
            >
              Retour à l'accueil
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default PaymentSuccess;
