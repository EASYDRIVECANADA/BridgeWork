'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send, X, ArrowLeft, Loader2, Clock, User, CheckCircle } from 'lucide-react';
import { supportChatAPI } from '@/lib/api';
import io from 'socket.io-client';

export default function AdminSupportChatPage() {
  const { user, profile } = useSelector((state) => state.auth);
  const router = useRouter();

  const [conversations, setConversations] = useState([]);
  const [selectedConv, setSelectedConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('open');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  // Auth guard
  useEffect(() => {
    if (profile && profile.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [profile, router]);

  // Load conversations
  useEffect(() => {
    if (profile?.role === 'admin') {
      loadConversations();
    }
  }, [profile, statusFilter]);

  // Socket connection
  useEffect(() => {
    if (!user || profile?.role !== 'admin') return;

    const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:5000';
    const socket = io(apiUrl, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('authenticate', user.id);
      socket.emit('join_admin_support');
    });

    socket.on('new_support_message_for_admin', (data) => {
      // Refresh conversation list
      loadConversations();
      // If we're viewing this conversation, add the message
      if (selectedConv?.id === data.conversation_id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === data.message.id)) return prev;
          return [...prev, data.message];
        });
        scrollToBottom();
      }
    });

    socket.on('new_support_message', (newMsg) => {
      if (newMsg.sender_id !== user.id && selectedConv) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
        scrollToBottom();
      }
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [user, profile, selectedConv?.id]);

  // Join support room when selecting a conversation
  useEffect(() => {
    if (selectedConv && socketRef.current) {
      socketRef.current.emit('join_support', selectedConv.id);
    }
  }, [selectedConv?.id]);

  const loadConversations = async () => {
    try {
      const res = await supportChatAPI.getAllConversations({ status: statusFilter });
      setConversations(res.data.data.conversations || []);
    } catch (err) {
      console.error('Failed to load conversations', err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conv) => {
    setSelectedConv(conv);
    setMessagesLoading(true);
    try {
      const res = await supportChatAPI.getMessages(conv.id);
      setMessages(res.data.data.messages || []);
      scrollToBottom();
      // Refresh to update unread counts
      loadConversations();
    } catch (err) {
      console.error('Failed to load messages', err);
    } finally {
      setMessagesLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  const handleSend = async () => {
    if (!message.trim() || sending || !selectedConv) return;
    const text = message.trim();
    setMessage('');
    setSending(true);

    const optimistic = {
      id: 'temp-' + Date.now(),
      conversation_id: selectedConv.id,
      sender_id: user.id,
      message: text,
      created_at: new Date().toISOString(),
      sender: { id: user.id, full_name: profile?.full_name || 'Admin', role: 'admin' },
    };
    setMessages((prev) => [...prev, optimistic]);
    scrollToBottom();

    try {
      const res = await supportChatAPI.sendMessage(selectedConv.id, { message: text });
      const real = res.data.data.message;
      setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? real : m)));
    } catch (err) {
      console.error('Failed to send', err);
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setMessage(text);
    } finally {
      setSending(false);
    }
  };

  const handleClose = async (convId) => {
    try {
      await supportChatAPI.closeConversation(convId);
      loadConversations();
      if (selectedConv?.id === convId) {
        setSelectedConv(null);
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to close', err);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString();
  };

  const formatMsgTime = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!profile || profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#0E7480] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Support Chat</h1>
          <p className="text-sm text-gray-500 mt-1">Respond to user help requests</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm ring-1 ring-black/5 overflow-hidden h-[calc(100vh-200px)] flex">
          {/* Sidebar: Conversations */}
          <div className="w-[360px] border-r border-gray-100 flex flex-col">
            {/* Filter tabs */}
            <div className="px-4 py-3 border-b border-gray-100 flex gap-2">
              {['open', 'closed', 'all'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                    statusFilter === s
                      ? 'bg-[#0E7480] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Conversation list */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 text-[#0E7480] animate-spin" />
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-6">
                  <MessageCircle className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="text-sm text-gray-500">No {statusFilter} conversations</p>
                </div>
              ) : (
                conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => selectConversation(conv)}
                    className={`w-full text-left px-4 py-3.5 border-b border-gray-50 hover:bg-gray-50 transition ${
                      selectedConv?.id === conv.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-full bg-[#0E7480]/10 grid place-items-center shrink-0 mt-0.5">
                        <User className="w-4 h-4 text-[#0E7480]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sm text-gray-900 truncate">
                            {conv.user?.full_name || 'Unknown User'}
                          </span>
                          {conv.unread_count > 0 && (
                            <span className="bg-[#0E7480] text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                              {conv.unread_count}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {conv.last_message?.message || 'No messages yet'}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-gray-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatTime(conv.last_message?.created_at || conv.created_at)}
                          </span>
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                            conv.status === 'open'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}>
                            {conv.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Chat area */}
          <div className="flex-1 flex flex-col">
            {!selectedConv ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
                <div className="w-16 h-16 rounded-full bg-[#0E7480]/10 grid place-items-center mb-4">
                  <MessageCircle className="w-8 h-8 text-[#0E7480]" />
                </div>
                <p className="font-semibold text-gray-900">Select a conversation</p>
                <p className="text-sm text-gray-500 mt-1">Choose a conversation from the sidebar to start replying</p>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => { setSelectedConv(null); setMessages([]); }}
                      className="md:hidden p-1 rounded-lg hover:bg-gray-100 transition"
                    >
                      <ArrowLeft className="w-5 h-5 text-gray-500" />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-[#0E7480]/10 grid place-items-center">
                      <User className="w-4 h-4 text-[#0E7480]" />
                    </div>
                    <div>
                      <div className="font-semibold text-sm text-gray-900">
                        {selectedConv.user?.full_name || 'Unknown User'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {selectedConv.user?.email || ''}
                      </div>
                    </div>
                  </div>
                  {selectedConv.status === 'open' && (
                    <button
                      onClick={() => handleClose(selectedConv.id)}
                      className="text-xs font-semibold text-gray-500 hover:text-red-600 transition flex items-center gap-1 px-3 py-1.5 rounded-lg hover:bg-red-50"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Close
                    </button>
                  )}
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 bg-gray-50">
                  {messagesLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 text-[#0E7480] animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <p className="text-sm text-gray-400">No messages yet</p>
                    </div>
                  ) : (
                    messages.map((msg) => {
                      const isAdmin = msg.sender?.role === 'admin';
                      return (
                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm ${
                            isAdmin
                              ? 'bg-[#0E7480] text-white rounded-br-md'
                              : 'bg-white text-gray-900 ring-1 ring-black/5 shadow-sm rounded-bl-md'
                          }`}>
                            {!isAdmin && msg.sender && (
                              <div className="text-xs font-semibold text-[#0E7480] mb-1">
                                {msg.sender.full_name}
                              </div>
                            )}
                            {isAdmin && msg.sender && (
                              <div className="text-xs font-semibold text-white/80 mb-1">
                                {msg.sender.full_name} (Admin)
                              </div>
                            )}
                            <div className="whitespace-pre-wrap break-words">{msg.message}</div>
                            <div className={`text-[10px] mt-1 ${isAdmin ? 'text-white/60' : 'text-gray-400'}`}>
                              {formatMsgTime(msg.created_at)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                {selectedConv.status === 'open' && (
                  <div className="border-t border-gray-100 bg-white px-4 py-3 flex items-end gap-2">
                    <textarea
                      rows={1}
                      placeholder="Type a reply..."
                      className="flex-1 resize-none text-sm text-gray-900 outline-none bg-gray-50 rounded-xl px-4 py-3 ring-1 ring-gray-200 focus:ring-[#0E7480]/40 transition placeholder:text-gray-400 max-h-[120px]"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!message.trim() || sending}
                      className="p-3 rounded-xl bg-[#0E7480] text-white disabled:opacity-40 hover:bg-[#0d9488] transition shrink-0"
                    >
                      {sending ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
