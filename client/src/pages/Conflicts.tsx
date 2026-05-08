import { ShieldAlert } from 'lucide-react';

const ConflictsPage = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl p-8">
      <ShieldAlert className="w-16 h-16 text-orange-400 mb-4" />
      <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Gestion des Conflits</h1>
      <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-md">
        Cet espace sécurisé pour la gestion des conflits et des cas disciplinaires est en cours de finalisation et sera bientôt disponible.
      </p>
    </div>
  );
};

export default ConflictsPage;
