import { useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Settings as SettingsIcon, Image as ImageIcon, Save, CreditCard, Users, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { usePlan } from '../hooks/usePlan';

const SettingsPage = () => {
  const { company, login, user } = useAuth();
  const navigate = useNavigate();
  const [logoUrl, setLogoUrl] = useState(company?.logoUrl || '');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Créer un aperçu
      setLogoUrl(URL.createObjectURL(file));
    }
  };

  const handleSaveLogo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !company) return;

    setIsSaving(true);
    setMessage('');
    
    const formData = new FormData();
    formData.append('logo', selectedFile);

    try {
      const res = await api.put(`/companies/${company.id}/logo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      // Mettre à jour le contexte avec le nouveau logo
      if (user) {
        login(user, res.data.company);
      }
      setMessage('Logo mis à jour avec succès !');
    } catch (error: any) {
      console.error('Error updating logo', error);
      const msg = error.response?.data?.message || 'Erreur lors de la mise à jour du logo.';
      setMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddEmployee = () => {
    if (!company) return;
    
    // On redirige vers le paiement pour 1 employé supplémentaire (1000 FCFA)
    navigate('/payment', {
      state: {
        plan: {
          id: company.plan,
          name: company.plan,
          finalPrice: 850,
          price: "850 FCFA"
        },
        extraEmployees: 1, // On ajoute 1
        isAddOn: true,
        companyName: company.name,
        companyId: company.id
      }
    });
  };

  const { maxEmployees: getMaxEmployees } = usePlan();
  const maxEmployees = getMaxEmployees();

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-orange-500" /> Paramètres de l'Entreprise
        </h1>
        <p className="text-gray-500 mt-1">Personnalisez l'expérience Bamousso pour vos collaborateurs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Section Logo */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <ImageIcon className="w-5 h-5 text-gray-400" /> Identité Visuelle
          </h2>
          
          <form onSubmit={handleSaveLogo} className="space-y-6">
            <div className="flex flex-col gap-6 items-center text-center">
              <div className="w-40 h-40 rounded-3xl border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-gray-50 dark:bg-gray-900 shrink-0 overflow-hidden relative group shadow-inner">
                {logoUrl ? (
                  <img src={logoUrl} alt="Aperçu du logo" className="w-full h-full object-contain p-4 transition-transform group-hover:scale-110" />
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <ImageIcon className="w-10 h-10 text-gray-300" />
                    <span className="text-xs text-gray-400 font-bold px-4">Aucun logo</span>
                  </div>
                )}
                <label className="absolute inset-0 bg-brand-primary/80 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-black uppercase tracking-widest backdrop-blur-sm">
                  Modifier
                  <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </label>
              </div>
              
              <div className="w-full space-y-4">
                {message && (
                  <div className={`p-3 rounded-xl text-xs font-bold uppercase tracking-wider ${message.includes('Erreur') ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                    {message}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={isSaving || !selectedFile}
                  className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-orange-500 to-orange-600 text-white px-6 py-3.5 rounded-2xl font-black shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all disabled:opacity-30 disabled:grayscale"
                >
                  {isSaving ? 'Enregistrement...' : <><Save className="w-5 h-5" /> Enregistrer</>}
                </button>
              </div>
            </div>
          </form>
        </motion.div>

        {/* Section Abonnement */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700 flex flex-col"
        >
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-gray-400" /> Abonnement & Offre
          </h2>

          <div className="flex-1 space-y-6">
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Formule actuelle</span>
                <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary text-[10px] font-black rounded-md">{company?.subscriptionStatus}</span>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">{company?.plan}</p>
            </div>

            <div className="p-4 bg-orange-500/5 rounded-2xl border border-orange-500/10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                  <Users className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Capacité d'employés</p>
                  <p className="text-xs text-gray-500">
                    <span className="font-black text-orange-500">{maxEmployees === null || maxEmployees === Infinity ? 'Illimité' : maxEmployees}</span> collaborateurs autorisés
                  </p>
                </div>
              </div>
              
              {company?.plan !== 'KORO' && (
                <div className="mt-4 pt-4 border-t border-orange-500/10">
                  <p className="text-[10px] text-gray-400 font-bold uppercase mb-3">Besoin de plus de place ?</p>
                  <button 
                    onClick={handleAddEmployee}
                    className="w-full flex items-center justify-center gap-2 p-3 bg-orange-500 text-white rounded-xl text-xs font-black shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition-colors"
                  >
                    <Plus className="w-4 h-4" /> Ajouter 1 employé (+850 FCFA/mois)
                  </button>
                </div>
              )}
            </div>
            
            <p className="text-[10px] text-gray-400 text-center leading-tight">
              Pour changer de formule ou résilier, veuillez contacter le support client Bamousso.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SettingsPage;

