'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  AlertTriangle,
  MessageSquare,
  User,
  Clock,
  ChevronDown,
  ChevronUp,
  Send,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw,
  Eye,
  FileText,
  DollarSign,
} from 'lucide-react';
import { bookingsAPI, paymentsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function AdminDisputesPage() {
  const router = useRouter();
  const { user, profile } = useSelector((state) => state.auth);
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedDispute, setExpandedDispute] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolution, setResolution] = useState('');
  const [resolveAction, setResolveAction] = useState('approve');
  const [resolving, setResolving] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchDisputes();
  }, [user, profile, router]);

  const fetchDisputes = async () => {
    try {
      const res = await bookingsAPI.getAllDisputes();
      setDisputes(res.data?.data?.disputes || []);
    } catch (err) {
      console.error('Failed to fetch disputes:', err);
      toast.error('Failed to load disputes');
    } finally {
      setLoading(false);
    }
  };

  const handleExpandDispute = async (bookingId) => {
    if (expandedDispute === bookingId) {
      setExpandedDispute(null);
      setMessages([]);
      return;
    }

    setExpandedDispute(bookingId);
    setLoadingMessages(true);
    try {
      const res = await paymentsAPI.getDisputeMessages(bookingId);
      setMessages(res.data?.data?.messages || []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (bookingId) => {
    if (!newMessage.trim()) return;

    setSendingMessage(true);
    try {
      await paymentsAPI.sendDisputeMessage(bookingId, { message: newMessage.trim() });
      setNewMessage('');
      // Refresh messages
      const res = await paymentsAPI.getDisputeMessages(bookingId);
      setMessages(res.data?.data?.messages || []);
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('Failed to send message:', err);
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!resolution.trim()) {
      toast.error('Please provide resolution notes');
      return;
    }

    setResolving(true);
    try {
      await paymentsAPI.adminResolveDispute(resolveModal, {
        resolution: resolution.trim(),
        action: resolveAction,
      });
      toast.success(`Dispute resolved with action: ${resolveAction}`);
      setResolveModal(null);
      setResolution('');
      setResolveAction('approve');
      setExpandedDispute(null);
      fetchDisputes();
    } catch (err) {
      console.error('Failed to resolve dispute:', err);
      toast.error(err.response?.data?.message || 'Failed to resolve dispute');
    } finally {
      setResolving(false);
    }
  };

  if (!user || profile?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-500" />
            Dispute Management
          </h1>
          <p className="text-gray-600 mt-1">
            Review and resolve customer disputes with chat support
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{disputes.length}</p>
                <p className="text-xs text-gray-500">Open Disputes</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {disputes.filter(d => d.unread_messages > 0).length}
                </p>
                <p className="text-xs text-gray-500">Awaiting Response</p>
              </div>
            </div>
          </div>
        </div>

        {/* Disputes List */}
        {loading ? (
          <div className="bg-white rounded-xl p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading disputes...</span>
          </div>
        ) : disputes.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No open disputes</p>
            <p className="text-gray-500 text-sm">All disputes have been resolved</p>
          </div>
        ) : (
          <div className="space-y-4">
            {disputes.map((dispute) => {
              const isExpanded = expandedDispute === dispute.id;
              const proof = dispute.job_proof?.[0];

              return (
                <div
                  key={dispute.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Dispute Header */}
                  <div
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => handleExpandDispute(dispute.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {dispute.service_name}
                          </h3>
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">
                            Disputed
                          </span>
                          {dispute.unread_messages > 0 && (
                            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                              {dispute.unread_messages} new message{dispute.unread_messages > 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        {/* Customer Info */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4 text-gray-400" />
                            {dispute.profiles?.full_name || 'Customer'}
                          </span>
                          <span className="flex items-center gap-1">
                            <DollarSign className="w-4 h-4 text-gray-400" />
                            ${parseFloat(dispute.total_price || 0).toFixed(2)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-gray-400" />
                            {dispute.disputed_at
                              ? new Date(dispute.disputed_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'N/A'}
                          </span>
                        </div>

                        {/* Dispute Reason Preview */}
                        <p className="text-sm text-gray-500 line-clamp-2">
                          <span className="font-medium text-gray-700">Reason:</span>{' '}
                          {dispute.dispute_reason || 'No reason provided'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Details + Chat */}
                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-4">
                        {/* Left: Proof & Details */}
                        <div className="p-5 border-b lg:border-b-0 lg:border-r border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Job Details & Proof
                          </h4>

                          {/* Pro Info */}
                          <div className="bg-gray-50 rounded-lg p-3 mb-3">
                            <p className="text-xs text-gray-500 mb-1">Pro</p>
                            <p className="font-medium text-gray-900">
                              {dispute.pro_profiles?.business_name || 'N/A'}
                            </p>
                            <p className="text-xs text-gray-500">
                              {dispute.pro_profiles?.profiles?.email}
                            </p>
                          </div>

                          {/* Proof Photos */}
                          {proof ? (
                            <div className="mb-3">
                              <p className="text-xs text-gray-500 mb-2">Proof of Work</p>
                              <div className="grid grid-cols-3 gap-2">
                                {proof.photos?.slice(0, 6).map((photo, idx) => (
                                  <a
                                    key={idx}
                                    href={photo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
                                  >
                                    <img
                                      src={photo}
                                      alt={`Proof ${idx + 1}`}
                                      className="w-full h-full object-cover"
                                    />
                                  </a>
                                ))}
                              </div>
                              {proof.notes && (
                                <p className="text-sm text-gray-600 mt-2">
                                  <span className="font-medium">Notes:</span> {proof.notes}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500 italic">No proof submitted</p>
                          )}

                          {/* Resolve Actions */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <button
                              onClick={() => {
                                setResolveModal(dispute.id);
                                setResolution('');
                                setResolveAction('approve');
                              }}
                              className="w-full px-4 py-2 bg-[#0E7480] text-white rounded-lg text-sm font-semibold hover:bg-[#0a5a63] transition-colors"
                            >
                              Resolve Dispute
                            </button>
                          </div>
                        </div>

                        {/* Right: Chat */}
                        <div className="p-5 flex flex-col h-[400px]">
                          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Chat with Customer
                          </h4>

                          {/* Messages */}
                          <div className="flex-1 overflow-y-auto bg-gray-50 rounded-lg p-3 mb-3">
                            {loadingMessages ? (
                              <div className="flex items-center justify-center h-full">
                                <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
                              </div>
                            ) : messages.length === 0 ? (
                              <p className="text-sm text-gray-500 text-center py-4">
                                No messages yet
                              </p>
                            ) : (
                              <div className="space-y-3">
                                {messages.map((msg) => (
                                  <div
                                    key={msg.id}
                                    className={`flex ${
                                      msg.sender_role === 'admin' ? 'justify-end' : 'justify-start'
                                    }`}
                                  >
                                    <div
                                      className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                        msg.sender_role === 'admin'
                                          ? 'bg-[#0E7480] text-white'
                                          : 'bg-white border border-gray-200'
                                      }`}
                                    >
                                      <p className="text-sm">{msg.message}</p>
                                      <p
                                        className={`text-xs mt-1 ${
                                          msg.sender_role === 'admin'
                                            ? 'text-teal-100'
                                            : 'text-gray-400'
                                        }`}
                                      >
                                        {new Date(msg.created_at).toLocaleTimeString('en-US', {
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                                <div ref={messagesEndRef} />
                              </div>
                            )}
                          </div>

                          {/* Send Message */}
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newMessage}
                              onChange={(e) => setNewMessage(e.target.value)}
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleSendMessage(dispute.id);
                                }
                              }}
                              placeholder="Type a message..."
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                            />
                            <button
                              onClick={() => handleSendMessage(dispute.id)}
                              disabled={sendingMessage || !newMessage.trim()}
                              className="px-4 py-2 bg-[#0E7480] text-white rounded-lg hover:bg-[#0a5a63] transition-colors disabled:opacity-50"
                            >
                              {sendingMessage ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Resolve Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resolve Dispute</h3>

            {/* Action Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Action
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="action"
                    value="approve"
                    checked={resolveAction === 'approve'}
                    onChange={(e) => setResolveAction(e.target.value)}
                    className="w-4 h-4 text-[#0E7480]"
                  />
                  <div>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Approve Proof
                    </p>
                    <p className="text-xs text-gray-500">Customer must proceed to payment</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="action"
                    value="revision"
                    checked={resolveAction === 'revision'}
                    onChange={(e) => setResolveAction(e.target.value)}
                    className="w-4 h-4 text-[#0E7480]"
                  />
                  <div>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-yellow-500" />
                      Request Revision
                    </p>
                    <p className="text-xs text-gray-500">Pro must redo work and submit new proof</p>
                  </div>
                </label>
                <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="action"
                    value="refund"
                    checked={resolveAction === 'refund'}
                    onChange={(e) => setResolveAction(e.target.value)}
                    className="w-4 h-4 text-[#0E7480]"
                  />
                  <div>
                    <p className="font-medium text-gray-900 flex items-center gap-2">
                      <XCircle className="w-4 h-4 text-red-500" />
                      Cancel Job
                    </p>
                    <p className="text-xs text-gray-500">Job is cancelled, no payment required</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Resolution Notes */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resolution Notes
              </label>
              <textarea
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                placeholder="Explain the resolution decision..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setResolveModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveDispute}
                disabled={resolving || !resolution.trim()}
                className="flex-1 px-4 py-2 bg-[#0E7480] text-white rounded-lg text-sm font-semibold hover:bg-[#0a5a63] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {resolving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Resolving...
                  </>
                ) : (
                  'Resolve Dispute'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
