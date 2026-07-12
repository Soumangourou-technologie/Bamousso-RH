import { useState } from 'react';
import { HelpCircle, X, Info } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const helpContent: Record<string, { title: string; content: React.ReactNode }> = {
  '/dashboard': {
    title: 'Tableau de bord',
    content: (
      <div className="space-y-4">
        <p>Le tableau de bord vous donne une vue d'ensemble de l'activité de votre entreprise.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Statistiques rapides :</strong> Suivez l'évolution de vos effectifs et vos KPIs.</li>
          <li><strong>Raccourcis :</strong> Accédez rapidement aux actions fréquentes.</li>
        </ul>
      </div>
    )
  },
  '/employees': {
    title: 'Annuaire des employés',
    content: (
      <div className="space-y-4">
        <p>Cette page vous permet de gérer tout votre personnel.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Inviter un employé :</strong> Remplissez le formulaire en haut pour envoyer une invitation. L'employé recevra un email avec son mot de passe.</li>
          <li><strong>Modifier un profil :</strong> Survolez la ligne d'un employé dans le tableau pour voir apparaître l'icône de modification (crayon) sur son rôle, département ou salaire.</li>
          <li><strong>Suspendre/Réactiver :</strong> Le cadenas permet de bloquer temporairement l'accès d'un employé.</li>
        </ul>
      </div>
    )
  },
  '/salaries': {
    title: 'Fiches de paie',
    content: (
      <div className="space-y-4">
        <p>Gérez la rémunération et les fiches de paie de vos employés.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Générer une fiche :</strong> Cliquez sur le bouton de génération pour créer un brouillon de fiche de paie basé sur le salaire de base et les primes/déductions du mois.</li>
          <li><strong>Validation :</strong> Une fois générée, vous devez valider la fiche pour qu'elle devienne visible par l'employé.</li>
          <li><strong>Paiement :</strong> Marquez-la comme "Payée" une fois le virement effectué.</li>
        </ul>
      </div>
    )
  },
  '/accounting': {
    title: 'Trésorerie',
    content: (
      <div className="space-y-4">
        <p>Suivez les entrées et sorties d'argent internes à votre entreprise.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Nouvelle transaction :</strong> Enregistrez vos dépenses ou revenus.</li>
          <li><strong>Notes de frais :</strong> Validez ou rejetez les demandes de remboursement soumises par vos employés.</li>
          <li><strong>Export Excel :</strong> Téléchargez l'historique complet pour votre expert-comptable.</li>
        </ul>
      </div>
    )
  },
  '/roles': {
    title: 'Rôles Spécifiques',
    content: (
      <div className="space-y-4">
        <p>Créez des accès sur-mesure pour certains employés.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Création :</strong> Cliquez sur "Créer un rôle" et cochez uniquement les permissions nécessaires.</li>
          <li><strong>Attribution :</strong> Allez ensuite sur la page "Employés" et assignez ce rôle spécifique à la personne de votre choix en modifiant son Rôle principal.</li>
        </ul>
      </div>
    )
  },
  '/leaves': {
    title: 'Congés',
    content: (
      <div className="space-y-4">
        <p>Gérez les absences et les congés.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Demander :</strong> Cliquez sur "Nouvelle demande" pour soumettre vos congés.</li>
          <li><strong>Valider :</strong> Si vous êtes Manager RH, vous verrez les demandes en attente de validation dans l'onglet approprié.</li>
        </ul>
      </div>
    )
  },
  'default': {
    title: 'Aide & Support',
    content: (
      <p>Bienvenue sur Bamousso RH ! Naviguez dans le menu de gauche pour découvrir les différentes fonctionnalités du logiciel.</p>
    )
  }
};

const HelpModule = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Find matching route or use default
  const currentHelp = helpContent[location.pathname] || helpContent['default'];

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="p-2.5 rounded-2xl hover:bg-brand-primary/20 transition-all duration-300 text-brand-primary hover:text-brand-300 relative group"
        title="Aide sur cette page"
      >
        <HelpCircle className="w-5 h-5" />
        <span className="absolute -top-1 -right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-40"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-primary"></span>
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            
            <motion.div 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-full max-w-sm bg-gray-900 border-l border-white/10 h-full shadow-2xl flex flex-col z-10"
            >
              <div className="p-6 flex items-center justify-between border-b border-white/10 bg-brand-900">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-brand-primary/20 rounded-xl">
                    <Info className="w-5 h-5 text-brand-primary" />
                  </div>
                  <h2 className="text-xl font-black text-white tracking-tight">Guide d'utilisation</h2>
                </div>
                <button 
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                <div className="bg-brand-primary/10 border border-brand-primary/20 p-5 rounded-4xl">
                  <h3 className="text-lg font-black text-white mb-4 flex items-center gap-2">
                    {currentHelp.title}
                  </h3>
                  <div className="text-gray-300 text-sm leading-relaxed">
                    {currentHelp.content}
                  </div>
                </div>

                <div className="mt-8">
                  <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest text-center">
                    Besoin de plus d'assistance ?
                  </p>
                  <a href="/support" className="mt-4 block w-full text-center py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold text-white transition-all">
                    Contacter le support client
                  </a>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default HelpModule;
