import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Locked = () => {
  const { company, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md w-full max-w-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Accès suspendu
        </h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          {company?.name ? (
            <>
              L’entreprise <span className="font-semibold">{company.name}</span> est actuellement
              verrouillée (abonnement non à jour).
            </>
          ) : (
            <>Cette entreprise est actuellement verrouillée (abonnement non à jour).</>
          )}
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              const basePrice = company?.plan === 'KORO' ? 14700 : company?.plan === 'LOUBA' ? 7500 : 0;
              const extraCost = company?.plan === 'KORO' ? 0 : (company?.extraEmployees || 0) * 850;
              const finalPrice = basePrice + extraCost;
              
              navigate('/payment', {
                state: {
                  plan: {
                    id: company?.plan || 'LOUBA',
                    name: company?.plan || 'LOUBA',
                    finalPrice: finalPrice > 0 ? finalPrice : 7500,
                  },
                  extraEmployees: company?.extraEmployees || 0,
                  companyName: company?.name || 'Votre entreprise',
                  companyId: company?.id,
                  isAddOn: false
                }
              });
            }}
            className="w-full sm:w-auto bg-orange-500 text-white py-2 px-4 rounded-lg hover:bg-orange-600 transition font-bold"
          >
            Renouveler l'abonnement
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="w-full sm:w-auto bg-gray-200 text-gray-900 py-2 px-4 rounded hover:bg-gray-300 transition font-medium dark:bg-gray-700 dark:text-white dark:hover:bg-gray-600"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
};

export default Locked;

