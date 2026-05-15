import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LifeBuoy, Send, RefreshCcw, AlertCircle, CheckCircle2, 
  Clock, MessageSquare, Plus, X, ChevronRight, User, 
  Shield, MessageCircle, Sparkles, Inbox, CheckCheck
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';

// =========================================================
// TYPES INTERNES
// =========================================================
interface Message {
  id: string;
  content: string;
  createdAt: string;
  senderId: string;
  isRead?: boolean;
  sender: {
    firstName: string;
    lastName: string;
    role: string;
  };
}

interface SupportTicket {
  id: string;
  title: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
  updatedAt: string;
  companyId: string;
  company?: { name: string; plan: string };
  createdBy?: { firstName: string; lastName: string; email: string };
  messages?: Message[];
  _count?: { messages: number };
}

interface SupportChatRoom {
  id: string;
  companyId: string;
  createdAt: string;
  updatedAt: string;
  company: { name: string; plan: string; logoUrl?: string | null };
  messages: Message[];
  _count?: { messages: number };
}

export default function Support() {
  const { user, company } = useAuth();

  if (!user) return null;

  // Dispatcher de vue
  if (user.role === 'SUPER_ADMIN') {
    return <SuperAdminDashboard />;
  }

  const plan = company?.plan || 'FITINI';

  if (plan === 'FITINI') {
    return <FitiniTicketsDashboard />;
  }

  return <PremiumChatDashboard />;
}

// =========================================================
// UTILS / COMPOSANTS REUTILISABLES
// =========================================================

const StatusBadge = ({ status }: { status: SupportTicket['status'] }) => {
  const config = {
    OPEN: { label: 'Ouvert', bg: 'bg-amber-500/10 text-amber-500 border-amber-500/20', icon: AlertCircle },
    IN_PROGRESS: { label: 'En cours', bg: 'bg-blue-500/10 text-blue-500 border-blue-500/20', icon: Clock },
    RESOLVED: { label: 'Résolu', bg: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle2 },
    CLOSED: { label: 'Fermé', bg: 'bg-white/10 text-gray-400 border-white/5', icon: X },
  };

  const active = config[status] || config.OPEN;
  const Icon = active.icon;

  return (
    <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border ${active.bg}`}>
      <Icon className="w-3 h-3" />
      {active.label}
    </span>
  );
};

const PriorityBadge = ({ priority }: { priority: SupportTicket['priority'] }) => {
  const config = {
    LOW: { label: 'Basse', text: 'text-emerald-400' },
    MEDIUM: { label: 'Moyenne', text: 'text-amber-400' },
    HIGH: { label: 'Haute', text: 'text-red-400' },
  };
  const active = config[priority] || config.MEDIUM;
  return <span className={`text-[10px] font-black uppercase tracking-widest ${active.text}`}>{active.label}</span>;
};

// =========================================================
// 📋 DASHBOARD TICKETS (FITINI)
// =========================================================
function FitiniTicketsDashboard() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Formulaire de création
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
  const [newMessage, setNewMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Chargement de la discussion sélectionnée
  const [activeTicketDetails, setActiveTicketDetails] = useState<SupportTicket | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const res = await api.get('/support/tickets');
      setTickets(res.data);
    } catch (err: any) {
      setError("Impossible de charger vos tickets support.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTicketDetails = async (ticketId: string) => {
    try {
      setDetailsLoading(true);
      const res = await api.get(`/support/tickets/${ticketId}`);
      setActiveTicketDetails(res.data);
    } catch (err) {
      console.error("Erreur détails ticket", err);
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  useEffect(() => {
    if (selectedTicket) {
      fetchTicketDetails(selectedTicket.id);
    } else {
      setActiveTicketDetails(null);
    }
  }, [selectedTicket]);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeTicketDetails?.messages]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newMessage.trim()) return;

    try {
      setSubmitting(true);
      await api.post('/support/tickets', {
        title: newTitle,
        priority: newPriority,
        content: newMessage
      });
      setShowCreateModal(false);
      setNewTitle('');
      setNewMessage('');
      fetchTickets();
    } catch (err: any) {
      alert(err?.response?.data?.message || "Erreur création ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicketDetails) return;

    try {
      setReplySubmitting(true);
      const res = await api.post(`/support/tickets/${activeTicketDetails.id}/messages`, {
        content: replyText
      });
      
      // Mettre à jour localement
      setActiveTicketDetails(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...(prev.messages || []), res.data]
        };
      });
      setReplyText('');
    } catch (err) {
      console.error("Erreur d'envoi du message", err);
    } finally {
      setReplySubmitting(false);
    }
  };

  return (
    <div className="space-y-8 relative z-10">
      {/* Header principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tighter text-white flex items-center gap-3">
            <LifeBuoy className="w-10 h-10 text-brand-primary animate-pulse" />
            SUPPORT CLIENT
          </h1>
          <p className="text-gray-400 text-sm mt-1">Gérez vos demandes d'assistance via tickets (Formule FITINI)</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-5 py-3 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-accent text-white font-black text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-brand-primary/25 hover:scale-[1.02] transition-all duration-300"
        >
          <Plus className="w-5 h-5" />
          NOUVEAU TICKET
        </button>
      </div>

      {/* Stats rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: "Total demandes", val: tickets.length, color: "text-brand-primary", bg: "bg-brand-primary/10" },
          { label: "En cours / Ouverts", val: tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length, color: "text-amber-400", bg: "bg-amber-400/10" },
          { label: "Résolus", val: tickets.filter(t => t.status === 'RESOLVED').length, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        ].map((st, idx) => (
          <div key={idx} className="glass-card p-6 rounded-3xl border border-white/5 flex flex-col gap-1">
            <span className="text-xs font-bold tracking-widest uppercase text-gray-500">{st.label}</span>
            <span className={`text-4xl font-black ${st.color}`}>{st.val}</span>
          </div>
        ))}
      </div>

      {/* Layout Split ou Simple */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
        
        {/* LISTE DES TICKETS */}
        <div className={`${selectedTicket ? 'lg:col-span-5 hidden lg:block' : 'lg:col-span-12'} space-y-3`}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-full h-24 rounded-3xl bg-white/5 animate-pulse border border-white/5" />
              ))}
            </div>
          ) : error ? (
            <div className="glass-card p-8 rounded-3xl text-center flex flex-col items-center gap-2">
              <AlertCircle className="w-10 h-10 text-red-500" />
              <p className="text-gray-300 font-bold">{error}</p>
              <button onClick={fetchTickets} className="text-brand-primary font-black text-xs flex items-center gap-1 mt-2">
                <RefreshCcw className="w-4 h-4" /> RÉESSAYER
              </button>
            </div>
          ) : tickets.length === 0 ? (
            <div className="glass-card p-16 rounded-4xl text-center flex flex-col items-center justify-center border border-white/5">
              <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-4 border border-white/5">
                <Inbox className="w-10 h-10 text-gray-500" />
              </div>
              <h3 className="text-xl font-black text-white">Aucun ticket ouvert</h3>
              <p className="text-gray-400 text-sm mt-1 max-w-xs">Vous n'avez soumis aucun ticket pour le moment. Notre support est là pour vous aider !</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1 custom-scrollbar">
              {tickets.map((t) => (
                <motion.div
                  key={t.id}
                  layoutId={`ticket-${t.id}`}
                  onClick={() => setSelectedTicket(t)}
                  className={`glass-card p-5 rounded-3xl border cursor-pointer transition-all duration-300 group relative overflow-hidden ${
                    selectedTicket?.id === t.id 
                      ? 'border-brand-primary bg-brand-primary/5 shadow-xl shadow-brand-primary/10 scale-[0.99]' 
                      : 'border-white/5 hover:border-white/20 hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <h3 className="font-extrabold text-white group-hover:text-brand-primary transition-colors pt-1">{t.title}</h3>
                      <div className="flex items-center gap-2 text-xs text-gray-500 pt-1 font-medium">
                        <span>#{t.id.slice(0, 8)}</span>
                        <span>•</span>
                        <span>Mis à jour {formatDistanceToNow(new Date(t.updatedAt), { addSuffix: true, locale: fr })}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-brand-primary group-hover:translate-x-1 transition-all shrink-0 self-center" />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* DISCUSSION DE TICKET SÉLECTIONNÉ */}
        {selectedTicket && (
          <div className="lg:col-span-7 col-span-12 flex flex-col h-[600px] glass-card rounded-3xl overflow-hidden border border-brand-primary/20 bg-[#1a0f0a]/90">
            {/* Header de Discussion */}
            <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/5">
              <div className="flex flex-col gap-0.5">
                <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Discussion Ticket</span>
                <h3 className="font-black text-white line-clamp-1">{selectedTicket.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTicket(null)}
                className="p-2 bg-white/5 hover:bg-white/10 hover:text-white rounded-xl transition-colors text-gray-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Zone des messages */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
              {detailsLoading ? (
                <div className="flex flex-col gap-4 justify-center items-center h-full">
                  <RefreshCcw className="w-8 h-8 text-brand-primary animate-spin" />
                  <p className="text-xs text-gray-500 tracking-widest uppercase font-bold">Chargement du fil...</p>
                </div>
              ) : (
                <>
                  {activeTicketDetails?.messages?.map((m) => {
                    const isMe = m.senderId === user?.id;
                    const isSupport = m.sender.role === 'SUPER_ADMIN';
                    
                    return (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={m.id}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[85%] rounded-2xl p-4 space-y-1.5 shadow-lg border ${
                          isMe 
                            ? 'bg-brand-primary text-white rounded-tr-none border-brand-primary/50' 
                            : isSupport
                              ? 'bg-brand-accent/20 text-white border-brand-accent/30 rounded-tl-none'
                              : 'bg-white/5 text-gray-200 border-white/5 rounded-tl-none'
                        }`}>
                          <div className="flex items-center gap-2 justify-between">
                            <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1 opacity-75">
                              {isSupport ? <Shield className="w-3 h-3 text-brand-accent" /> : null}
                              {isSupport ? "Support BAMOUSSO" : `${m.sender.firstName} ${m.sender.lastName}`}
                            </span>
                            <span className="text-[9px] opacity-60 font-medium">
                              {format(new Date(m.createdAt), 'HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words font-medium">{m.content}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                  <div ref={messageEndRef} />
                </>
              )}
            </div>

            {/* Input Réponse */}
            <form onSubmit={handleSendReply} className="p-4 border-t border-white/5 bg-[#1a0f0a]/50">
              <div className="relative flex items-center gap-3 bg-white/5 border border-white/10 focus-within:border-brand-primary/50 focus-within:bg-white/10 transition-all rounded-2xl p-2 pr-3">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Écrire votre réponse..."
                  rows={1}
                  required
                  disabled={replySubmitting || activeTicketDetails?.status === 'CLOSED'}
                  className="flex-1 max-h-32 bg-transparent border-none outline-none ring-0 text-white text-sm placeholder-gray-500 resize-none py-2 px-3 leading-relaxed custom-scrollbar"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendReply(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || replySubmitting || activeTicketDetails?.status === 'CLOSED'}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0 bg-brand-primary text-white hover:shadow-lg hover:shadow-brand-primary/30 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {replySubmitting ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      {/* MODAL CRÉATION TICKET */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCreateModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="w-full max-w-lg glass-card rounded-4xl p-6 border border-white/10 overflow-hidden z-10 relative flex flex-col gap-4 bg-[#1a0f0a]"
            >
              <div className="flex items-center justify-between border-b border-white/5 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-white">Créer un ticket support</h3>
                </div>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-white/5 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Objet du ticket</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Ex: Erreur de calcul sur la paie de Mars..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-brand-primary focus:bg-white/10 outline-none transition-all text-sm font-medium"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Priorité</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['LOW', 'MEDIUM', 'HIGH'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setNewPriority(p)}
                        className={`py-2.5 rounded-2xl text-xs font-black uppercase border tracking-wider transition-all ${
                          newPriority === p 
                            ? p === 'LOW' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg' : p === 'MEDIUM' ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-lg' : 'bg-red-500/20 border-red-500 text-red-400 shadow-lg'
                            : 'bg-white/5 border-white/5 text-gray-500 hover:bg-white/10'
                        }`}
                      >
                        {p === 'LOW' ? 'Basse' : p === 'MEDIUM' ? 'Moyenne' : 'Haute'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-widest text-gray-400">Détails du problème</label>
                  <textarea
                    required
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Décrivez votre problème avec le plus de détails possible afin que nous puissions vous aider rapidement..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-white focus:border-brand-primary focus:bg-white/10 outline-none transition-all text-sm font-medium resize-none leading-relaxed"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 py-4 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-accent text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/30 hover:shadow-brand-primary/50 hover:scale-[1.01] transition-all disabled:opacity-50"
                >
                  {submitting ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                  {submitting ? "CREATION EN COURS..." : "OUVRIR LE TICKET"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================
// 💬 CHAT DIRECT (LOUBA / KORO)
// =========================================================
function PremiumChatDashboard() {
  const { user } = useAuth();
  const [room, setRoom] = useState<SupportChatRoom | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatText, setChatText] = useState('');
  const [sending, setSending] = useState(false);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  const fetchRoom = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const res = await api.get('/support/chat/room');
      setRoom(res.data);
    } catch (err) {
      console.error("Erreur chargement chat", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  // Polling des messages
  useEffect(() => {
    fetchRoom();

    const itv = setInterval(() => {
      fetchRoom(true);
    }, 5000);

    return () => clearInterval(itv);
  }, []);

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    // Quand un salon est affiché, marquer comme lu s'il y a des messages non lus
    if (room) {
      api.patch(`/support/chat/rooms/${room.id}/read`).catch(() => {});
    }
  }, [room?.messages?.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !room || sending) return;

    const msgText = chatText;
    setChatText('');
    try {
      setSending(true);
      const res = await api.post(`/support/chat/rooms/${room.id}/messages`, {
        content: msgText
      });
      
      // Optimistic Update
      setRoom(prev => {
        if (!prev) return null;
        return {
          ...prev,
          messages: [...prev.messages, res.data]
        };
      });
    } catch (err) {
      console.error("Erreur d'envoi", err);
      setChatText(msgText); // Restauration en cas d'échec
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col space-y-4 relative z-10">
      {/* Header Premium Chat */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg text-white animate-pulse">
            <MessageCircle className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-2">
              CHAT SUPPORT DIRECT
              <span className="text-[10px] px-2 py-0.5 font-black text-amber-400 uppercase tracking-[0.2em] border border-amber-400/20 bg-amber-400/5 rounded-full flex items-center gap-1 shadow">
                <Sparkles className="w-3 h-3" /> PREMIUM
              </span>
            </h1>
            <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
              <span className="w-2 h-2 bg-emerald-500 rounded-full shadow shadow-emerald-500/50 inline-block animate-ping" />
              <span>Support BAMOUSSO en ligne</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interface Principale */}
      <div className="flex-1 flex flex-col glass-card rounded-4xl border border-brand-primary/15 overflow-hidden bg-[#1a0f0a]/95 shadow-2xl">
        
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-white/[0.01]">
          {loading ? (
            <div className="flex flex-col gap-4 justify-center items-center h-full">
              <RefreshCcw className="w-10 h-10 text-brand-primary animate-spin" />
              <p className="text-xs text-gray-500 font-black uppercase tracking-widest">Initialisation du salon sécurisé...</p>
            </div>
          ) : !room || room.messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary border border-brand-primary/20 shadow-lg">
                <LifeBuoy className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-black text-white">Comment pouvons-nous vous aider ?</h3>
              <p className="text-sm text-gray-400 font-medium">C'est votre canal direct avec l'équipe Super-Admin de BAMOUSSO. Envoyez un message ci-dessous pour démarrer une conversation instantanée.</p>
            </div>
          ) : (
            <>
              {room.messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                const isSupport = msg.sender.role === 'SUPER_ADMIN';

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className="flex flex-col gap-1 max-w-[80%]">
                      <div className={`p-4 rounded-2xl text-sm font-medium shadow-xl border ${
                        isMe 
                          ? 'bg-brand-primary text-white rounded-br-none border-brand-primary/50' 
                          : isSupport
                            ? 'bg-brand-accent/25 text-white border-brand-accent/40 rounded-bl-none'
                            : 'bg-white/5 text-gray-200 border-white/5 rounded-bl-none'
                      }`}>
                        <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                      </div>
                      
                      <div className={`flex items-center gap-2 text-[10px] text-gray-500 font-bold px-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                        {isSupport && !isMe && <span className="text-brand-accent flex items-center gap-0.5 uppercase tracking-widest"><Shield className="w-2.5 h-2.5" /> Support</span>}
                        <span>{format(new Date(msg.createdAt), 'HH:mm')}</span>
                        {isMe && (
                          <span>
                            {msg.isRead ? <CheckCheck className="w-3 h-3 text-emerald-400 inline" /> : <CheckCircle2 className="w-2.5 h-2.5 text-gray-600 inline" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              <div ref={chatEndRef} />
            </>
          )}
        </div>

        {/* Zone d'écriture */}
        <div className="p-4 border-t border-white/5 bg-black/20">
          <form onSubmit={handleSendMessage} className="relative flex items-center gap-3 bg-white/5 border border-white/10 focus-within:border-brand-primary/50 focus-within:bg-white/10 transition-all rounded-3xl p-2 pl-4 pr-3 shadow-inner">
            <input
              type="text"
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              placeholder="Tapez votre message..."
              disabled={sending || !room}
              required
              className="flex-1 bg-transparent border-none outline-none ring-0 text-white text-sm placeholder-gray-500 py-3"
            />
            <button
              type="submit"
              disabled={!chatText.trim() || sending || !room}
              className="w-12 h-12 rounded-2xl bg-gradient-to-r from-brand-primary to-brand-accent text-white flex items-center justify-center shadow-lg shadow-brand-primary/20 hover:shadow-brand-primary/40 hover:scale-[1.05] transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
            >
              {sending ? <RefreshCcw className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// =========================================================
// 👑 DASHBOARD SUPER ADMIN
// =========================================================
function SuperAdminDashboard() {
  const [activeTab, setActiveTab] = useState<'TICKETS' | 'CHATS'>('CHATS');

  // --- STATE TICKETS ---
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketMessages, setTicketMessages] = useState<Message[]>([]);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  // --- STATE CHATS ---
  const [rooms, setRooms] = useState<SupportChatRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(true);
  const [selectedRoom, setSelectedRoom] = useState<SupportChatRoom | null>(null);
  const [roomMessages, setRoomMessages] = useState<Message[]>([]);
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // --- API CALLS TICKETS ---
  const fetchAllTickets = async () => {
    try {
      setTicketsLoading(true);
      const res = await api.get('/support/tickets');
      setTickets(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchTicketMessages = async (id: string) => {
    try {
      const res = await api.get(`/support/tickets/${id}`);
      setTicketMessages(res.data.messages || []);
      setSelectedTicket(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  // --- API CALLS CHATS ---
  const fetchAllRooms = async (silent = false) => {
    try {
      if (!silent) setRoomsLoading(true);
      const res = await api.get('/support/chat/rooms');
      setRooms(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      if (!silent) setRoomsLoading(false);
    }
  };

  const fetchRoomMessages = async (id: string) => {
    try {
      const res = await api.get(`/support/chat/rooms/${id}`);
      setRoomMessages(res.data.messages || []);
      
      // Marquer comme lu
      await api.patch(`/support/chat/rooms/${id}/read`);
      // Recharger les salons pour mettre à jour les badges non lus
      fetchAllRooms(true);
    } catch (e) {
      console.error(e);
    }
  };

  // Initial loading & Polling
  useEffect(() => {
    if (activeTab === 'TICKETS') {
      fetchAllTickets();
    } else {
      fetchAllRooms();
    }
  }, [activeTab]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'CHATS') {
        fetchAllRooms(true);
        if (selectedRoom) fetchRoomMessages(selectedRoom.id);
      }
    }, 6000);

    return () => clearInterval(interval);
  }, [activeTab, selectedRoom?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomMessages.length, ticketMessages.length]);

  // Action: Envoyer réponse ticket
  const handleSendTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    try {
      setSendingReply(true);
      const res = await api.post(`/support/tickets/${selectedTicket.id}/messages`, {
        content: replyText
      });
      setTicketMessages(prev => [...prev, res.data]);
      setReplyText('');
      // Rafraîchir liste pour statut
      fetchAllTickets();
    } catch (e) {
      console.error(e);
    } finally {
      setSendingReply(false);
    }
  };

  // Action: Clôturer ticket
  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedTicket) return;
    try {
      await api.patch(`/support/tickets/${selectedTicket.id}/status`, { status: newStatus });
      setSelectedTicket(prev => prev ? { ...prev, status: newStatus as any } : null);
      fetchAllTickets();
    } catch (e) {
      console.error(e);
    }
  };

  // Action: Envoyer message Chat
  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim() || !selectedRoom) return;

    try {
      setSendingChat(true);
      const res = await api.post(`/support/chat/rooms/${selectedRoom.id}/messages`, {
        content: chatText
      });
      setRoomMessages(prev => [...prev, res.data]);
      setChatText('');
      fetchAllRooms(true);
    } catch (e) {
      console.error(e);
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div className="space-y-6 relative z-10 h-[calc(100vh-10rem)] flex flex-col">
      
      {/* Header Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-white flex items-center gap-2">
            <Shield className="w-8 h-8 text-brand-primary" />
            CONSOLES SUPPORT SUPER-ADMIN
          </h1>
        </div>

        {/* Switch Tabs */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 self-start">
          {[
            { id: 'CHATS', label: 'Chats Directs', icon: MessageSquare },
            { id: 'TICKETS', label: 'Tickets Support', icon: Inbox },
          ].map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => {
                  setActiveTab(t.id as any);
                  setSelectedRoom(null);
                  setSelectedTicket(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all duration-300 ${
                  activeTab === t.id 
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20' 
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Contenu des consoles */}
      <div className="flex-1 min-h-0 flex gap-6">
        
        {/* ===================================== */}
        {/* CONSOLE CHAT */}
        {/* ===================================== */}
        {activeTab === 'CHATS' && (
          <div className="flex-1 flex rounded-4xl border border-white/10 bg-[#1a0f0a]/95 overflow-hidden shadow-2xl">
            
            {/* Liste des salons (Gauche) */}
            <div className={`${selectedRoom ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-80 border-r border-white/5 bg-black/10 shrink-0`}>
              <div className="p-4 border-b border-white/5 font-black text-xs text-gray-500 uppercase tracking-widest">
                Salons de Discussion
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {roomsLoading ? (
                  <div className="p-4 text-xs text-gray-600 font-bold uppercase tracking-widest text-center animate-pulse">Chargement salons...</div>
                ) : rooms.length === 0 ? (
                  <div className="p-8 text-xs text-gray-500 font-bold text-center">Aucun salon actif</div>
                ) : (
                  rooms.map((r) => {
                    const unreadCount = r._count?.messages || 0;
                    const latestMsg = r.messages?.[0];

                    return (
                      <div
                        key={r.id}
                        onClick={() => {
                          setSelectedRoom(r);
                          fetchRoomMessages(r.id);
                        }}
                        className={`p-4 border-b border-white/5 cursor-pointer transition-colors relative ${
                          selectedRoom?.id === r.id ? 'bg-brand-primary/10 border-r-2 border-r-brand-primary' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center shrink-0 border border-white/10 shadow font-black text-white uppercase">
                            {r.company.name.slice(0,2)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="font-bold text-white text-sm truncate">{r.company.name}</h4>
                              <span className="text-[9px] text-gray-600 font-bold">{r.company.plan}</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate mt-0.5 font-medium">
                              {latestMsg ? latestMsg.content : "Nouveau salon"}
                            </p>
                          </div>
                          {unreadCount > 0 && (
                            <span className="w-5 h-5 rounded-full bg-brand-primary text-white text-[9px] font-black flex items-center justify-center shadow shadow-brand-primary/30 shrink-0">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Conversation Actuelle (Droite) */}
            <div className={`${!selectedRoom ? 'hidden md:flex' : 'flex'} flex-col flex-1 min-w-0 bg-white/[0.01]`}>
              {selectedRoom ? (
                <>
                  {/* Header chat */}
                  <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedRoom(null)} className="md:hidden text-gray-500 hover:text-white p-2 bg-white/5 rounded-xl"><ChevronRight className="w-5 h-5 rotate-180" /></button>
                      <div>
                        <h3 className="font-black text-white text-base">{selectedRoom.company.name}</h3>
                        <p className="text-[10px] font-black uppercase text-brand-primary tracking-widest flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Connecté avec le client
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Zone messages */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
                    {roomMessages.map((msg) => {
                      const isMe = msg.sender.role === 'SUPER_ADMIN';
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] p-3.5 rounded-2xl border text-sm font-medium ${
                            isMe ? 'bg-brand-primary text-white border-brand-primary/50 rounded-br-none' : 'bg-white/5 text-gray-200 border-white/5 rounded-bl-none'
                          }`}>
                            {!isMe && <p className="text-[9px] font-black text-gray-500 uppercase tracking-wider mb-1">{msg.sender.firstName} {msg.sender.lastName}</p>}
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{msg.content}</p>
                            <span className="block text-[8px] text-right opacity-50 mt-1 font-bold">{format(new Date(msg.createdAt), 'HH:mm')}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={scrollRef} />
                  </div>

                  {/* Input */}
                  <div className="p-4 border-t border-white/5 bg-black/20">
                    <form onSubmit={handleSendChatMessage} className="flex items-center gap-2 bg-white/5 border border-white/10 focus-within:border-brand-primary/50 rounded-2xl p-1.5 pl-3 pr-2">
                      <input
                        type="text"
                        value={chatText}
                        onChange={(e) => setChatText(e.target.value)}
                        placeholder="Répondre au client..."
                        required
                        className="flex-1 bg-transparent border-none outline-none ring-0 text-white text-sm placeholder-gray-500 py-2"
                      />
                      <button type="submit" disabled={!chatText.trim() || sendingChat} className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:shadow shadow-brand-primary/20 shrink-0">
                        {sendingChat ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500">
                  <MessageCircle className="w-12 h-12 text-white/10 mb-2" />
                  <p className="font-bold uppercase text-xs tracking-widest">Sélectionnez une discussion</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* CONSOLE TICKETS */}
        {/* ===================================== */}
        {activeTab === 'TICKETS' && (
          <div className="flex-1 flex rounded-4xl border border-white/10 bg-[#1a0f0a]/95 overflow-hidden shadow-2xl">
            {/* Liste tickets */}
            <div className={`${selectedTicket ? 'hidden md:flex' : 'flex'} flex-col w-full md:w-96 border-r border-white/5 bg-black/10 shrink-0`}>
              <div className="p-4 border-b border-white/5 font-black text-xs text-gray-500 uppercase tracking-widest flex items-center justify-between">
                <span>Fil d'Attente Tickets</span>
                <button onClick={fetchAllTickets} className="text-brand-primary hover:text-white p-1 transition-colors"><RefreshCcw className="w-3.5 h-3.5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-0.5">
                {ticketsLoading ? (
                  <div className="p-4 text-center text-xs animate-pulse text-gray-600">Chargement...</div>
                ) : tickets.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-600 font-bold">Aucun ticket trouvé</div>
                ) : (
                  tickets.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => fetchTicketMessages(t.id)}
                      className={`p-4 border-b border-white/5 cursor-pointer transition-all ${
                        selectedTicket?.id === t.id ? 'bg-brand-primary/10' : 'hover:bg-white/[0.01]'
                      }`}
                    >
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        <StatusBadge status={t.status} />
                        <PriorityBadge priority={t.priority} />
                      </div>
                      <h4 className="font-black text-sm text-white leading-snug line-clamp-1">{t.title}</h4>
                      <div className="flex justify-between items-center text-[10px] text-gray-500 font-bold mt-2">
                        <span className="text-brand-primary">{t.company?.name}</span>
                        <span>{formatDistanceToNow(new Date(t.createdAt), { locale: fr })}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Vue Ticket Détails */}
            <div className={`${!selectedTicket ? 'hidden md:flex' : 'flex'} flex-col flex-1 min-w-0 bg-white/[0.01]`}>
              {selectedTicket ? (
                <>
                  {/* Header */}
                  <div className="p-4 bg-white/5 border-b border-white/5 flex items-center justify-between gap-3 flex-wrap shrink-0">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setSelectedTicket(null)} className="md:hidden text-gray-500 p-2 bg-white/5 rounded-xl"><ChevronRight className="w-5 h-5 rotate-180" /></button>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-black text-white text-base">{selectedTicket.title}</h3>
                          <PriorityBadge priority={selectedTicket.priority} />
                        </div>
                        <p className="text-[10px] font-black text-brand-primary tracking-widest uppercase flex items-center gap-2 mt-0.5">
                          <span>Client: {selectedTicket.company?.name}</span>
                          <span>•</span>
                          <span>Par: {selectedTicket.createdBy?.firstName} {selectedTicket.createdBy?.lastName}</span>
                        </p>
                      </div>
                    </div>

                    {/* Boutons Actions Statut */}
                    <div className="flex gap-1.5">
                      {selectedTicket.status !== 'RESOLVED' && (
                        <button onClick={() => handleUpdateStatus('RESOLVED')} className="px-2.5 py-1.5 text-[9px] font-black tracking-wider uppercase bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all rounded-lg text-emerald-500">
                          RÉSOLU
                        </button>
                      )}
                      {selectedTicket.status !== 'CLOSED' && (
                        <button onClick={() => handleUpdateStatus('CLOSED')} className="px-2.5 py-1.5 text-[9px] font-black tracking-wider uppercase bg-white/5 border border-white/10 hover:bg-white/20 transition-all rounded-lg text-gray-400">
                          CLOTURER
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Fil Discussion */}
                  <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[#1a0f0a]/30">
                    {ticketMessages.map((m) => {
                      const isSupport = m.sender.role === 'SUPER_ADMIN';
                      return (
                        <div key={m.id} className={`flex ${isSupport ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] p-4 rounded-2xl shadow border text-sm font-medium ${
                            isSupport ? 'bg-brand-primary text-white border-brand-primary/50 rounded-tr-none' : 'bg-white/5 text-gray-200 border-white/5 rounded-tl-none'
                          }`}>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-wider flex items-center gap-1 mb-1.5">
                              {isSupport ? <Shield className="w-2.5 h-2.5" /> : <User className="w-2.5 h-2.5" />}
                              {isSupport ? "Vous (Support)" : `${m.sender.firstName} ${m.sender.lastName}`}
                            </p>
                            <p className="whitespace-pre-wrap break-words leading-relaxed">{m.content}</p>
                            <span className="block text-[9px] text-right opacity-50 mt-1.5 font-bold">{format(new Date(m.createdAt), 'dd MMM HH:mm', { locale: fr })}</span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={scrollRef} />
                  </div>

                  {/* Input Réponse */}
                  <div className="p-4 bg-[#1a0f0a]/50 border-t border-white/5">
                    <form onSubmit={handleSendTicketReply} className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-1.5 pl-3 pr-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder="Écrire une réponse officielle au client..."
                        required
                        disabled={sendingReply || selectedTicket.status === 'CLOSED'}
                        className="flex-1 bg-transparent border-none outline-none ring-0 text-white text-sm py-2"
                      />
                      <button type="submit" disabled={!replyText.trim() || sendingReply || selectedTicket.status === 'CLOSED'} className="w-10 h-10 rounded-xl bg-brand-primary text-white flex items-center justify-center hover:shadow shadow-brand-primary/20 shrink-0">
                        {sendingReply ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-500 gap-2">
                  <Inbox className="w-12 h-12 text-white/10" />
                  <p className="font-black uppercase text-xs tracking-widest">Sélectionnez un ticket</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
