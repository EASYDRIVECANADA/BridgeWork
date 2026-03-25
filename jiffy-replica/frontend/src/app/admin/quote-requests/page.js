'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import {
  FileText, Clock, User, MapPin, Calendar, DollarSign, Loader2,
  ChevronDown, ChevronUp, CheckCircle, XCircle, Send, AlertTriangle
} from 'lucide-react';
import { bookingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minutes} ${ampm}`;
}

export default function AdminQuoteRequestsPage() {
  const router = useRouter();
  const { user, profile } = useSelector((state) => state.auth);
  useAdminPermission('quote_requests');
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  
  // Price form state
  const [priceInputs, setPriceInputs] = useState({});
  const [notesInputs, setNotesInputs] = useState({});
  
  // Reject modal
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadQuoteRequests();
  }, [user, profile, router]);

  const loadQuoteRequests = async () => {
    setLoading(true);
    try {
      const res = await bookingsAPI.getQuoteRequests();
      setQuoteRequests(res.data?.data?.quote_requests || []);
    } catch (err) {
      toast.error('Failed to load quote requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSetPrice = async (id) => {
    const price = parseFloat(priceInputs[id]);
    if (!price || price <= 0) {
      toast.error('Please enter a valid price greater than 0');
      return;
    }
    
    setActionLoading(id);
    try {
      await bookingsAPI.setQuotePrice(id, {
        total_price: price,
        admin_notes: notesInputs[id] || ''
      });
      toast.success('Quote priced and sent to pros!');
      loadQuoteRequests();
      setExpandedId(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to set price');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal) return;
    
    setActionLoading(rejectModal);
    try {
      await bookingsAPI.cancelQuoteRequest(rejectModal, {
        reason: rejectReason || 'Quote request declined'
      });
      toast.success('Quote request cancelled');
      setRejectModal(null);
      setRejectReason('');
      loadQuoteRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel quote request');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Quote Requests</h1>
          <p className="text-gray-500 text-sm">Review and price Free Quote service requests before sending to pros</p>
        </div>

        {/* Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{quoteRequests.length}</p>
                <p className="text-xs text-gray-500">Pending Quotes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quote Requests List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading quote requests...</span>
          </div>
        ) : quoteRequests.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No pending quote requests</h3>
            <p className="text-gray-500">When customers request Free Quote services, they will appear here for pricing.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {quoteRequests.map((request) => {
              const isExpanded = expandedId === request.id;
              return (
                <div key={request.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Summary Row */}
                  <div
                    className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : request.id)}
                  >
                    <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <FileText className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{request.service_name}</p>
                      <p className="text-xs text-gray-500">
                        {request.profiles?.full_name || 'Customer'} • {request.city}, {request.state}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Requested</p>
                        <p className="text-sm font-medium text-gray-700">{formatDate(request.created_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Scheduled</p>
                        <p className="text-sm font-medium text-gray-700">
                          {formatDate(request.scheduled_date)} {formatTime(request.scheduled_time)}
                        </p>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                        Awaiting Price
                      </span>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                      <div className="grid md:grid-cols-2 gap-6 mb-6">
                        {/* Customer Info */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4" /> Customer Info
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Name:</span> <span className="font-medium">{request.profiles?.full_name || '—'}</span></p>
                            <p><span className="text-gray-500">Email:</span> <span className="font-medium">{request.profiles?.email || '—'}</span></p>
                            <p><span className="text-gray-500">Phone:</span> <span className="font-medium">{request.profiles?.phone || '—'}</span></p>
                          </div>
                        </div>

                        {/* Service & Location */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <MapPin className="w-4 h-4" /> Service Location
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Service:</span> <span className="font-medium">{request.service_name}</span></p>
                            <p><span className="text-gray-500">Address:</span> <span className="font-medium">{request.address}</span></p>
                            <p><span className="text-gray-500">City:</span> <span className="font-medium">{request.city}, {request.state} {request.zip_code}</span></p>
                          </div>
                        </div>

                        {/* Schedule */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> Schedule
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Date:</span> <span className="font-medium">{formatDate(request.scheduled_date)}</span></p>
                            <p><span className="text-gray-500">Time:</span> <span className="font-medium">{formatTime(request.scheduled_time)}</span></p>
                            <p><span className="text-gray-500">Duration:</span> <span className="font-medium">{request.estimated_duration || 60} min (estimated)</span></p>
                          </div>
                        </div>

                        {/* Special Instructions */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Special Instructions
                          </h3>
                          <div className="bg-white rounded-lg p-3 border border-gray-200 text-sm">
                            {request.special_instructions || <span className="text-gray-400 italic">No special instructions provided</span>}
                          </div>
                        </div>
                      </div>

                      {/* Pricing Form */}
                      <div className="border-t border-gray-200 pt-5">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                          <DollarSign className="w-4 h-4" /> Set Quote Price
                        </h3>
                        <div className="flex flex-wrap items-end gap-4">
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-gray-500 mb-1 block">Price (before tax)</label>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={priceInputs[request.id] || ''}
                                onChange={(e) => setPriceInputs(prev => ({ ...prev, [request.id]: e.target.value }))}
                                placeholder="Enter price"
                                className="w-full pl-7 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] outline-none"
                              />
                            </div>
                            {priceInputs[request.id] && parseFloat(priceInputs[request.id]) > 0 && (
                              <p className="text-xs text-gray-500 mt-1">
                                Total with tax (8%): <span className="font-semibold text-gray-700">{formatCurrency(parseFloat(priceInputs[request.id]) * 1.08)}</span>
                              </p>
                            )}
                          </div>
                          <div className="flex-1 min-w-[200px]">
                            <label className="text-xs text-gray-500 mb-1 block">Admin Notes (optional)</label>
                            <input
                              type="text"
                              value={notesInputs[request.id] || ''}
                              onChange={(e) => setNotesInputs(prev => ({ ...prev, [request.id]: e.target.value }))}
                              placeholder="Internal notes..."
                              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] outline-none"
                            />
                          </div>
                          <button
                            onClick={() => handleSetPrice(request.id)}
                            disabled={actionLoading === request.id || !priceInputs[request.id]}
                            className="px-6 py-2.5 bg-[#0E7480] text-white text-sm font-semibold rounded-lg hover:bg-[#0c6670] disabled:opacity-50 flex items-center gap-2"
                          >
                            {actionLoading === request.id ? (
                              <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                            ) : (
                              <><Send className="w-4 h-4" /> Set Price & Send to Pros</>
                            )}
                          </button>
                          <button
                            onClick={() => { setRejectModal(request.id); setRejectReason(''); }}
                            disabled={actionLoading === request.id}
                            className="px-4 py-2.5 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 border border-red-200 flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" /> Decline
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Reject Modal */}
        {rejectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-6">
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Decline Quote Request
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                The customer will be notified that their quote request was declined.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for declining (optional)..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-24 focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button 
                  onClick={() => setRejectModal(null)} 
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading === rejectModal}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {actionLoading === rejectModal ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Declining...</>
                  ) : (
                    'Decline Request'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
