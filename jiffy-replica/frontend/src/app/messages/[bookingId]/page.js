'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import {
  ArrowLeft, Send, Loader2, CheckCheck, MessageSquare, Camera, X
} from 'lucide-react';
import { fetchMessages, sendMessage, markMessagesAsRead, fetchUnreadCount, addRealtimeMessage, setTypingUser, clearTypingUser } from '@/store/slices/messagesSlice';
import { getSocket, connectSocket, joinBookingRoom } from '@/lib/socket';
import { bookingsAPI, messagesAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const bookingId = params.bookingId;

  const { user, profile } = useSelector((state) => state.auth);
  const { messagesByBooking, loading, typingUsers } = useSelector((state) => state.messages);

  const [inputMessage, setInputMessage] = useState('');
  const [bookingInfo, setBookingInfo] = useState(null);
  const [otherParty, setOtherParty] = useState(null);
  const [loadingBooking, setLoadingBooking] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);
  const prevMessageCountRef = useRef(0);
  const initialScrollDone = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);

  const chatData = messagesByBooking[bookingId];
  const messages = chatData?.messages || [];
  const isTyping = typingUsers[bookingId];

  // Fetch booking info and messages
  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    const loadData = async () => {
      setLoadingBooking(true);
      try {
        // Fetch booking details
        const bookingRes = await bookingsAPI.getById(bookingId);
        const booking = bookingRes.data.data.booking;
        setBookingInfo(booking);

        // Determine other party
        if (booking.user_id === user.id) {
          // Current user is the customer, other party is the pro
          const proProfile = booking.pro_profiles?.profiles;
          setOtherParty({
            name: proProfile?.full_name || booking.pro_profiles?.business_name || 'Pro',
            avatar_url: proProfile?.avatar_url,
            role: 'pro',
          });
        } else {
          // Current user is the pro, other party is the customer
          setOtherParty({
            name: booking.profiles?.full_name || 'Customer',
            avatar_url: booking.profiles?.avatar_url,
            role: 'user',
          });
        }
      } catch (err) {
        console.error('Failed to load booking:', err);
      }
      setLoadingBooking(false);
    };

    loadData();
    dispatch(fetchMessages({ bookingId }));
    dispatch(markMessagesAsRead(bookingId)).then(() => {
      dispatch(fetchUnreadCount());
    });
  }, [user, bookingId, router, dispatch]);

  // Socket.IO setup
  useEffect(() => {
    if (!user) return;

    const socket = connectSocket(user.id);
    joinBookingRoom(bookingId);

    const handleNewMessage = (msg) => {
      // Only add if it's for this booking and not sent by us (already added optimistically)
      if (msg.booking_id === bookingId && msg.sender_id !== user.id) {
        dispatch(addRealtimeMessage(msg));
        dispatch(markMessagesAsRead(bookingId)).then(() => {
          dispatch(fetchUnreadCount());
        });
      }
    };

    const handleTyping = ({ userId: typingUserId }) => {
      if (typingUserId !== user.id) {
        dispatch(setTypingUser({ bookingId, userId: typingUserId }));
      }
    };

    const handleStopTyping = () => {
      dispatch(clearTypingUser({ bookingId }));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('user_typing', handleTyping);
    socket.on('user_stop_typing', handleStopTyping);

    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('user_typing', handleTyping);
      socket.off('user_stop_typing', handleStopTyping);
    };
  }, [user, bookingId, dispatch]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length === 0) return;

    // Initial load: scroll instantly to bottom (no animation)
    if (!initialScrollDone.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'instant' });
      initialScrollDone.current = true;
      prevMessageCountRef.current = messages.length;
      return;
    }

    // New message arrived: only smooth-scroll if user is near the bottom
    if (messages.length > prevMessageCountRef.current) {
      const container = messagesEndRef.current?.parentElement?.parentElement;
      if (container) {
        const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 200;
        if (isNearBottom) {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      } else {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }
    }
    prevMessageCountRef.current = messages.length;
  }, [messages, isTyping]);

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) { toast.error('Only image files are allowed'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('File size must be under 5MB'); return; }
    setPendingFile(file);
    setImagePreview(URL.createObjectURL(file));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cancelImagePreview = () => { setImagePreview(null); setPendingFile(null); };

  const handleSendImage = async () => {
    if (!pendingFile) return;
    setUploading(true);
    try {
      const uploadRes = await messagesAPI.uploadAttachment(bookingId, pendingFile);
      const att = uploadRes.data.data;
      await dispatch(sendMessage({ bookingId, message: '', attachments: [{ url: att.url, filename: att.filename, type: att.type }] })).unwrap();
      cancelImagePreview();
    } catch (err) { toast.error('Failed to upload image'); }
    setUploading(false);
  };

  const handleSend = async () => {
    if (pendingFile) { await handleSendImage(); return; }
    const text = inputMessage.trim();
    if (!text) return;

    setInputMessage('');

    // Emit stop typing
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('stop_typing', { bookingId });
    }

    try {
      await dispatch(sendMessage({ bookingId, message: text })).unwrap();
    } catch (err) {
      toast.error('Failed to send message');
      setInputMessage(text); // Restore on failure
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

    // Emit typing indicator
    const socket = getSocket();
    if (socket.connected) {
      socket.emit('typing', { bookingId });

      // Clear previous timeout and set new one
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { bookingId });
      }, 2000);
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-[96px] z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>

          {loadingBooking ? (
            <div className="flex-1">
              <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-48 bg-gray-100 rounded animate-pulse mt-1" />
            </div>
          ) : (
            <>
              <div className="w-10 h-10 bg-[#1a4d5c] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-bold">
                  {otherParty?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-sm font-bold text-gray-900 truncate">
                  {otherParty?.name || 'Chat'}
                </h2>
                <p className="text-xs text-gray-500 truncate">
                  {bookingInfo?.service_name || 'Booking'} &middot; #{bookingInfo?.booking_number || ''}
                </p>
              </div>
            </>
          )}

          {bookingInfo && (
            <Link
              href={profile?.role === 'pro' ? '/pro-dashboard' : '/dashboard'}
              className="text-xs text-[#0E7480] hover:underline font-medium"
            >
              View Booking
            </Link>
          )}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {loading.messages ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-[#0E7480] animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-20">
              <MessageSquare className="w-16 h-16 text-gray-200 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">Start the conversation</h3>
              <p className="text-sm text-gray-400">
                Send a message to {otherParty?.name || 'the other party'} about this booking.
              </p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([dateKey, msgs]) => (
              <div key={dateKey}>
                {/* Date Separator */}
                <div className="flex items-center gap-3 my-6">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-xs text-gray-400 font-medium">
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
                        <div className="w-8 h-8 bg-[#1a4d5c] rounded-full flex items-center justify-center flex-shrink-0 mr-2 mt-1">
                          <span className="text-white text-xs font-bold">
                            {msg.sender?.full_name?.charAt(0) || '?'}
                          </span>
                        </div>
                      )}
                      <div className={`max-w-[70%] ${isOwn ? 'order-1' : ''}`}>
                        {/* Image attachments */}
                        {msg.attachments && msg.attachments.length > 0 && (
                          <div className="mb-1">
                            {msg.attachments.map((att, i) => (
                              <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="block">
                                <img src={att.url} alt={att.filename || 'Image'} className={`max-w-[220px] rounded-xl border ${isOwn ? 'border-blue-400' : 'border-gray-200'}`} />
                              </a>
                            ))}
                          </div>
                        )}
                        {/* Text message */}
                        {msg.message && msg.message !== '\ud83d\udcf7 Image' && (
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isOwn
                                ? 'bg-[#0E7480] text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                            }`}
                          >
                            {msg.message}
                          </div>
                        )}
                        {(!msg.attachments || msg.attachments.length === 0) && msg.message === '\ud83d\udcf7 Image' && (
                          <div
                            className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                              isOwn
                                ? 'bg-[#0E7480] text-white rounded-br-md'
                                : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                            }`}
                          >
                            {msg.message}
                          </div>
                        )}
                        <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : ''}`}>
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
            ))
          )}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 bg-[#1a4d5c] rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {otherParty?.name?.charAt(0) || '?'}
                </span>
              </div>
              <div className="bg-white border border-gray-200 px-4 py-2.5 rounded-2xl rounded-bl-md">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Image Preview Bar */}
      {imagePreview && (
        <div className="bg-white border-t border-gray-200 px-4 py-2 flex items-center gap-3">
          <div className="relative">
            <img src={imagePreview} alt="Preview" className="w-16 h-16 object-cover rounded-lg border border-gray-300" />
            <button onClick={cancelImagePreview} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">
              <X className="w-3 h-3" />
            </button>
          </div>
          <p className="text-xs text-gray-500 flex-1 truncate">{pendingFile?.name}</p>
          <button onClick={handleSendImage} disabled={uploading} className="bg-[#0E7480] text-white px-4 py-1.5 rounded-full text-xs font-semibold hover:bg-[#1e5bb8] transition-colors disabled:opacity-50">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Send Image'}
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white border-t border-gray-200 sticky bottom-0">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3">
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={handleImageSelect} className="hidden" />
            <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-2 text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0">
              <Camera className="w-5 h-5" />
            </button>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={inputMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder={`Message ${otherParty?.name || ''}...`}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={(!inputMessage.trim() && !pendingFile) || loading.sending || uploading}
              className={`p-3 rounded-xl transition-colors flex-shrink-0 ${
                inputMessage.trim() || pendingFile
                  ? 'bg-[#0E7480] text-white hover:bg-[#1e5bb8]'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {loading.sending || uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
