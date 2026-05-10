import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Building2, CheckCircle, Users, Clock, Calendar, ArrowRight, Loader2 } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  const handleSelectPlan = (planId: string) => {
    navigate('/register', { state: { selectedPlanId: planId } });
  };

  return (
    <div className="min-h-screen bg-senufo bg-surface-base font-sans text-text-primary selection:bg-brand-primary selection:text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8 text-brand-primary" />
          <span className="text-2xl font-black tracking-tight text-text-primary">BAMOUSSO</span>
        </div>
        <div className="flex items-center gap-4">
          <Link to="/register" className="hidden md:inline-block font-semibold text-text-secondary hover:text-brand-primary transition-colors">
            S'inscrire
          </Link>
          <Link to="/login" className="bg-brand-primary hover:bg-brand-800 text-white px-6 py-2.5 rounded-full font-bold shadow-lg shadow-brand-primary/30 transition-all hover:-translate-y-0.5">
            Espace Client
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-20 pb-32 lg:pb-40 overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute top-10 right-0 w-[600px] h-[600px] bg-brand-primary/20 blur-[120px] rounded-full pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-brand-accent/10 blur-[100px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-8">
            <motion.div 
              className="lg:w-1/2 text-center lg:text-left"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0 },
                visible: {
                  opacity: 1,
                  transition: { staggerChildren: 0.15 }
                }
              }}
            >
              <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                <span className="inline-flex py-2 px-6 rounded-full glass-card text-brand-primary font-black text-xs mb-8 border-brand-accent/30 shadow-lg items-center gap-2 uppercase tracking-[0.2em]">
                  <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse shadow-[0_0_8px_rgba(255,87,34,0.8)]"></span>
                  Le Logiciel RH Inspiré par l'Afrique
                </span>
              </motion.div>
              
              <motion.h1 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="text-6xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tighter leading-[1] text-white"
              >
                BAMOUSSO : La <span className="text-brand-primary">Mère</span> de votre Gestion RH.
              </motion.h1>
              
              <motion.p 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed font-medium"
              >
                Comme une mère qui veille sur son foyer avec sagesse et autorité, Bamousso centralise et protège le capital humain de votre entreprise. 
              </motion.p>
              
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
              >
                <a href="#pricing" className="w-full sm:w-auto bg-brand-primary text-white px-10 py-5 rounded-full font-black text-lg hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-brand-primary/30 premium-glow">
                  Découvrir nos offres <ArrowRight className="w-6 h-6" />
                </a>
                <Link to="/login" className="w-full sm:w-auto glass-card text-white px-10 py-5 rounded-full font-black text-lg hover:border-brand-primary/50 transition-all flex items-center justify-center gap-2">
                  Espace Client
                </Link>
              </motion.div>
            </motion.div>

            <motion.div 
              className="lg:w-1/2 w-full max-w-lg mx-auto lg:max-w-none relative"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            >
              <div className="relative rounded-[3rem] overflow-hidden shadow-2xl shadow-black/50 border border-white/10 transform lg:-rotate-2 hover:rotate-0 transition-transform duration-700">
                <img src="/hero-masks.jpg" alt="Masques Africains Bamousso" className="w-full h-auto object-cover object-center aspect-square" />
                <div className="absolute inset-0 bg-gradient-to-t from-brand-900/60 to-transparent mix-blend-multiply"></div>
              </div>
              
              {/* Floating element */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-8 -left-8 glass-card p-8 rounded-[2rem] shadow-2xl flex items-center gap-5"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mb-1">Gestion Humaine</div>
                  <div className="font-black text-white text-lg tracking-tight">100% Centralisée</div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Features with Collage */}
      <div className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-20 mb-20">
            <div className="lg:w-2/5">
              <h2 className="text-5xl font-black text-white mb-8 tracking-tighter leading-tight">La Force d'une Gestion <span className="text-brand-primary">Centralisée</span></h2>
              <p className="text-gray-400 text-lg mb-10 font-medium leading-relaxed">Une suite complète d'outils pensés pour l'excellence opérationnelle en Afrique. Libérez-vous de la paperasse et concentrez-vous sur l'essentiel : l'humain.</p>
              <div className="rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 group">
                <img src="/africa-collage.jpg" alt="Art Africain" className="w-full h-64 object-cover transition-transform duration-700 group-hover:scale-110" />
              </div>
            </div>
            
            <div className="lg:w-3/5 grid grid-cols-1 md:grid-cols-2 gap-8">
              <FeatureCard 
                icon={<Clock className="w-8 h-8 text-brand-primary" />}
                title="Pointage & Présence"
                description="Suivi rigoureux du temps de travail, adapté aux réalités du terrain ivoirien."
                delay={0.1}
              />
              <FeatureCard 
                icon={<Calendar className="w-8 h-8 text-brand-accent" />}
                title="Sagesse Administrative"
                description="Gestion fluide des congés et des absences. Transparence totale pour vos équipes."
                delay={0.3}
              />
              <FeatureCard 
                icon={<Users className="w-8 h-8 text-brand-primary" />}
                title="Cœur de l'Entreprise"
                description="Un annuaire dynamique pour renforcer les liens entre vos collaborateurs."
                delay={0.5}
              />
              <FeatureCard 
                icon={<CheckCircle className="w-8 h-8 text-white" />}
                title="Validation Rapide"
                description="Approuvez les demandes en un clic depuis n'importe où, même sur mobile."
                delay={0.7}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div id="pricing" className="py-24 bg-surface-base relative bg-senufo">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-extrabold mb-4 text-brand-900">Nos Formules</h2>
            <p className="text-text-secondary text-lg">Choisissez le pilier qui soutiendra votre croissance.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* FITINI */}
            <PricingCard 
              title="FITINI (Petit)"
              price="4.500"
              period="/mois"
              description="L'essentiel pour 1 à 5 employés."
              features={[
                'Jusqu\'à 5 employés', 
                'Pointage en temps réel', 
                'Gestion des congés', 
                'Support par ticket', 
                'Gestion des tâches',
                '850 FCFA / employé sup.'
              ]}
              delay={0.2}
              isLoading={false}
              onSelect={() => handleSelectPlan('FITINI')}
            />
            
            {/* LOUBA (Popular) */}
            <PricingCard 
              title="LOUBA (Moyen)"
              price="7.500"
              period="/mois"
              description="Idéal pour 1 à 7 employés."
              features={[
                'Jusqu\'à 7 employés', 
                'Analytique RH avancé', 
                'Messagerie Interne (Boss/Staff)', 
                'Gestion des conflits (Anonymat)', 
                'Demandes d\'explication',
                'Gestion des salaires',
                '850 FCFA / employé sup.'
              ]}
              isPopular={true}
              delay={0.4}
              isLoading={false}
              onSelect={() => handleSelectPlan('LOUBA')}
            />
            
            {/* Kôrô */}
            <PricingCard 
              title="Kôrô (Grand)"
              price="14.700"
              period="/mois"
              description="L'excellence avec employés illimités."
              features={[
                'Employés illimités', 
                'Toutes les fonctions incluses', 
                'Support VIP illimité', 
                'Accompagnement dédié',
                'Version Illimitée'
              ]}
              delay={0.6}
              isLoading={false}
              onSelect={() => handleSelectPlan('KORO')}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-surface-panel border-t border-surface-border py-12">
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <Building2 className="w-6 h-6 text-brand-primary" />
            <span className="text-xl font-bold tracking-widest">BAMOUSSO</span>
          </div>
          <p className="text-text-secondary text-sm mb-6">
            La solution RH qui incarne la sagesse et la force de l'Afrique.
          </p>
          <div className="flex justify-center gap-6 text-sm text-text-tertiary">
            <a href="#" className="hover:text-brand-primary">Mentions légales</a>
            <a href="#" className="hover:text-brand-primary">Confidentialité</a>
            <a href="#" className="hover:text-brand-primary">Contact</a>
          </div>
          <div className="mt-8 text-xs text-text-tertiary">
            &copy; {new Date().getFullYear()} Bamousso SaaS. Fait avec fierté en Côte d'Ivoire.
          </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description, delay = 0 }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.5, delay }}
    className="glass-card p-10 rounded-[2.5rem] hover:shadow-2xl transition-all group"
  >
    <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center shadow-lg mb-8 transition-transform group-hover:scale-110 group-hover:bg-brand-primary/10">
      {icon}
    </div>
    <h3 className="text-2xl font-black text-white mb-4 tracking-tight">{title}</h3>
    <p className="text-gray-500 font-medium leading-relaxed">{description}</p>
  </motion.div>
);

const PricingCard = ({ title, price, period, description, features, isPopular, delay = 0, onSelect, isLoading }: any) => (
  <motion.div 
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, delay }}
    className={`relative glass-card rounded-[3rem] p-10 flex flex-col transition-all hover:-translate-y-4 ${isPopular ? 'border-brand-primary shadow-2xl shadow-brand-primary/20 scale-105 z-10' : 'border-white/10 shadow-xl'}`}
  >
    {isPopular && (
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-primary text-white px-8 py-2 rounded-full text-xs font-black tracking-[0.2em] shadow-xl uppercase">
        Le plus populaire
      </div>
    )}
    <h3 className="text-3xl font-black text-white mb-3 tracking-tight">{title}</h3>
    <p className="text-gray-400 text-sm mb-8 h-12 font-medium leading-relaxed">{description}</p>
    <div className="mb-10 flex items-end gap-1">
      <span className="text-6xl font-black text-white tracking-tighter">{price}</span>
      <div className="flex flex-col mb-1">
        <span className="text-xs font-black text-brand-primary uppercase tracking-widest leading-none mb-1">FCFA</span>
        <span className="text-gray-500 font-bold text-sm leading-none">{period}</span>
      </div>
    </div>
    <ul className="space-y-5 mb-10 flex-1">
      {features.map((feature: string, idx: number) => (
        <li key={idx} className="flex items-start gap-4">
          <div className="mt-1 bg-brand-primary/20 p-1 rounded-full">
            <CheckCircle className="w-4 h-4 text-brand-primary" />
          </div>
          <span className="text-gray-300 font-bold text-sm">{feature}</span>
        </li>
      ))}
    </ul>
    <button 
      onClick={onSelect}
      disabled={isLoading}
      className={`w-full py-5 rounded-2xl font-black text-center transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-xs ${isPopular ? 'bg-brand-primary text-white shadow-xl shadow-brand-primary/30 hover:scale-[1.02] premium-glow' : 'bg-white/5 text-white hover:bg-white/10'}`}
    >
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "S'abonner"}
    </button>
  </motion.div>
);

export default Landing;
