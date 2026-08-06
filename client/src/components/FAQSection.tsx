import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, HelpCircle, Sparkles, TrendingUp, Clock, ShieldCheck, Smartphone, Users } from 'lucide-react';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  badge?: string;
  icon?: any;
}

const faqData: FAQItem[] = [
  {
    id: 'why-bamousso',
    question: "Pourquoi choisir BAMOUSSO RH plutôt que de tout gérer sur Excel ou papier ?",
    answer: "Excel et le papier font perdre un temps précieux et provoquent des erreurs coûteuses (retards non détectés, calculs de paie erronés, fiches de congé perdues). Bamousso RH automatise tout en un seul endroit : pointage géolocalisé, calcul automatique des salaires, gestion des absences et rapports analytiques en 1 clic. Vous économisez jusqu'à 15 heures par mois et éliminez 100% des erreurs d'inattention.",
    badge: "Gain de temps",
    icon: Clock
  },
  {
    id: 'business-impact',
    question: "En quoi BAMOUSSO RH améliore-t-il directement la rentabilité de mon entreprise ?",
    answer: "Le suivi rigoureux du temps de présence et des équipes terrain réduit les retards répétés et l'absentéisme non justifié. De plus, la gestion claire et transparente des salaires et congés renforce la confiance, réduit les conflits internes et motive vos collaborateurs. Une équipe mieux organisée et valorisée est jusqu'à 30% plus productive !",
    badge: "Rentabilité & ROI",
    icon: TrendingUp
  },
  {
    id: 'african-context',
    question: "Est-ce adapté aux PME et entreprises en Côte d'Ivoire et en Afrique ?",
    answer: "Absolument ! Bamousso RH a été conçu spécifiquement pour les réalités africaines : gestion flexible des employés (mensuels, journaliers, horaires), calcul précis de la paie en FCFA, pointage mobile avec géolocalisation adaptée au terrain et support local réactif par WhatsApp et téléphone.",
    badge: "100% Adapté Local",
    icon: Sparkles
  },
  {
    id: 'ease-of-use',
    question: "Mon équipe n'est pas très technique, est-ce facile à prendre en main ?",
    answer: "Oui, l'application est d'une simplicité enfantine. Vos employés peuvent pointer leur arrivée ou demander un congé en 2 secondes depuis leur smartphone ou un ordinateur. Pour la direction et les RH, le tableau de bord visuel résume tout d'un coup d'œil sans aucune compétence informatique requise.",
    badge: "Simplicité",
    icon: Smartphone
  },
  {
    id: 'field-tracking',
    question: "Comment BAMOUSSO RH m'aide à suivre mes commerciaux et agents sur le terrain ?",
    answer: "Grâce au système de pointage géolocalisé et à la gestion des missions, vous visualisez l'emplacement exact et les heures de passage de vos équipes terrain. Vous pouvez attribuer des ordres de mission, suivre leur avancement et valider leur présence en temps réel.",
    badge: "Suivi Terrain",
    icon: Users
  },
  {
    id: 'security-data',
    question: "Mes données d'entreprise et les salaires sont-ils en sécurité ?",
    answer: "La confidentialité et la sécurité de vos données sont notre priorité absolue. Toutes les informations sont chiffrées (normes bancaires), sauvegardées quotidiennement et protégées par des rôles d'accès stricts (Super Admin, Admin, RH, Employé) pour garantir que seules les personnes autorisées puissent consulter la paie.",
    badge: "Sécurité Maximale",
    icon: ShieldCheck
  }
];

export const FAQSection = () => {
  const [openId, setOpenId] = useState<string | null>('why-bamousso');

  const toggleItem = (id: string) => {
    setOpenId(prev => (prev === id ? null : id));
  };

  return (
    <section id="faq" className="py-24 relative overflow-hidden bg-[#1a0f0a] border-t border-white/5">
      {/* Glow Effects */}
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-brand-primary/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-brand-accent/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="container mx-auto px-6 relative z-10 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-16">
          <motion.span 
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 py-2 px-5 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary font-black text-xs uppercase tracking-widest mb-4"
          >
            <HelpCircle className="w-4 h-4" /> Vos Questions, Nos Réponses
          </motion.span>
          
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-4xl md:text-5xl font-black text-white tracking-tighter mb-4"
          >
            Pourquoi <span className="text-brand-primary">BAMOUSSO RH</span> est bon pour votre Business ?
          </motion.h2>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-gray-400 text-lg max-w-2xl mx-auto font-medium"
          >
            Tout ce que vous devez savoir pour comprendre la valeur et la puissance de notre solution RH clé en main.
          </motion.p>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqData.map((item, idx) => {
            const isOpen = openId === item.id;
            const Icon = item.icon;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08 }}
                className={`rounded-3xl border transition-all duration-300 overflow-hidden ${
                  isOpen 
                    ? 'bg-white/10 dark:bg-gray-800/80 border-brand-primary/40 shadow-xl shadow-brand-primary/5' 
                    : 'bg-white/5 dark:bg-gray-900/40 border-white/10 hover:border-white/20'
                }`}
              >
                <button
                  onClick={() => toggleItem(item.id)}
                  className="w-full p-6 md:p-8 text-left flex items-start justify-between gap-4 group focus:outline-none"
                  aria-expanded={isOpen}
                >
                  <div className="flex items-start gap-4 pr-4">
                    {Icon && (
                      <div className={`mt-0.5 p-3 rounded-2xl flex items-center justify-center shrink-0 transition-colors ${
                        isOpen ? 'bg-brand-primary text-white shadow-lg shadow-brand-primary/30' : 'bg-white/10 text-gray-400 group-hover:text-white'
                      }`}>
                        <Icon className="w-6 h-6" />
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-3 mb-1 flex-wrap">
                        <span className="text-lg md:text-xl font-black text-white tracking-tight group-hover:text-brand-primary transition-colors">
                          {item.question}
                        </span>
                        {item.badge && (
                          <span className="text-[10px] uppercase font-black tracking-widest px-3 py-1 rounded-full bg-brand-primary/20 text-brand-primary border border-brand-primary/30">
                            {item.badge}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={`p-2 rounded-full border transition-transform duration-300 shrink-0 ${
                    isOpen 
                      ? 'rotate-180 bg-brand-primary text-white border-brand-primary' 
                      : 'bg-white/5 text-gray-400 border-white/10 group-hover:text-white'
                  }`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                      <div className="px-6 md:px-8 pb-8 pt-2 text-gray-300 text-base md:text-lg leading-relaxed font-medium border-t border-white/5">
                        {item.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* CTA Box under FAQ */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.5 }}
          className="mt-16 glass-card p-8 md:p-12 rounded-[2.5rem] text-center border-brand-primary/30 relative overflow-hidden"
        >
          <div className="relative z-10 max-w-2xl mx-auto">
            <h3 className="text-2xl md:text-3xl font-black text-white mb-3">
              Vous avez d'autres questions sur l'impact de Bamousso ?
            </h3>
            <p className="text-gray-400 text-sm md:text-base mb-8 font-medium">
              Notre équipe d'experts RH est à votre disposition pour analyser vos besoins et vous faire une démonstration personnalisée.
            </p>
            <a 
              href="#pricing"
              className="inline-flex items-center gap-3 bg-brand-primary text-white px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-brand-primary/30"
            >
              <Sparkles className="w-5 h-5" /> Tester BAMOUSSO RH Maintenant
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
