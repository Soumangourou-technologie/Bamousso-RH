import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, CheckCircle, Users, Clock, Calendar, ArrowRight, Loader2, MessageCircle, X } from 'lucide-react';
import { PricingToggle } from '../components/PricingToggle';
import { FAQSection } from '../components/FAQSection';
import { BillingCycle, PlanType, PRICING_PLANS } from '@shared/pricing';
import api from '../utils/api';
import { trackMetaEvent } from '../utils/metaPixel';


const Landing = () => {
  const navigate = useNavigate();
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('MONTHLY');
  const [whatsappContacts, setWhatsappContacts] = useState<string[]>([]);
  const [isWhatsappOpen, setIsWhatsappOpen] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await api.get('/settings/public');
        if (res.data.contacts && res.data.contacts.length > 0) {
          setWhatsappContacts(res.data.contacts.filter((c: string) => c.trim() !== ''));
        }
      } catch (err) {
        console.error('Failed to fetch whatsapp contacts', err);
      }
    };
    void fetchContacts();
  }, []);

  const handleSelectPlan = (planId: PlanType) => {
    trackMetaEvent('InitiateCheckout', { planId, billingCycle });
    navigate('/register', { 
      state: { 
        selectedPlanId: planId, 
        billingCycle 
      } 
    });
  };

  return (
    <div className="dark min-h-screen bg-senufo bg-[#1a0f0a] font-sans text-white selection:bg-brand-primary selection:text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <Building2 className="w-8 h-8 text-brand-primary" />
          <span className="text-2xl font-black tracking-tight text-white">BAMOUSSO</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="#features" className="hidden md:inline-block font-bold text-gray-300 hover:text-brand-primary transition-colors text-sm uppercase tracking-wider">
            Fonctionnalités
          </a>
          <a href="#faq" className="hidden md:inline-block font-bold text-gray-300 hover:text-brand-primary transition-colors text-sm uppercase tracking-wider">
            FAQ
          </a>
          <a href="#pricing" className="hidden md:inline-block font-bold text-gray-300 hover:text-brand-primary transition-colors text-sm uppercase tracking-wider">
            Tarifs
          </a>
          <Link to="/register" className="bg-white/10 hover:bg-brand-primary text-white border border-white/20 hover:border-brand-primary px-5 py-2.5 rounded-full font-bold transition-all text-sm shadow-md hover:shadow-brand-primary/30">
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
        <div className="absolute top-10 right-0 w-150 h-150 bg-brand-primary/20 blur-[120px] rounded-full pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-125 h-125 bg-brand-accent/10 blur-[100px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>
        
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
                className="text-6xl md:text-7xl lg:text-8xl font-black mb-8 tracking-tighter leading-none text-white"
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
                <Link to="/register" className="w-full sm:w-auto bg-brand-primary text-white px-10 py-5 rounded-full font-black text-lg hover:scale-105 transition-all flex items-center justify-center gap-3 shadow-2xl shadow-brand-primary/30 premium-glow">
                  S'inscrire / Créer un compte <ArrowRight className="w-6 h-6" />
                </Link>
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
                <div className="absolute inset-0 bg-linear-to-t from-brand-900/60 to-transparent mix-blend-multiply"></div>
              </div>
              
              {/* Floating element */}
              <motion.div 
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -bottom-8 -left-8 glass-card p-8 rounded-4xl shadow-2xl flex items-center gap-5"
              >
                <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg">
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

      {/* Video Tutorials Section */}
      <div id="tutorials" className="py-24 bg-surface-panel/30 relative border-y border-white/5">
        <div className="container mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6 tracking-tighter">
              Découvrez <span className="text-brand-primary">Bamousso RH</span> en action
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto font-medium">
              Regardez ces courtes vidéos pour voir à quel point il est facile de centraliser et simplifier votre gestion RH.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            {[
              { id: "_9RB5Dp9qR4", title: "Comment créer le compte de son employé dans l'application Bamousso ?" },
              { id: "eY4lkXjIKNs", title: "Comment un employé pointe son arrivée dans l'application Bamousso ?" },
              { id: "hCf7WPoeRKY", title: "Comment attribuer une tâche à son employé dans l'application Bamousso ?" }
            ].map((video, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.2 }}
                className="glass-card rounded-4xl overflow-hidden shadow-2xl border border-white/10 group flex flex-col"
              >
                <div className="relative aspect-video w-full bg-black">
                  <iframe 
                    src={`https://www.youtube.com/embed/${video.id}?rel=0`} 
                    title={video.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="absolute top-0 left-0 w-full h-full border-0"
                  ></iframe>
                </div>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-white group-hover:text-brand-primary transition-colors">{video.title}</h3>
                </div>
              </motion.div>
            ))}
          </div>
          
          <div className="flex justify-center">
             <a href="https://wa.me/2250706045256" target="_blank" rel="noopener noreferrer" className="bg-brand-primary text-white px-10 py-5 rounded-full font-black text-lg hover:scale-105 transition-all flex items-center gap-3 shadow-2xl shadow-brand-primary/30 premium-glow">
                Contactez-nous maintenant <MessageCircle className="w-6 h-6" />
             </a>
          </div>
        </div>
      </div>

      {/* Features with Collage */}
      <div id="features" className="py-32 relative overflow-hidden">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-20 mb-20">
            <div className="lg:w-2/5">
              <h2 className="text-5xl font-black text-white mb-8 tracking-tighter leading-tight">La Force d'une Gestion <span className="text-brand-primary">Centralisée</span></h2>
              <p className="text-gray-400 text-lg mb-10 font-medium leading-relaxed">Une suite complète d'outils pensés pour l'excellence opérationnelle en Afrique. Libérez-vous de la paperasse et concentrez-vous sur l'essentiel : l'humain.</p>
              <div className="rounded-4xl overflow-hidden shadow-2xl border border-white/10 group">
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

      {/* FAQ Section */}
      <FAQSection />

      {/* Pricing Section */}
      <div id="pricing" className="py-24 bg-[#1a0f0a] relative bg-senufo border-t border-white/5">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-extrabold mb-4 text-white">Nos Formules</h2>
            <p className="text-gray-400 text-lg mb-8">Choisissez le pilier qui soutiendra votre croissance.</p>
            <PricingToggle billingCycle={billingCycle} onChange={setBillingCycle} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* FITINI */}
            <PricingCard 
              title="FITINI (Petit)"
              price={billingCycle === 'YEARLY' ? PRICING_PLANS.FITINI.priceYearly.toLocaleString() : PRICING_PLANS.FITINI.priceMonthly.toLocaleString()}
              period={billingCycle === 'YEARLY' ? '/an' : '/mois'}
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
              price={billingCycle === 'YEARLY' ? PRICING_PLANS.LOUBA.priceYearly.toLocaleString() : PRICING_PLANS.LOUBA.priceMonthly.toLocaleString()}
              period={billingCycle === 'YEARLY' ? '/an' : '/mois'}
              description="Idéal pour 1 à 10 employés."
              features={[
                'Jusqu\'à 10 employés', 
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
              price={billingCycle === 'YEARLY' ? PRICING_PLANS.KORO.priceYearly.toLocaleString() : PRICING_PLANS.KORO.priceMonthly.toLocaleString()}
              period={billingCycle === 'YEARLY' ? '/an' : '/mois'}
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
      <footer className="bg-[#1a0f0a] border-t border-white/10 py-12 text-white">
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center items-center gap-2 mb-6">
            <Building2 className="w-6 h-6 text-brand-primary" />
            <span className="text-xl font-bold tracking-widest text-white">BAMOUSSO</span>
          </div>
          <p className="text-gray-400 text-sm mb-6">
            La solution RH qui incarne la sagesse et la force de l'Afrique.
          </p>
          <div className="flex justify-center gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-brand-primary">Mentions légales</a>
            <a href="#" className="hover:text-brand-primary">Confidentialité</a>
            <a href="#" className="hover:text-brand-primary">Contact</a>
          </div>
          <div className="mt-8 text-xs text-gray-500">
            &copy; {new Date().getFullYear()} Bamousso SaaS. Fait avec fierté en Côte d'Ivoire.
          </div>
        </div>
      </footer>

      {/* WhatsApp Floating Button */}
      {whatsappContacts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          <AnimatePresence>
            {isWhatsappOpen && (
              <motion.div 
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="mb-4 bg-white p-6 rounded-4xl shadow-2xl border border-gray-100 flex flex-col gap-4 min-w-70"
              >
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-black text-gray-900">Payer en espèces</h4>
                  <button onClick={() => setIsWhatsappOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-gray-500 font-medium mb-2">
                  Contactez-nous sur WhatsApp pour souscrire à un abonnement Bamousso RH ou payer en espèces.
                </p>
                {whatsappContacts.map((contact, idx) => {
                  // Format for WhatsApp API: remove spaces/plus
                  const formattedContact = contact.replace(/\D/g, '');
                  const message = encodeURIComponent("Bonjour, je souhaite souscrire à un abonnement Bamousso RH");
                  const whatsappUrl = `https://wa.me/${formattedContact}?text=${message}`;
                  return (
                    <a 
                      key={idx}
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 w-full p-4 bg-green-50 hover:bg-green-100 text-green-700 rounded-2xl transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                        <MessageCircle className="w-5 h-5 fill-current" />
                      </div>
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-green-600/70">Contact {idx + 1}</div>
                        <div className="font-black">{contact}</div>
                      </div>
                    </a>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            onClick={() => setIsWhatsappOpen(!isWhatsappOpen)}
            className="w-16 h-16 bg-[#25D366] hover:bg-[#1ebd5a] text-white rounded-full shadow-[0_8px_30px_rgb(37,211,102,0.4)] flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
            title="Nous contacter sur WhatsApp"
          >
            {isWhatsappOpen ? <X className="w-7 h-7" /> : <MessageCircle className="w-8 h-8 fill-current" />}
          </button>
        </div>
      )}
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
      <AnimatePresence mode="wait">
        <motion.span 
          key={price}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          className="text-5xl font-black text-white tracking-tighter"
        >
          {price}
        </motion.span>
      </AnimatePresence>
      <div className="flex flex-col mb-1 ml-2">
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
