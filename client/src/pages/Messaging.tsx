import { Search, Send, Paperclip, MoreVertical, X, ArrowLeft } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface Contact {
  id: string;
  name: string;
  role: string;
  isSupport: boolean;
  lastMsg?: string;
  time?: string;
  unread?: number;
}

interface Message {
  id: string;
  content: string;
  senderId: string;
  recipientId: string;
  createdAt: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

const Messaging = () => {
  const { user, onlineUsers, isSupportOnline } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const selectedContactRef = useRef<Contact | null>(null);

  useEffect(() => {
    selectedContactRef.current = selectedContact;
  }, [selectedContact]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [search, setSearch] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchContacts = async () => {
    try {
      const res = await api.get('/messages/contacts');
      setContacts(res.data);
    } catch (error) {
      console.error('Error fetching contacts', error);
    }
  };

  const fetchMessages = async (contactId: string) => {
    try {
      const res = await api.get(`/messages/${contactId}`);
      setMessages(res.data);
    } catch (error) {
      console.error('Error fetching messages', error);
    }
  };

  useEffect(() => {
    void fetchContacts();
    window.addEventListener('app:refresh', fetchContacts);
    return () => window.removeEventListener('app:refresh', fetchContacts);
  }, []);

  useEffect(() => {
    if (selectedContact) {
      void fetchMessages(selectedContact.id);
    }
  }, [selectedContact]);

  useEffect(() => {
    if (!user?.id || !supabase) return;

    const handleNewMessage = (msg: Message) => {
      const activeContact = selectedContactRef.current;
      
      // Update the active discussion if the message belongs to it
      if (activeContact && (
        (msg.senderId === activeContact.id && msg.recipientId === user.id) ||
        (msg.senderId === user.id && msg.recipientId === activeContact.id)
      )) {
        setMessages(prev => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      } else if (msg.recipientId === user.id) {
        // Message from another contact: increment unread badge
        setContacts(prev => prev.map(c => {
          if (c.id === msg.senderId) {
            return { 
              ...c, 
              unread: (c.unread || 0) + 1, 
              lastMsg: msg.content, 
              time: new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            };
          }
          return c;
        }));
      }
    };

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'Message',
        filter: `recipientId=eq.${user.id}`,
      }, (payload) => handleNewMessage(payload.new as Message))
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'Message',
        filter: `senderId=eq.${user.id}`,
      }, (payload) => handleNewMessage(payload.new as Message))
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert("Fichier trop volumineux. La taille maximale est de 5Mo.");
        return;
      }
      setSelectedFile(file);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
    try {
      const fileName = `${Date.now()}-${file.name}`;
      const { data, error } = await supabase.storage
        .from('documents') // On utilise le bucket existant 'documents'
        .upload(`chat/${fileName}`, file);

      if (error) throw error;
      
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(data.path);
        
      return publicUrl;
    } catch (error) {
      console.error('Upload error', error);
      return null;
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessage.trim() && !selectedFile) || !selectedContact) return;

    setIsUploading(true);
    try {
      let attachmentUrl = undefined;
      let attachmentType = undefined;

      if (selectedFile) {
        attachmentUrl = await uploadFile(selectedFile);
        attachmentType = selectedFile.type;
      }

      const res = await api.post('/messages', {
        recipientId: selectedContact.id,
        content: newMessage || (selectedFile ? `Fichier envoyé : ${selectedFile.name}` : ''),
        attachmentUrl,
        attachmentType
      });
      
      setMessages(prev => {
        if (prev.some(m => m.id === res.data.id)) return prev;
        return [...prev, res.data];
      });
      setNewMessage('');
      setSelectedFile(null);
    } catch (error) {
      console.error('Error sending message', error);
    } finally {
      setIsUploading(false);
    }
  };

  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-180px)] md:h-[calc(100vh-160px)] flex flex-col md:flex-row gap-4 md:gap-8 overflow-hidden relative">
      {/* Sidebar de messagerie */}
      <div className={`w-full md:w-96 flex flex-col gap-6 h-full transition-all duration-300 ${selectedContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="glass-card p-4 md:p-6 rounded-4xl border border-white/5 flex flex-col h-full overflow-hidden">
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 w-5 h-5" />
            <input 
              type="text" 
              placeholder="Rechercher une discussion..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-12 pr-6 py-4 bg-white dark:bg-[#1f1f1f]/5 border border-white/10 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-brand-primary placeholder:text-gray-600 dark:text-gray-400 transition-all"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
            {filteredContacts.map((chat) => (
              <button 
                key={chat.id}
                onClick={() => setSelectedContact(chat)}
                className={`w-full p-4 rounded-2xl flex items-center gap-4 transition-all group ${selectedContact?.id === chat.id ? 'bg-brand-primary/20 border border-brand-primary/30' : 'hover:bg-white dark:bg-[#1f1f1f]/5 border border-transparent'}`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-black shrink-0 shadow-lg transition-transform group-hover:scale-105 ${chat.isSupport ? 'bg-linear-to-br from-brand-primary to-brand-accent' : 'bg-gray-700'}`}>
                  {chat.name[0]}
                </div>
                <div className="min-w-0 text-left flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-sm font-black text-white truncate">{chat.name}</p>
                    </div>
                    {chat.time && <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold shrink-0">{chat.time}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1">
                    {(chat.isSupport ? isSupportOnline : onlineUsers?.includes(chat.id)) ? (
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow shadow-emerald-500/50" />
                        En ligne
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <span className="w-1.5 h-1.5 bg-gray-50 dark:bg-gray-800/500 rounded-full" />
                        Hors ligne
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate font-medium">{chat.lastMsg || (chat.isSupport ? 'Comment pouvons-nous vous aider ?' : 'Démarrer une discussion')}</p>
                </div>
                {chat.unread ? (
                  <div className="w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg animate-bounce">
                    {chat.unread}
                  </div>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Zone de chat principale */}
      <div className={`flex-1 glass-card rounded-4xl md:rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col relative shadow-2xl transition-all duration-300 ${selectedContact ? 'flex' : 'hidden md:flex'}`}>
        {selectedContact ? (
          <>
            <div className="p-4 md:p-6 border-b border-white/5 flex justify-between items-center bg-white dark:bg-[#1f1f1f]/5 backdrop-blur-xl z-10">
              <div className="flex items-center gap-3 md:gap-4">
                <button 
                  onClick={() => setSelectedContact(null)}
                  className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="relative">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center text-white font-black shrink-0 ${selectedContact.isSupport ? 'bg-linear-to-br from-brand-primary to-brand-accent shadow-lg shadow-brand-primary/20' : 'bg-gray-700'}`}>
                    {selectedContact.name[0]}
                  </div>
                  {(selectedContact.isSupport ? isSupportOnline : onlineUsers?.includes(selectedContact.id)) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#1a0f0a] rounded-full shadow-lg" />
                  )}
                </div>
                <div>
                  <h2 className="text-sm md:text-lg font-black text-white flex items-center gap-2">
                    {selectedContact.name}
                  </h2>
                  <div className="flex items-center gap-2">
                    <p className="text-[10px] md:text-xs text-brand-primary uppercase tracking-wider font-bold">{selectedContact.role}</p>
                    <span className="text-gray-600 dark:text-gray-400">•</span>
                    {(selectedContact.isSupport ? isSupportOnline : onlineUsers?.includes(selectedContact.id)) ? (
                      <span className="text-[10px] text-emerald-400 font-black uppercase tracking-wider">En ligne</span>
                    ) : (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-black uppercase tracking-wider">Hors ligne</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-3 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-xl text-gray-600 dark:text-gray-400 transition-colors"><MoreVertical className="w-5 h-5" /></button>
              </div>
            </div>

            <div className="flex-1 p-4 md:p-8 overflow-y-auto space-y-4 custom-scrollbar bg-senufo relative">
               <div className="absolute inset-0 bg-brand-900/40 pointer-events-none" />
               <div className="relative z-10 space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                      <div className={`p-4 rounded-2xl max-w-md shadow-lg ${msg.senderId === user?.id ? 'bg-brand-primary text-white rounded-br-none' : 'bg-white dark:bg-[#1f1f1f]/5 border border-white/10 text-white rounded-bl-none'}`}>
                        <p className="text-sm font-medium leading-relaxed">{msg.content}</p>
                        {msg.attachmentUrl && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
                            {msg.attachmentType?.startsWith('image/') ? (
                              <img src={msg.attachmentUrl} alt="pj" className="max-w-full h-auto cursor-pointer" onClick={() => window.open(msg.attachmentUrl)} />
                            ) : (
                              <a href={msg.attachmentUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-2 bg-black/20 text-[10px] font-bold">
                                <Paperclip className="w-4 h-4" /> Voir la pièce jointe
                              </a>
                            )}
                          </div>
                        )}
                        <p className={`text-[9px] font-black mt-2 uppercase tracking-widest ${msg.senderId === user?.id ? 'text-white/60' : 'text-gray-500 dark:text-gray-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
               </div>
            </div>

            <div className="p-4 md:p-6 bg-white dark:bg-[#1f1f1f]/5 border-t border-white/5 backdrop-blur-xl">
              {selectedFile && (
                <div className="mb-4 p-3 bg-brand-primary/10 border border-brand-primary/20 rounded-xl flex justify-between items-center animate-in slide-in-from-bottom-2">
                  <div className="flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-brand-primary" />
                    <span className="text-xs text-white font-bold">{selectedFile.name}</span>
                  </div>
                  <button onClick={() => setSelectedFile(null)} className="p-1 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-full"><X className="w-4 h-4 text-gray-500 dark:text-gray-400" /></button>
                </div>
              )}
              <form onSubmit={handleSend} className="flex items-center gap-2 md:gap-4">
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button 
                  type="button" 
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 md:p-4 hover:bg-white dark:bg-[#1f1f1f]/10 rounded-2xl text-gray-500 dark:text-gray-400 transition-colors hover:text-white group"
                >
                  <Paperclip className="w-5 h-5 md:w-6 md:h-6 transition-transform group-hover:scale-110" />
                </button>
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Votre message..."
                    className="w-full bg-white dark:bg-[#1f1f1f]/5 border border-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl text-gray-900 dark:text-white text-sm md:text-base font-medium outline-none focus:ring-2 focus:ring-brand-primary transition-all"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={(!newMessage.trim() && !selectedFile) || isUploading}
                  className="bg-brand-primary text-white p-3 md:p-4 rounded-xl md:rounded-2xl shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 transition-all"
                >
                  {isUploading ? <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-5 h-5 md:w-6 md:h-6" />}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-10 bg-senufo">
            <div className="absolute inset-0 bg-brand-900/60" />
            <div className="relative z-10">
              <div className="w-24 h-24 bg-brand-primary/10 rounded-full flex items-center justify-center mb-6 mx-auto">
                <Send className="w-10 h-10 text-brand-primary animate-bounce" />
              </div>
              <h3 className="text-2xl font-black text-white mb-2">Messagerie Bamousso</h3>
              <p className="text-gray-400 max-w-xs font-medium">Sélectionnez une discussion pour commencer à échanger avec votre équipe ou le support.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messaging;
