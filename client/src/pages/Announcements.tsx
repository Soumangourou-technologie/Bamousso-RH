import { useEffect, useState } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { Megaphone, MessageSquare, Plus, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

interface Post {
  id: string;
  title: string;
  content: string;
  category: string;
  createdAt: string;
  author: {
    firstName: string;
    lastName: string;
    jobTitle: string;
    role: string;
  };
  comments: any[];
}

const AnnouncementsPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const fetchPosts = async () => {
    try {
      const res = await api.get<Post[]>('/announcements');
      setPosts(res.data);
    } catch (error) {
      console.error('Error fetching announcements', error);
    }
  };

  useEffect(() => {
    void fetchPosts();
    window.addEventListener('app:refresh', fetchPosts);
    return () => window.removeEventListener('app:refresh', fetchPosts);
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/announcements', { title, content, category: 'ANNOUNCEMENT' });
      setIsCreating(false);
      setTitle('');
      setContent('');
      void fetchPosts();
    } catch (error) {
      console.error('Error creating announcement', error);
    }
  };

  const canAnnounce = user?.role === 'COMPANY_ADMIN' || user?.role === 'HR_MANAGER';

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex justify-between items-center bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-8 text-white shadow-xl shadow-orange-500/20">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <Megaphone className="w-8 h-8" /> Actualités
          </h1>
          <p className="text-orange-100 mt-2 text-lg">Restez informé des dernières nouvelles de l'entreprise.</p>
        </div>
        {canAnnounce && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsCreating(!isCreating)}
            className="flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-xl font-bold shadow-lg transition-shadow"
          >
            <Plus className="w-5 h-5" /> Publier
          </motion.button>
        )}
      </div>

      {isCreating && canAnnounce && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700"
        >
          <h2 className="text-2xl font-bold mb-6">Nouvelle Annonce</h2>
          <form onSubmit={handleCreate} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Titre</label>
              <input required value={title} onChange={e => setTitle(e.target.value)} type="text" className="w-full p-4 text-lg rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition" placeholder="Un titre accrocheur..." />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Contenu</label>
              <textarea required value={content} onChange={e => setContent(e.target.value)} rows={5} className="w-full p-4 rounded-2xl border border-gray-200 dark:border-gray-700 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-4 focus:ring-orange-500/20 focus:border-orange-500 outline-none transition resize-none" placeholder="Partagez la nouvelle avec l'équipe..."></textarea>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsCreating(false)} className="px-6 py-3 font-semibold text-gray-500 hover:bg-gray-100 rounded-xl transition">Annuler</button>
              <button type="submit" className="bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900 px-8 py-3 rounded-xl font-bold hover:opacity-90 transition shadow-lg">Publier</button>
            </div>
          </form>
        </motion.div>
      )}

      <div className="space-y-6">
        {posts.map((post, index) => (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            key={post.id}
            className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm hover:shadow-xl border border-gray-100 dark:border-gray-700 transition-shadow duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500"></div>
            
            <div className="flex items-start justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300 font-bold text-lg">
                  {post.author.firstName[0]}{post.author.lastName[0]}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">{post.author.firstName} {post.author.lastName}</h3>
                  <p className="text-sm text-gray-500">{post.author.jobTitle || 'Direction'} • {new Date(post.createdAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                </div>
              </div>
              <span className="bg-orange-100 text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest">
                Annonce
              </span>
            </div>

            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white mb-4">{post.title}</h2>
            <div className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed text-lg mb-8">
              {post.content}
            </div>

            <div className="flex items-center gap-6 pt-6 border-t border-gray-100 dark:border-gray-700 text-gray-500 font-medium">
              <button className="flex items-center gap-2 hover:text-orange-500 transition">
                <MessageSquare className="w-5 h-5" /> {post.comments.length} Commentaires
              </button>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4" /> Publié à {new Date(post.createdAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </motion.div>
        ))}

        {posts.length === 0 && (
          <div className="text-center py-20 text-gray-500 bg-white dark:bg-gray-800 rounded-3xl border border-dashed border-gray-300 dark:border-gray-700">
            <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-xl font-medium">Aucune annonce pour le moment.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnnouncementsPage;
