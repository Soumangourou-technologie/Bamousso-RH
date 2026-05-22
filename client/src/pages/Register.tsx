import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Eye, EyeOff, Building2, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const plans = [
  { id: 'FITINI', name: 'FITINI', price: '4.500 FCFA', rawPrice: 4500, maxBase: 5 },
  { id: 'LOUBA', name: 'LOUBA', price: '7.500 FCFA', rawPrice: 7500, maxBase: 10 },
  { id: 'KORO', name: 'Kôrô', price: '14.700 FCFA', rawPrice: 14700, maxBase: Infinity }
];

const Register = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(location.state?.selectedPlanId || 'FITINI');
  const [extraEmployees, setExtraEmployees] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setIsLoading(true);
    setError('');
    try {
      const planDetails = plans.find(p => p.id === selectedPlan);
      const totalAmount = (planDetails?.rawPrice || 0) + (extraEmployees * 850);

      // 1. Appel API pour créer l'entreprise et l'utilisateur
      const response = await api.post('/auth/register-company', {
        ...data,
        plan: selectedPlan,
        extraEmployees: extraEmployees
      });
      
      // 2. Connexion automatique
      login(response.data.user, response.data.company);
      
      // 3. Redirection vers le paiement
      navigate('/payment', { 
        state: { 
          plan: { ...planDetails, finalPrice: totalAmount }, // Paiement MENSUEL
          extraEmployees,
          companyName: data.companyName,
          companyId: response.data.company?.id || response.data.user?.companyId
        } 
      });
    } catch (err: any) {
      const message = err.response?.data?.message || 'Une erreur est survenue lors de l\'inscription.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Building2 className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-black text-gray-900 dark:text-white">BAMOUSSO</span>
          </Link>
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">
            Créez votre espace entreprise
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Rejoignez des centaines d'entreprises qui gèrent leurs RH simplement.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
          
          {/* Panneau de gauche : Sélection de l'offre */}
          <div className="md:w-1/3 bg-gray-50 dark:bg-gray-900/50 p-8 border-r border-gray-100 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Choisissez votre forfait</h3>
            <div className="space-y-4">
              {plans.map((plan) => (
                <label 
                  key={plan.id}
                  className={`block relative p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedPlan === plan.id ? 'border-orange-500 bg-orange-50 dark:bg-orange-500/10' : 'border-gray-200 dark:border-gray-700 hover:border-orange-300'}`}
                >
                  <input 
                    type="radio" 
                    name="plan" 
                    value={plan.id} 
                    checked={selectedPlan === plan.id}
                    onChange={(e) => setSelectedPlan(e.target.value)}
                    className="sr-only"
                  />
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-bold ${selectedPlan === plan.id ? 'text-orange-600 dark:text-orange-400' : 'text-gray-900 dark:text-white'}`}>{plan.name}</span>
                    {selectedPlan === plan.id && <CheckCircle className="w-5 h-5 text-orange-500" />}
                  </div>
                  <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{plan.price} / mois</span>
                </label>
              ))}
            </div>

            {selectedPlan !== 'KORO' && (
              <div className="mt-8 p-4 bg-orange-50 dark:bg-orange-900/20 rounded-2xl border border-orange-200 dark:border-orange-800">
                <label className="block text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-2">
                  Employés supplémentaires (+850/mois)
                </label>
                <div className="flex items-center gap-4">
                  <input 
                    type="number" min="0" value={extraEmployees}
                    onChange={(e) => setExtraEmployees(parseInt(e.target.value) || 0)}
                    className="w-20 p-2 bg-white dark:bg-gray-800 border border-orange-200 dark:border-orange-700 rounded-lg text-gray-900 dark:text-white font-bold"
                  />
                  <span className="text-xs text-gray-500 font-medium">
                    Total : {(plans.find(p => p.id === selectedPlan)?.maxBase || 0) + extraEmployees} employés max
                  </span>
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-500">Total Mensuel</span>
                <span className="text-xl font-black text-orange-500">
                  {((plans.find(p => p.id === selectedPlan)?.rawPrice || 0) + (extraEmployees * 850))} FCFA
                </span>
              </div>
            </div>
          </div>

          {/* Panneau de droite : Formulaire */}
          <div className="md:w-2/3 p-8">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl mb-6 font-medium text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nom de l'entreprise</label>
                <input
                  {...register('companyName', { required: "Le nom de l'entreprise est requis" })}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                  placeholder="Ex: TechCorp Inc."
                />
                {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message as string}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Prénom de l'Admin</label>
                  <input
                    {...register('firstName', { required: "Le prénom est requis" })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message as string}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Nom de l'Admin</label>
                  <input
                    {...register('lastName', { required: "Le nom est requis" })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message as string}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email Professionnel</label>
                  <input
                    {...register('email', { required: "L'email est requis", pattern: { value: /\S+@\S+\.\S+/, message: "Email invalide" } })}
                    type="email"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                    placeholder="admin@entreprise.com"
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message as string}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Téléphone / WhatsApp</label>
                  <input
                    {...register('phone', { required: "Le numéro est requis" })}
                    type="tel"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white"
                    placeholder="+225 00 00 00 00 00"
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message as string}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Mot de passe</label>
                <div className="relative">
                  <input
                    {...register('password', { required: "Le mot de passe est requis", minLength: { value: 6, message: "6 caractères minimum" } })}
                    type={showPassword ? "text" : "password"}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white pr-12"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message as string}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-500 text-white py-4 rounded-xl font-bold hover:bg-orange-600 transition-colors shadow-lg shadow-orange-500/30 flex justify-center items-center"
              >
                {isLoading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  "Valider et passer au paiement"
                )}
              </button>
              
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                Vous avez déjà un compte ? <Link to="/login" className="text-orange-500 font-bold hover:underline">Connectez-vous</Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
