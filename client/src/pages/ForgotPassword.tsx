import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { Building2, Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  const [devToken, setDevToken] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    
    setIsLoading(true);
    setError('');
    
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setIsSuccess(true);
      if (res.data.devResetToken) {
        setDevToken(res.data.devResetToken);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Une erreur est survenue.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <Building2 className="w-8 h-8 text-orange-500" />
            <span className="text-2xl font-black text-gray-900 dark:text-white">Bamousso</span>
          </Link>
          <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Mot de passe oublié ?</h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Entrez votre adresse email pour recevoir un lien de réinitialisation.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-100 dark:border-gray-700">
          {isSuccess ? (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Lien envoyé !</h3>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
                Si un compte est associé à cette adresse, vous recevrez un email contenant un lien pour modifier votre mot de passe.
              </p>
              
              {/* Fallback for DEV mode */}
              {devToken && (
                <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-xl border border-orange-200 dark:border-orange-800 mb-6 text-left">
                  <p className="text-xs text-orange-600 dark:text-orange-400 font-bold mb-2 uppercase">Mode Dev - Lien simulé</p>
                  <Link to={`/reset-password?token=${devToken}`} className="text-sm font-medium text-blue-600 underline break-all hover:text-blue-800">
                    Cliquez ici pour simuler la réception de l'email
                  </Link>
                </div>
              )}

              <Link to="/login" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
                <ArrowLeft className="w-4 h-4" /> Retour à la connexion
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 p-4 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email de votre compte</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="w-5 h-5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all text-gray-900 dark:text-white font-semibold"
                    placeholder="exemple@entreprise.com"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-orange-500 text-white py-3 rounded-xl font-bold hover:bg-orange-600 transition-colors flex justify-center items-center gap-2"
              >
                {isLoading ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  "Envoyer le lien"
                )}
              </button>

              <div className="text-center pt-2">
                <Link to="/login" className="text-sm font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-300">
                  Annuler
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
