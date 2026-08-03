import { useState, useEffect, useRef } from 'react';
import { Bell, Trash2, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';

const NotificationCenter = () => {
  const { notifications, unreadCount, markAsRead, deleteNotification } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotification(id);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-2xl hover:bg-white dark:bg-[#1f1f1f]/10 transition-all duration-300 group"
      >
        <Bell className="w-6 h-6 text-gray-400 group-hover:text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 inline-flex items-center justify-center w-5 h-5 text-[10px] font-black leading-none text-white bg-brand-primary rounded-full shadow-[0_0_8px_rgba(255,87,34,0.6)]">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-[-1rem] sm:right-0 mt-4 w-[calc(100vw-2rem)] sm:w-96 bg-[#1a0f0a] border border-white/10 rounded-[2rem] overflow-hidden z-50 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-in fade-in zoom-in duration-300">
          <div className="py-4 px-6 bg-white dark:bg-[#1f1f1f]/10 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-sm font-black text-white uppercase tracking-widest">Notifications</h3>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 dark:text-gray-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="max-h-[32rem] overflow-y-auto custom-scrollbar">
            {notifications.length === 0 ? (
              <div className="py-12 text-center text-gray-500 dark:text-gray-400 font-bold text-sm">Aucune notification pour le moment</div>
            ) : (
              <ul className="divide-y divide-white/5">
                {notifications.map((notification) => (
                  <li 
                    key={notification.id} 
                    className={`p-6 transition cursor-pointer relative group ${!notification.read ? 'bg-orange-50/50 dark:bg-brand-primary/10' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    {!notification.read && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary shadow-[0_0_8px_rgba(255,87,34,0.8)]" />
                    )}
                    <div className="flex justify-between items-start mb-2">
                        <span className={`font-black text-sm tracking-tight ${!notification.read ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors'}`}>
                            {notification.title}
                        </span>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={(e) => handleDelete(notification.id, e)}
                                className="text-gray-400 dark:text-gray-500 hover:text-rose-500 p-1 opacity-0 group-hover:opacity-100 transition-all"
                                title="Supprimer"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    <p className={`text-xs mb-3 line-clamp-2 font-medium leading-relaxed ${!notification.read ? 'text-gray-700 dark:text-gray-200' : 'text-gray-500 dark:text-gray-400'}`}>{notification.message}</p>
                    <p className="text-[10px] text-brand-primary font-black uppercase tracking-wider">
                        {new Date(notification.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })} • {new Date(notification.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
