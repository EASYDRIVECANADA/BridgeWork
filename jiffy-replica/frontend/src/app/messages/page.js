'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Search, Camera, Send, Loader2, CheckCheck, ArrowLeft, X, ImageIcon } from 'lucide-react';
import { fetchConversations, fetchMessages, sendMessage, markMessagesAsRead, fetchUnreadCount, addRealtimeMessage, setTypingUser, clearTypingUser } from '@/store/slices/messagesSlice';
import { bookingsAPI, messagesAPI } from '@/lib/api';
import { getSocket, connectSocket, joinBookingRoom } from '@/lib/socket';
import { toast } from 'react-toastify';

export default function MessagesPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);
  const { conversations, messagesByBooking, loading, typingUsers } = useSelector((state) => state.messages);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBookingId, setSelectedBookingId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [otherParty, setOtherParty] = useState(null);
  const [bookingInfo, setBookingInfo] = useState(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  const chatData = messagesByBooking[selectedBookingId];
  const messages = chatData?.messages || [];
  const isTyping = typingUsers[selectedBookingId];

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    dispatch(fetchConversations());
  }, [user, router, dispatch]);

  // When a conversation is selected, load messages and mark as read
  useEffect(() => {
    if (!selectedBookingId || !user) return;

    dispatch(fetchMessages({ bookingId: selectedBookingId }));
    dispatch(markMessagesAsRead(selectedBookingId)).then(() => {
      dispatch(fetchUnreadCount());
    });

    // Load booking info for the chat header
    const loadBookingInfo = async () => {
      try {
        const res = await bookingsAPI.getById(selectedBookingId);
        const booking = res.data.data.booking;
        setBookingInfo(booking);
      } catch (err) {
        console.log('[MESSAGES] Could not load booking info');
      }
    };
    loadBookingInfo();

    // Find other party from conversations
    const convo = conversations.find(c => c.booking_id === selectedBookingId);
    if (convo?.other_party) {
      setOtherParty(convo.other_party);
    }
  }, [selectedBookingId, user, dispatch, conversations]);

  // Socket.IO for selected conversation
  useEffect(() => {
    if (!user || !selectedBookingId) return;

    const socket = connectSocket(user.id);
    joinBookingRoom(selectedBookingId);

    const handleNewMessage = (msg) => {
      if (msg.booking_id === selectedBookingId && msg.sender_id !== user.id) {
        dispatch(addRealtimeMessage(msg));
        dispatch(markMessagesAsRead(selectedBookingId)).then(() => {
          dispatch(fetchUnreadCount());
        });
      }
    };

    const handleTyping = ({ userId: typingUserId }) => {
      if (typingUserId !== user.id) {
        dispatch(setTypingUser({ bookingId: selectedBookingId, userId: typingUserId }));
      }
    };

    const handleStopTyping = () => {
      dispatch(clearTypingUser({ bookingId: selectedBookingId }));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [user, selectedBookingId, dispatch]);

  // Auto-scroll chat container to bottom (without moving the page)
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.other_party?.full_name?.toLowerCase().includes(q) ||
      c.service_name?.toLowerCase().includes(q)
    );
  });

  const handleSelectConversation = (bookingId) => {
    setSelectedBookingId(bookingId);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      toast.error('Only image files (JPG, PNG, GIF, WebP) are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }

    setPendingFile(file);
    setImagePreview(URL.createObjectURL(file));
    // Reset file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cancelImagePreview = () => {
    setImagePreview(null);
    setPendingFile(null);
  };

  const handleSendImage = async () => {
    if (!pendingFile || !selectedBookingId) return;

    setUploading(true);
    try {
      // Upload file to Supabase Storage via backend
      const uploadRes = await messagesAPI.uploadAttachment(selectedBookingId, pendingFile);
      const attachment = uploadRes.data.data;

      // Send message with attachment
      await dispatch(sendMessage({
        bookingId: selectedBookingId,
        message: '',
        attachments: [{ url: attachment.url, filename: attachment.filename, type: attachment.type }]
      })).unwrap();

      cancelImagePreview();
    } catch (err) {
      toast.error('Failed to upload image');
    }
    setUploading(false);
  };

  const handleSend = async () => {
    // If there's a pending image, send that instead
    if (pendingFile) {
      await handleSendImage();
      return;
    }

    const text = inputMessage.trim();
    if (!text || !selectedBookingId) return;

    setInputMessage('');

    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('stop_typing', { bookingId: selectedBookingId });
    }

    try {
      await dispatch(sendMessage({ bookingId: selectedBookingId, message: text })).unwrap();
    } catch (err) {
      toast.error('Failed to send message');
      setInputMessage(text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e) => {
    setInputMessage(e.target.value);

    const socket = getSocket();
    if (socket?.connected && selectedBookingId) {
      socket.emit('typing', { bookingId: selectedBookingId });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { bookingId: selectedBookingId });
      }, 2000);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const formatDateSeparator = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return 'Today';
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups, msg) => {
    const dateKey = new Date(msg.created_at).toDateString();
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(msg);
    return groups;
  }, {});

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        {/* Page Title */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Messages</h1>
        <div className="h-[2px] bg-gradient-to-r from-[#0E7480] via-[#c9a84c] to-transparent mb-4 sm:mb-6" />

        {/* Split Panel Container - Stack on mobile, side-by-side on larger screens */}
        <div className="flex flex-col md:flex-row bg-white rounded-xl border border-gray-200 overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '400px' }}>

          {/* ===== LEFT PANEL: Chat List ===== */}
          <div className={`w-full md:w-[300px] lg:w-[340px] flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 flex flex-col ${selectedBookingId ? 'hidden md:flex' : 'flex'}`}>
            {/* Search Bar */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search Chat List"
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-full text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0E7480]"
                />
              </div>
            </div>

            {/* Conversations List */}
            <div className="flex-1 overflow-y-auto">
              {loading.conversations ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 text-[#0E7480] animate-spin" />
                </div>
              ) : filteredConversations.length > 0 ? (
                filteredConversations.map((convo) => (
                  <button
                    key={convo.booking_id}
                    onClick={() => handleSelectConversation(convo.booking_id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                      selectedBookingId === convo.booking_id ? 'bg-blue-50' : ''
                    }`}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 bg-[#1a4d5c] rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-bold">
                        {convo.other_party?.full_name?.charAt(0) || '?'}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${convo.unread_count > 0 ? 'font-bold text-gray-900' : 'font-medium text-gray-800'}`}>
                          {convo.other_party?.full_name || 'Unknown'}
                        </p>
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">
                          {convo.latest_message?.created_at
                            ? new Date(convo.latest_message.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                            : ''}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">{convo.service_name}</p>
                      <p className={`text-xs truncate ${convo.unread_count > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                        {convo.latest_message?.message || 'No messages yet'}
                      </p>
                    </div>

                    {/* Unread Badge */}
                    {convo.unread_count > 0 && (
                      <span className="bg-red-500 text-white text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {convo.unread_count}
                      </span>
                    )}
                  </button>
                ))
              ) : (
                /* Empty state — matches uploaded design */
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <p className="text-sm text-gray-500 mb-4">You have no messages yet!</p>
                  <button
                    onClick={() => router.push(profile?.role === 'pro' ? '/pro-dashboard' : '/services')}
                    className="bg-[#2D3FBE] text-white px-8 py-2.5 rounded-full text-sm font-semibold hover:bg-[#2535a8] transition-colors"
                  >
                    Book a Job
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ===== RIGHT PANEL: Chat Area ===== */}
          <div className={`flex-1 flex flex-col ${selectedBookingId ? 'flex' : 'hidden md:flex'}`}>
            {selectedBookingId ? (
              <>
                {/* Chat Header */}
                <div className="px-3 sm:px-4 py-3 border-b border-gray-200 flex items-center gap-2 sm:gap-3">
                  {/* Mobile Back Button */}
                  <button
                    onClick={() => setSelectedBookingId(null)}
                    className="md:hidden w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5 text-gray-600" />
                  </button>
                  <div className="w-8 sm:w-9 h-8 sm:h-9 bg-[#1a4d5c] rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs sm:text-sm font-bold">
                      {otherParty?.full_name?.charAt(0) || '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">
                      {otherParty?.full_name || 'Chat'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {bookingInfo?.service_name || ''}
                    </p>
                  </div>
                </div>

                {/* Messages Area */}
                <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
                  {loading.messages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="w-6 h-6 text-[#0E7480] animate-spin" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Image
                          src="https://images.unsplash.com/photo-1577563908411-5077b6dc7624?q=80&w=200"
                          alt="Start chatting"
                          width={120}
                          height={120}
                          className="mx-auto mb-4 opacity-40 rounded-lg"
                          unoptimized
                        />
                        <p className="text-sm text-gray-400">Send a message to start the conversation</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      {Object.entries(groupedMessages).map(([dateKey, msgs]) => (
                        <div key={dateKey}>
                          {/* Date Separator */}
                          <div className="flex items-center gap-3 my-4">
                            <div className="flex-1 h-px bg-gray-200" />
                            <span className="text-[10px] text-gray-400 font-medium">
                              {formatDateSeparator(msgs[0].created_at)}
                            </span>
                            <div className="flex-1 h-px bg-gray-200" />
                          </div>

                          {msgs.map((msg) => {
                            const isOwn = msg.sender_id === user.id;
                            return (
                              <div
                                key={msg.id}
                                className={`flex mb-3 ${isOwn ? 'justify-end' : 'justify-start'}`}
                              >
                                {!isOwn && (
                                  <div className="w-7 h-7 bg-[#1a4d5c] rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                                    <span className="text-white text-[10px] font-bold">
                                      {msg.sender?.full_name?.charAt(0) || '?'}
                                    </span>
                                  </div>
                                )}
                                <div className="max-w-[65%]">
                                  {/* Image attachments */}
                                  {msg.attachments && msg.attachments.length > 0 && (
                                    <div className="mb-1">
                                      {msg.attachments.map((att, i) => (
                                        <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                          <img
                                            src={att.url}
                                            alt={att.filename || 'Image'}
                                            className={`max-w-[220px] rounded-xl border ${
                                              isOwn ? 'border-blue-400' : 'border-gray-200'
                                            }`}
                                          />
                                        </a>
                                      ))}
                                    </div>
                                  )}
                                  {/* Text message (skip placeholder for image-only) */}
                                  {msg.message && msg.message !== '📷 Image' && (
                                    <div
                                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                        isOwn
                                          ? 'bg-[#0E7480] text-white rounded-br-md'
                                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                      }`}
                                    >
                                      {msg.message}
                                    </div>
                                  )}
                                  {/* Fallback: show text bubble if no attachments and has message */}
                                  {(!msg.attachments || msg.attachments.length === 0) && msg.message === '📷 Image' && (
                                    <div
                                      className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                                        isOwn
                                          ? 'bg-[#0E7480] text-white rounded-br-md'
                                          : 'bg-gray-100 text-gray-800 rounded-bl-md'
                                      }`}
                                    >
                                      {msg.message}
                                    </div>
                                  )}
                                  <div className={`flex items-center gap-1 mt-0.5 ${isOwn ? 'justify-end' : ''}`}>
                                    <span className="text-[10px] text-gray-400">
                                      {formatTime(msg.created_at)}
                                    </span>
                                    {isOwn && (
                                      <CheckCheck className={`w-3 h-3 ${msg.is_read ? 'text-[#0E7480]' : 'text-gray-300'}`} />
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}

                      {/* Typing Indicator */}
                      {isTyping && (
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 bg-[#1a4d5c] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-[10px] font-bold">
                              {otherParty?.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className="bg-gray-100 px-3 py-2 rounded-2xl rounded-bl-md">
                            <div className="flex gap-1">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Image Preview Bar */}
                {imagePreview && (
                  <div className="border-t border-gray-200 px-3 py-2 bg-gray-50 flex items-center gap-3">
                    <div className="relative">
                      <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-300" />
                      <button
                        onClick={cancelImagePreview}
                        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 flex-1 truncate">{pendingFile?.name}</p>
                    <button
                      onClick={handleSendImage}
                      disabled={uploading}
                      className="bg-[#0E7480] text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-[#1e5bb8] transition-colors disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Image'}
                    </button>
                  </div>
                )}

                {/* Input Area — matches uploaded design: camera icon | input | send button */}
                <div className="border-t border-gray-200 px-3 py-2 flex items-center gap-2">
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="flex-1 px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 outline-none bg-transparent"
                  />
                  <button
                    onClick={handleSend}
                    disabled={(!inputMessage.trim() && !pendingFile) || loading.sending || uploading}
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                      inputMessage.trim() || pendingFile
                        ? 'bg-[#0E7480] text-white hover:bg-[#1e5bb8]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {loading.sending || uploading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </>
            ) : (
              /* Empty state right panel — illustration */
              <div className="flex-1 flex items-center justify-center bg-gray-50">
                <div className="text-center">
                  <Image
                    src="https://images.unsplash.com/photo-1577563908411-5077b6dc7624?q=80&w=200"
                    alt="Select a conversation"
                    width={140}
                    height={140}
                    className="mx-auto mb-4 opacity-30 rounded-lg"
                    unoptimized
                  />
                  <p className="text-sm text-gray-400">Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
