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
          <li><strong>Statistiques rapides :</strong> Suivez l'évolution de vos effectifs et vos KPIs (Chiffre d'affaires, dépenses, etc.).</li>
          <li><strong>Raccourcis :</strong> Accédez rapidement aux actions fréquentes en fonction de votre rôle.</li>
        </ul>
      </div>
    )
  },
  '/dashboard/super-admin': {
    title: 'Tableau de bord Super Admin',
    content: (
      <div className="space-y-4">
        <p>Gérez l'ensemble de la plateforme SaaS BAMOUSSO RH.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Entreprises :</strong> Voyez le nombre total d'entreprises inscrites et leurs abonnements.</li>
          <li><strong>Revenus :</strong> Suivez le MRR (Revenu Mensuel Récurrent).</li>
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
          <li><strong>Valider :</strong> Si vous êtes Manager RH, vous verrez les demandes en attente de validation.</li>
        </ul>
      </div>
    )
  },
  '/departments': {
    title: 'Départements',
    content: (
      <div className="space-y-4">
        <p>Structurez votre entreprise en créant des départements et des équipes.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Créer un département :</strong> Définissez un nom et assignez un manager.</li>
          <li><strong>Organisation :</strong> Regroupez vos employés par spécialité (ex: Marketing, Tech, Ventes).</li>
        </ul>
      </div>
    )
  },
  '/attendance': {
    title: 'Pointage',
    content: (
      <div className="space-y-4">
        <p>Suivez les présences et les heures d'arrivée/départ de vos employés avec géolocalisation.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Bouton de pointage :</strong> L'employé clique simplement sur "Commencer" en arrivant, et "Terminer" en partant.</li>
          <li><strong>Géolocalisation :</strong> Le système capture automatiquement la position GPS au moment du pointage (affichable sur la carte).</li>
          <li><strong>Historique :</strong> Exportez la feuille de présence complète au format PDF.</li>
        </ul>
      </div>
    )
  },
  '/tasks': {
    title: 'Tâches',
    content: (
      <div className="space-y-4">
        <p>Gérez les projets et assignez des tâches à votre équipe.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Nouvelle tâche :</strong> Définissez un titre, une description, une échéance et assignez-la.</li>
          <li><strong>Statuts :</strong> Suivez l'avancement (À faire, En cours, Terminé).</li>
        </ul>
      </div>
    )
  },
  '/messaging': {
    title: 'Messagerie',
    content: (
      <div className="space-y-4">
        <p>Communiquez en temps réel avec les autres membres de l'entreprise.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Discussions privées :</strong> Envoyez des messages directs à vos collègues.</li>
          <li><strong>Groupes :</strong> Créez des canaux de discussion par département ou projet.</li>
        </ul>
      </div>
    )
  },
  '/explanations': {
    title: 'Demandes d\'Explications',
    content: (
      <div className="space-y-4">
        <p>Gérez la discipline et les rappels à l'ordre.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Adresser une demande :</strong> Envoyez formellement une demande d'explication suite à un incident ou retard.</li>
          <li><strong>Réponses :</strong> L'employé peut répondre directement dans le système.</li>
        </ul>
      </div>
    )
  },
  '/suggestions': {
    title: 'Boîte à Suggestions',
    content: (
      <div className="space-y-4">
        <p>Récoltez les idées et avis anonymes (ou non) de vos collaborateurs.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Soumettre :</strong> Les employés peuvent proposer des idées d'amélioration.</li>
          <li><strong>Analyse :</strong> Les managers RH peuvent lire et prendre en compte les suggestions pour améliorer le bien-être.</li>
        </ul>
      </div>
    )
  },
  '/work-schedules': {
    title: 'Horaires de travail',
    content: (
      <div className="space-y-4">
        <p>Définissez les plages horaires officielles de l'entreprise.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Création :</strong> Définissez les heures d'ouverture et de fermeture.</li>
          <li><strong>Assignation :</strong> Attribuez des horaires spécifiques selon les employés ou départements.</li>
        </ul>
      </div>
    )
  },
  '/analytics': {
    title: 'Analytique',
    content: (
      <div className="space-y-4">
        <p>Analysez les performances et la santé de votre entreprise.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Graphiques :</strong> Visualisez l'évolution de la masse salariale, du turnover, etc.</li>
          <li><strong>Rapports :</strong> Exportez des rapports détaillés pour la direction.</li>
        </ul>
      </div>
    )
  },
  '/documents': {
    title: 'Documents',
    content: (
      <div className="space-y-4">
        <p>Centralisez tous vos documents administratifs.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Dossiers :</strong> Stockez les contrats, les politiques internes, et formulaires.</li>
          <li><strong>Partage :</strong> Rendez certains documents accessibles à tous ou seulement à certains rôles.</li>
        </ul>
      </div>
    )
  },
  '/announcements': {
    title: 'Annonces',
    content: (
      <div className="space-y-4">
        <p>Diffusez des informations importantes à toute l'entreprise.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Publier :</strong> Créez une annonce (ex: Fermeture exceptionnelle, Nouveauté RH).</li>
          <li><strong>Visibilité :</strong> Chaque employé verra l'annonce dès sa prochaine connexion.</li>
        </ul>
      </div>
    )
  },
  '/missions/livraison': {
    title: 'Livraisons',
    content: (
      <div className="space-y-4">
        <p>Suivez les missions de livraison de vos coursiers/livreurs.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Assignation :</strong> Donnez des courses avec adresses et colis.</li>
          <li><strong>Statut :</strong> Suivez si la livraison est en cours ou terminée.</li>
        </ul>
      </div>
    )
  },
  '/missions/prospection': {
    title: 'Prospections',
    content: (
      <div className="space-y-4">
        <p>Suivez les missions sur le terrain de vos commerciaux.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Objectifs :</strong> Assignez des zones à prospecter.</li>
          <li><strong>Rapports :</strong> Les commerciaux peuvent noter leurs retours terrain.</li>
        </ul>
      </div>
    )
  },
  '/client-registration': {
    title: 'Enregistrement Client',
    content: (
      <div className="space-y-4">
        <p>Ajoutez de nouveaux clients ou prospects à votre base (CRM).</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Formulaire :</strong> Renseignez les informations du client (Nom, Contact, Entreprise).</li>
          <li><strong>Suivi :</strong> Préparez le terrain pour de futures ventes.</li>
        </ul>
      </div>
    )
  },
  '/client-registrations': {
    title: 'Clients Commerciaux',
    content: (
      <div className="space-y-4">
        <p>Consultez la base de données des clients enregistrés par l'équipe commerciale.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Annuaire :</strong> Retrouvez tous les contacts clients.</li>
          <li><strong>Export :</strong> Téléchargez la liste pour vos campagnes.</li>
        </ul>
      </div>
    )
  },
  '/settings': {
    title: 'Paramètres',
    content: (
      <div className="space-y-4">
        <p>Configurez les préférences de votre entreprise sur Bamousso RH.</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Profil :</strong> Modifiez le nom, le logo et les informations de l'entreprise.</li>
          <li><strong>Abonnement :</strong> Gérez votre facturation et votre forfait (Fitini, Louba, Koro).</li>
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

  // Find matching route or use default by checking if pathname starts with the key (useful for nested routes like /dashboard/admin)
  const currentHelpKey = Object.keys(helpContent).find(key => location.pathname === key || (key !== '/' && location.pathname.startsWith(key))) || 'default';
  const currentHelp = helpContent[currentHelpKey];

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
