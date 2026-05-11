import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Eye, EyeOff, Lock, Mail, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError('');
    try {
      const response = await api.post('/auth/login', data);
      login(response.data.token, response.data.user, response.data.company);
      if (response.data.company?.isLocked) {
        navigate('/locked');
      } else {
        const role = response.data.user?.role;
        if (role === 'SUPER_ADMIN') navigate('/dashboard/super-admin');
        else if (role === 'COMPANY_ADMIN') navigate('/dashboard/admin');
        else if (role === 'HR_MANAGER' || role === 'HR_ASSISTANT') navigate('/dashboard/hr');
        else navigate('/dashboard/employee');
      }
    } catch (err: any) {
      const status = err.response?.status;
      const message = err.response?.data?.message || 'Une erreur est survenue';
      setError(status ? `${status} - ${message}` : message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1a0f0a] px-4 relative overflow-hidden">
      {/* Premium Background elements */}
      <div className="absolute top-0 left-0 w-full h-full bg-[url('/bg-pattern.jpg')] opacity-5 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-brand-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-brand-accent/10 blur-[100px] rounded-full pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-10 rounded-[3rem] w-full max-w-md border-white/10 shadow-2xl relative z-10"
      >
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-brand-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-brand-primary/20">
            <Lock className="w-10 h-10 text-brand-primary" />
          </div>
          <h2 className="text-4xl font-black text-white tracking-tight mb-2">Espace Client</h2>
          <p className="text-gray-400 font-medium">Gérez votre capital humain avec sagesse.</p>
        </div>
        
        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 px-6 py-4 rounded-2xl mb-8 text-sm font-bold flex items-center gap-3"
          >
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Email Professionnel</label>
            <div className="relative">
              <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                {...register('email', { required: 'Email requis' })}
                type="email"
                placeholder="nom@entreprise.com"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-6 py-5 text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 transition-all font-bold"
              />
            </div>
            {errors.email && <span className="text-red-500 text-xs font-bold ml-2">{errors.email.message as string}</span>}
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black text-gray-500 uppercase tracking-[0.2em] ml-2">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <input
                {...register('password', { required: 'Mot de passe requis' })}
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-14 pr-14 py-5 text-white placeholder-gray-600 focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 transition-all font-bold"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && <span className="text-red-500 text-xs font-bold ml-2">{errors.password.message as string}</span>}
            <div className="flex justify-end pr-2">
              <Link to="/forgot-password" className="text-xs font-black text-brand-primary uppercase tracking-widest hover:text-brand-accent transition-colors">
                Oublié ?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white py-5 rounded-2xl font-black text-lg shadow-xl shadow-brand-primary/20 transition-all active:scale-95 flex items-center justify-center gap-3 premium-glow uppercase tracking-widest text-xs mt-4"
          >
            {loading ? (
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>Se connecter <ArrowRight className="w-5 h-5" /></>
            )}
          </button>
        </form>

        <div className="mt-10 text-center">
          <p className="text-gray-500 font-bold text-sm">
            Pas encore de compte ?{' '}
            <Link to="/register" className="text-brand-primary hover:text-brand-accent transition-colors">
              Créer un espace entreprise
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
