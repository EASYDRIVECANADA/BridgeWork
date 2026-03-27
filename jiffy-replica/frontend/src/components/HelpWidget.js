'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, HelpCircle, ChevronRight, Search, ArrowLeft, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supportChatAPI } from '@/lib/api';
import io from 'socket.io-client';

const helpTopics = [
  { label: 'How do I book a service?', href: '/services' },
  { label: 'Pricing & payment', href: '/help' },
  { label: 'Cancel or reschedule', href: '/help' },
  { label: 'Become a pro', href: '/pro-signup' },
];

export default function HelpWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState('home'); // 'home' | 'chat'
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const panelRef = useRef(null);
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);
  const textareaRef = useRef(null);

  const { user, profile } = useSelector((state) => state.auth);
  const router = useRouter();
  const isAuthenticated = !!user;

  // Scroll to bottom of messages
  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Connect socket when chat opens
  useEffect(() => {
    if (view === 'chat' && conversationId && isAuthenticated) {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
      const socket = io(apiUrl, { transports: ['websocket', 'polling'] });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('authenticate', user.id);
        socket.emit('join_support', conversationId);
      });

      socket.on('new_support_message', (newMsg) => {
        if (newMsg.sender_id !== user.id) {
          setMessages((prev) => [...prev, newMsg]);
          scrollToBottom();
        }
      });

      return () => {
        socket.disconnect();
        socketRef.current = null;
      };
    }
  }, [view, conversationId, isAuthenticated, user?.id, scrollToBottom]);

  // Load conversation when switching to chat view
  useEffect(() => {
    if (view === 'chat' && isAuthenticated && !conversationId) {
      loadConversation();
    }
  }, [view, isAuthenticated]);

  const loadConversation = async () => {
    setLoading(true);
    try {
      const res = await supportChatAPI.getOrCreateConversation();
      const conv = res.data.data.conversation;
      setConversationId(conv.id);

      const msgRes = await supportChatAPI.getMessages(conv.id);
      setMessages(msgRes.data.data.messages || []);
      scrollToBottom();
    } catch (err) {
      // Failed to load support conversation
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() || sending || !conversationId) return;

    const text = message.trim();
    setMessage('');
    setSending(true);

    // Optimistic update
    const optimistic = {
      id: 'temp-' + Date.now(),
      conversation_id: conversationId,
      sender_id: user.id,
      message: text,
      created_at: new Date().toISOString(),
      sender: { id: user.id, full_name: profile?.full_name || 'You', role: profile?.role },
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const res = await supportChatAPI.sendMessage(conversationId, { message: text });
      const real = res.data.data.message;
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? real : m)));
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMessage(text); // restore
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Open chat view directly (used by "Chat with us" link on homepage)
  const openChat = useCallback(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    setIsOpen(true);
    setView('chat');
  }, [isAuthenticated, router]);

  // Expose openChat globally so page.js can call it
  useEffect(() => {
    window.__openHelpChat = openChat;
    return () => { delete window.__openHelpChat; };
  }, [openChat]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredTopics = searchQuery
    ? helpTopics.filter((t) => t.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : helpTopics;

  const formatTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div ref={panelRef} className="fixed bottom-6 right-6 z-[9999]">
      {/* Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.95 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="absolute bottom-[72px] right-0 w-[360px] h-[520px] rounded-2xl bg-white shadow-2xl shadow-black/20 ring-1 ring-black/10 overflow-hidden flex flex-col"
          >
            {view === 'home' ? (
              <>
                {/* Header */}
                <div className="bg-[#0E7480] px-5 py-5 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-bold text-lg tracking-tight">BridgeWork</span>
                    <button
                      onClick={() => setIsOpen(false)}
                      className="p-1 rounded-full hover:bg-white/20 transition"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="text-2xl font-extrabold leading-tight">
                    Hi there 👋
                  </div>
                  <div className="text-lg font-semibold mt-0.5">
                    How can we help?
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {/* Send us a message */}
                  <button
                    onClick={() => {
                      if (!isAuthenticated) { router.push('/login'); setIsOpen(false); return; }
                      setView('chat');
                    }}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition border-b border-gray-100"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0E7480] grid place-items-center">
                        <Send className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-gray-900 text-sm">Send us a message</div>
                        <div className="text-xs text-gray-500">We typically reply within minutes</div>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </button>

                  {/* Search */}
                  <div className="px-5 pt-4 pb-2">
                    <div className="flex items-center gap-2 rounded-xl bg-gray-100 px-3 py-2.5 ring-1 ring-gray-200 focus-within:ring-[#0E7480]/40 transition">
                      <Search className="w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search for help"
                        className="flex-1 bg-transparent text-sm text-gray-900 outline-none placeholder:text-gray-400"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Topics */}
                  <div className="px-5 pb-4">
                    {filteredTopics.map((topic) => (
                      <Link
                        key={topic.label}
                        href={topic.href}
                        onClick={() => setIsOpen(false)}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded-lg transition"
                      >
                        <span className="text-sm text-gray-700">{topic.label}</span>
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      </Link>
                    ))}
                    {filteredTopics.length === 0 && (
                      <p className="text-sm text-gray-400 py-3 text-center">No results found</p>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Chat view */
              <>
                {/* Chat header */}
                <div className="bg-[#0E7480] px-4 py-3.5 text-white flex items-center gap-3">
                  <button
                    onClick={() => setView('home')}
                    className="p-1 rounded-full hover:bg-white/20 transition"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">BridgeWork Support</div>
                    <div className="text-xs text-white/80">We typically reply in minutes</div>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1 rounded-full hover:bg-white/20 transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-gray-50">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 text-[#0E7480] animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-12 h-12 rounded-full bg-[#0E7480]/10 grid place-items-center mb-3">
                        <MessageCircle className="w-6 h-6 text-[#0E7480]" />
                      </div>
                      <p className="font-semibold text-gray-900 text-sm">Start a conversation</p>
                      <p className="text-xs text-gray-500 mt-1 max-w-[200px]">
                        Send us a message and our team will get back to you shortly.
                      </p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                            isMe
                              ? 'bg-[#0E7480] text-white rounded-br-md'
                              : 'bg-white text-gray-900 ring-1 ring-black/5 shadow-sm rounded-bl-md'
                          }`}>
                            {!isMe && msg.sender && (
                              <div className="text-xs font-semibold text-[#0E7480] mb-1">
                                {msg.sender.full_name || 'Support'}
                              </div>
                            )}
                            <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                            <div className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-gray-400'}`}>
                              {formatTime(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="border-t border-gray-100 bg-white px-3 py-2.5 flex items-end gap-2">
                  <textarea
                    ref={textareaRef}
                    rows={1}
                    placeholder="Write a message..."
                    className="flex-1 resize-none text-sm text-gray-900 outline-none bg-gray-50 rounded-xl px-3 py-2.5 ring-1 ring-gray-200 focus:ring-[#0E7480]/40 transition placeholder:text-gray-400 max-h-[80px]"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    onKeyDown={handleKeyPress}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!message.trim() || sending}
                    className="p-2.5 rounded-xl bg-[#0E7480] text-white disabled:opacity-40 hover:bg-[#0d9488] transition shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-[#0E7480] text-white shadow-lg shadow-[#0E7480]/30 hover:shadow-xl hover:shadow-[#0E7480]/40 hover:scale-105 transition-all duration-200 grid place-items-center"
        aria-label="Help"
      >
        {isOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <HelpCircle className="w-6 h-6" />
        )}
      </button>
      {!isOpen && (
        <span className="absolute -top-1 -left-1 bg-white text-[#042E5C] text-[10px] font-bold px-1.5 py-0.5 rounded-full shadow ring-1 ring-black/5">
          Help
        </span>
      )}
    </div>
  );
}
