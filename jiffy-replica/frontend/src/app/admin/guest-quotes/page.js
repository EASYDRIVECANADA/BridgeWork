'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import {
  FileText, Clock, User, MapPin, Calendar, DollarSign, Loader2,
  ChevronDown, ChevronUp, CheckCircle, XCircle, Send, AlertTriangle,
  Mail, Phone, CreditCard, Receipt, MessageSquare, ExternalLink,
  UserPlus, Briefcase, Star, Search, Wrench, RefreshCw
} from 'lucide-react';
import { guestQuotesAPI, prosAPI } from '@/lib/api';
import { toast } from 'react-toastify';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  pro_assigned: { label: 'Pro Assigned', color: 'bg-indigo-100 text-indigo-800', icon: UserPlus },
  pro_quoted: { label: 'Pro Quoted', color: 'bg-cyan-100 text-cyan-800', icon: Briefcase },
  quoted: { label: 'Quoted', color: 'bg-blue-100 text-blue-800', icon: DollarSign },
  payment_sent: { label: 'Payment Sent', color: 'bg-purple-100 text-purple-800', icon: CreditCard },
  paid: { label: 'Paid', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  completed: { label: 'Completed', color: 'bg-emerald-100 text-emerald-800', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle },
};

export default function AdminGuestQuotesPage() {
  const router = useRouter();
  const { user, profile } = useSelector((state) => state.auth);
  useAdminPermission('guest_quotes');

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Inline form state
  const [quotePrice, setQuotePrice] = useState('');
  const [quoteMessage, setQuoteMessage] = useState('');
  const [adminNotes, setAdminNotes] = useState('');

  // Pro assignment state
  const [prosList, setProsList] = useState([]);
  const [selectedProId, setSelectedProId] = useState(null);
  const [proSearch, setProSearch] = useState('');
  const [prosLoading, setProsLoading] = useState(false);
  const [showReassign, setShowReassign] = useState(null);

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadRequests();
    fetchPros();
  }, [user, profile, router]);

  const fetchPros = async () => {
    setProsLoading(true);
    try {
      const res = await prosAPI.adminList();
      setProsList(res.data?.data?.pros || []);
    } catch (err) {
      // silent — pros list is supplementary
    }
    setProsLoading(false);
  };

  const loadRequests = async () => {
    setLoading(true);
    try {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const res = await guestQuotesAPI.getAll(params);
      setRequests(res.data?.data?.requests || []);
    } catch (err) {
      toast.error('Failed to load guest quote requests.');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (user && profile?.role === 'admin') {
      loadRequests();
    }
  }, [statusFilter]);

  const handleSendQuote = async (id, proQuotedPrice) => {
    const price = quotePrice || proQuotedPrice;
    if (!price || parseFloat(price) <= 0) {
      toast.error('Please enter a valid quote price.');
      return;
    }
    setActionLoading(id);
    try {
      await guestQuotesAPI.sendQuote(id, {
        quoted_price: parseFloat(price),
        message: quoteMessage || undefined,
      });
      toast.success('Quote sent to guest via email.');
      setQuotePrice('');
      setQuoteMessage('');
      loadRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send quote.');
    }
    setActionLoading(null);
  };

  const handleAssignPro = async (requestId) => {
    if (!selectedProId) {
      toast.error('Please select a pro to assign.');
      return;
    }
    setActionLoading(requestId);
    try {
      await guestQuotesAPI.assignPro(requestId, { pro_id: selectedProId });
      toast.success('Pro assigned successfully. They will be notified via email.');
      setSelectedProId(null);
      setProSearch('');
      loadRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to assign pro.');
    }
    setActionLoading(null);
  };

  const handleSendPaymentLink = async (id) => {
    setActionLoading(id);
    try {
      await guestQuotesAPI.sendPaymentLink(id);
      toast.success('Payment link sent to guest via email.');
      loadRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send payment link.');
    }
    setActionLoading(null);
  };

  const handleSendInvoice = async (id) => {
    setActionLoading(id);
    try {
      await guestQuotesAPI.sendInvoice(id);
      toast.success('Invoice sent to guest via email.');
      loadRequests();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send invoice.');
    }
    setActionLoading(null);
  };

  const handleUpdateNotes = async (id) => {
    if (!adminNotes.trim()) return;
    setActionLoading(id);
    try {
      await guestQuotesAPI.update(id, { admin_notes: adminNotes });
      toast.success('Notes saved.');
      setAdminNotes('');
      loadRequests();
    } catch (err) {
      toast.error('Failed to save notes.');
    }
    setActionLoading(null);
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this guest quote request?')) return;
    setActionLoading(id);
    try {
      await guestQuotesAPI.update(id, { status: 'cancelled' });
      toast.success('Request cancelled.');
      loadRequests();
    } catch (err) {
      toast.error('Failed to cancel request.');
    }
    setActionLoading(null);
  };

  const handleMarkCompleted = async (id) => {
    setActionLoading(id);
    try {
      await guestQuotesAPI.update(id, { status: 'completed' });
      toast.success('Marked as completed.');
      loadRequests();
    } catch (err) {
      toast.error('Failed to update status.');
    }
    setActionLoading(null);
  };

  const toggleExpand = (id, req) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      setAdminNotes(req.admin_notes || '');
      setQuotePrice(req.quoted_price ? String(req.quoted_price) : (req.pro_quoted_price ? String(req.pro_quoted_price) : ''));
      setQuoteMessage('');
      setSelectedProId(null);
      setProSearch('');
    }
  };

  const filteredRequests = requests;
  const counts = {
    all: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    pro_assigned: requests.filter(r => r.status === 'pro_assigned').length,
    pro_quoted: requests.filter(r => r.status === 'pro_quoted').length,
    quoted: requests.filter(r => r.status === 'quoted').length,
    payment_sent: requests.filter(r => r.status === 'payment_sent').length,
    paid: requests.filter(r => r.status === 'paid').length,
    completed: requests.filter(r => r.status === 'completed').length,
    cancelled: requests.filter(r => r.status === 'cancelled').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Guest Quote Requests</h1>
            <p className="text-sm text-gray-500 mt-1">
              Manage quote requests from public visitors (no account required)
            </p>
          </div>
          <button
            onClick={loadRequests}
            disabled={loading}
            className="px-4 py-2 bg-[#0E7480] text-white rounded-lg text-sm font-medium hover:bg-[#0d6670] transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
          </button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'all', label: 'All' },
            { key: 'pending', label: 'Pending' },
            { key: 'pro_assigned', label: 'Pro Assigned' },
            { key: 'pro_quoted', label: 'Pro Quoted' },
            { key: 'quoted', label: 'Quoted' },
            { key: 'payment_sent', label: 'Payment Sent' },
            { key: 'paid', label: 'Paid' },
            { key: 'completed', label: 'Completed' },
            { key: 'cancelled', label: 'Cancelled' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === tab.key
                  ? 'bg-[#0E7480] text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {tab.label} ({counts[tab.key] || 0})
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No guest quote requests found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredRequests.map((req) => {
              const statusInfo = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
              const StatusIcon = statusInfo.icon;
              const isExpanded = expandedId === req.id;
              const total = req.quoted_price ? parseFloat(req.quoted_price) + parseFloat(req.tax_amount || 0) : null;

              return (
                <div key={req.id} className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
                  {/* Header - always visible */}
                  <button
                    onClick={() => toggleExpand(req.id, req)}
                    className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo.color}`}>
                          <StatusIcon className="w-3.5 h-3.5" />
                          {statusInfo.label}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-gray-900 truncate">{req.request_number}</p>
                          <span className="text-xs text-gray-400">•</span>
                          <p className="text-sm text-gray-600 truncate">{req.service_name}</p>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <User className="w-3 h-3" /> {req.guest_name}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {req.city}, {req.state}
                          </span>
                          <span className="text-xs text-gray-400">{formatDate(req.created_at)}</span>
                        </div>
                      </div>
                      {total && (
                        <div className="text-right flex-shrink-0">
                          <p className="text-sm font-bold text-[#0E7480]">{formatCurrency(total)}</p>
                          <p className="text-xs text-gray-400">incl. tax</p>
                        </div>
                      )}
                    </div>
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400 ml-2" /> : <ChevronDown className="w-5 h-5 text-gray-400 ml-2" />}
                  </button>

                  {/* Expanded Detail */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-5 py-5 bg-gray-50 space-y-5">
                      {/* Guest & Service Details */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4 text-[#0E7480]" /> Client Information
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p className="flex items-center gap-2 text-gray-700">
                              <User className="w-3.5 h-3.5 text-gray-400" /> {req.guest_name}
                            </p>
                            <p className="flex items-center gap-2 text-gray-700">
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                              <a href={`mailto:${req.guest_email}`} className="text-[#0E7480] hover:underline">{req.guest_email}</a>
                            </p>
                            <p className="flex items-center gap-2 text-gray-700">
                              <Phone className="w-3.5 h-3.5 text-gray-400" />
                              <a href={`tel:${req.guest_phone}`} className="text-[#0E7480] hover:underline">{req.guest_phone}</a>
                            </p>
                          </div>
                        </div>

                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#0E7480]" /> Service Details
                          </h4>
                          <div className="space-y-2 text-sm">
                            <p className="text-gray-700"><strong>Service:</strong> {req.service_name}</p>
                            <p className="flex items-center gap-2 text-gray-700">
                              <MapPin className="w-3.5 h-3.5 text-gray-400" />
                              {req.address}, {req.city}, {req.state} {req.zip_code}
                            </p>
                            {req.preferred_date && (
                              <p className="flex items-center gap-2 text-gray-700">
                                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                                Preferred: {formatDate(req.preferred_date)}
                              </p>
                            )}
                            {req.description && (
                              <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                                <strong>Notes:</strong> {req.description}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Assigned Pro Info (if pro has been assigned) */}
                      {req.assigned_pro_id && req.pro_profiles && (
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <Briefcase className="w-4 h-4 text-[#0E7480]" /> Assigned Pro
                          </h4>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <Briefcase className="w-5 h-5 text-indigo-600" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{req.pro_profiles?.business_name || 'Pro'}</p>
                              {req.status === 'pro_assigned' && (
                                <p className="text-xs text-amber-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" /> Waiting for pro to submit quote
                                </p>
                              )}
                              {req.pro_quote_submitted_at && (
                                <p className="text-xs text-green-600">Quote submitted {formatDate(req.pro_quote_submitted_at)}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pro's Quote Details (if pro has submitted) */}
                      {req.pro_quoted_price && (
                        <div className="bg-white rounded-lg p-4 border border-cyan-200">
                          <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-cyan-600" /> Pro&apos;s Quotation
                          </h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-600">Quoted Price:</span>
                              <span className="font-bold text-lg text-cyan-700">{formatCurrency(req.pro_quoted_price)}</span>
                            </div>
                            {req.pro_quote_description && (
                              <div>
                                <span className="text-gray-600 text-xs">Description:</span>
                                <p className="text-gray-800 mt-0.5 p-2 bg-gray-50 rounded text-xs">{req.pro_quote_description}</p>
                              </div>
                            )}
                            {req.pro_estimated_duration && (
                              <p className="text-gray-700"><strong>Estimated Duration:</strong> {req.pro_estimated_duration}</p>
                            )}
                            {req.pro_warranty_info && (
                              <p className="text-gray-700"><strong>Warranty:</strong> {req.pro_warranty_info}</p>
                            )}
                            {req.pro_notes && (
                              <div>
                                <span className="text-gray-600 text-xs">Pro Notes:</span>
                                <p className="text-gray-800 mt-0.5 p-2 bg-gray-50 rounded text-xs">{req.pro_notes}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Price Summary (if quote has been sent to guest) */}
                      {req.quoted_price && (
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                            <DollarSign className="w-4 h-4 text-[#0E7480]" /> Quote Summary
                          </h4>
                          <div className="grid grid-cols-3 gap-4 text-sm text-center">
                            <div>
                              <p className="text-gray-500 text-xs">Subtotal</p>
                              <p className="font-semibold">{formatCurrency(req.quoted_price)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">HST</p>
                              <p className="font-semibold">{formatCurrency(req.tax_amount)}</p>
                            </div>
                            <div>
                              <p className="text-gray-500 text-xs">Total</p>
                              <p className="font-bold text-[#0E7480]">{formatCurrency(total)}</p>
                            </div>
                          </div>
                          {req.stripe_session_url && (
                            <div className="mt-2 text-xs text-gray-500">
                              <a href={req.stripe_session_url} target="_blank" rel="noopener noreferrer" className="text-[#0E7480] hover:underline flex items-center gap-1">
                                <ExternalLink className="w-3 h-3" /> View payment link
                              </a>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Admin Notes */}
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-800 mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#0E7480]" /> Admin Notes
                        </h4>
                        <textarea
                          rows={3}
                          value={adminNotes}
                          onChange={(e) => setAdminNotes(e.target.value)}
                          placeholder="Internal notes about this request..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent resize-none"
                        />
                        <button
                          onClick={() => handleUpdateNotes(req.id)}
                          disabled={actionLoading === req.id}
                          className="mt-2 px-3 py-1.5 bg-gray-600 text-white rounded text-xs font-medium hover:bg-gray-700 disabled:opacity-50"
                        >
                          Save Notes
                        </button>
                      </div>

                      {/* Actions */}
                      <div className="bg-white rounded-lg p-4 border border-gray-100">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Actions</h4>
                        <div className="space-y-4">
                          {/* Assign Pro (only if pending) */}
                          {req.status === 'pending' && (
                            <div className="border border-indigo-100 rounded-lg p-4 bg-indigo-50/50">
                              <p className="text-sm font-medium text-indigo-800 mb-2 flex items-center gap-2">
                                <UserPlus className="w-4 h-4" /> Assign a Pro
                              </p>
                              <p className="text-xs text-gray-600 mb-3">
                                Select an approved pro to provide a quotation for this guest request.
                              </p>
                              {/* Pro search */}
                              <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search pros by name or business..."
                                  value={proSearch}
                                  onChange={(e) => setProSearch(e.target.value)}
                                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                              {/* Pro list */}
                              <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
                                {prosLoading ? (
                                  <div className="flex justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                                  </div>
                                ) : (
                                  prosList
                                    .filter(p => {
                                      const term = proSearch.toLowerCase();
                                      return !term || (p.business_name || '').toLowerCase().includes(term) || (p.profiles?.full_name || '').toLowerCase().includes(term);
                                    })
                                    .map(pro => (
                                      <button
                                        key={pro.id}
                                        type="button"
                                        onClick={() => setSelectedProId(pro.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center gap-3 ${
                                          selectedProId === pro.id
                                            ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                            : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                      >
                                        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                                          selectedProId === pro.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {pro.business_name || pro.profiles?.full_name}
                                          </p>
                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                            {pro.rating > 0 && (
                                              <span className="flex items-center gap-0.5">
                                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {Number(pro.rating).toFixed(1)}
                                              </span>
                                            )}
                                            <span>{pro.completed_jobs || 0} jobs</span>
                                            {pro.profiles?.city && <span>{pro.profiles.city}</span>}
                                          </div>
                                        </div>
                                      </button>
                                    ))
                                )}
                                {!prosLoading && prosList.filter(p => {
                                  const term = proSearch.toLowerCase();
                                  return !term || (p.business_name || '').toLowerCase().includes(term) || (p.profiles?.full_name || '').toLowerCase().includes(term);
                                }).length === 0 && (
                                  <p className="text-xs text-gray-500 text-center py-3">No approved pros found.</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleAssignPro(req.id)}
                                disabled={actionLoading === req.id || !selectedProId}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                Assign Pro
                              </button>
                            </div>
                          )}

                          {/* Waiting for pro (pro_assigned) — with re-assign option */}
                          {req.status === 'pro_assigned' && (
                            <div className="border border-amber-100 rounded-lg p-4 bg-amber-50/50">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-sm font-medium text-amber-800 flex items-center gap-2">
                                  <Clock className="w-4 h-4" /> Awaiting Pro Quotation
                                </p>
                                <button
                                  onClick={() => setShowReassign(showReassign === req.id ? null : req.id)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" /> Re-assign
                                </button>
                              </div>
                              <p className="text-xs text-gray-600 mb-3">
                                {req.pro_profiles?.business_name || 'The assigned pro'} has been notified and will submit their quotation.
                              </p>
                              {showReassign === req.id && (
                                <div className="border-t border-amber-200 pt-3 mt-2">
                                  <p className="text-xs text-gray-600 mb-2">Select a different pro to re-assign this request. The current pro&apos;s assignment will be removed.</p>
                                  <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="Search pros by name or business..."
                                      value={proSearch}
                                      onChange={(e) => setProSearch(e.target.value)}
                                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400"
                                    />
                                  </div>
                                  <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
                                    {prosLoading ? (
                                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
                                    ) : (
                                      prosList
                                        .filter(p => {
                                          const term = proSearch.toLowerCase();
                                          return !term || (p.business_name || '').toLowerCase().includes(term) || (p.profiles?.full_name || '').toLowerCase().includes(term);
                                        })
                                        .map(pro => (
                                          <button
                                            key={pro.id}
                                            type="button"
                                            onClick={() => setSelectedProId(pro.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center gap-3 ${
                                              selectedProId === pro.id
                                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                                : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                          >
                                            <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                                              selectedProId === pro.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400'
                                            }`} />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-gray-900 truncate">
                                                {pro.business_name || pro.profiles?.full_name}
                                              </p>
                                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                                {pro.rating > 0 && (
                                                  <span className="flex items-center gap-0.5">
                                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {Number(pro.rating).toFixed(1)}
                                                  </span>
                                                )}
                                                <span>{pro.completed_jobs || 0} jobs</span>
                                                {pro.profiles?.city && <span>{pro.profiles.city}</span>}
                                              </div>
                                            </div>
                                          </button>
                                        ))
                                    )}
                                  </div>
                                  <button
                                    onClick={() => { handleAssignPro(req.id); setShowReassign(null); }}
                                    disabled={actionLoading === req.id || !selectedProId}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    Re-assign Pro
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Re-assign option for pro_quoted */}
                          {req.status === 'pro_quoted' && (
                            <div className="border border-gray-200 rounded-lg p-3 bg-gray-50/50 mb-4">
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-gray-600">Want a different pro? You can re-assign this request.</p>
                                <button
                                  onClick={() => setShowReassign(showReassign === req.id ? null : req.id)}
                                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                >
                                  <RefreshCw className="w-3 h-3" /> Re-assign Pro
                                </button>
                              </div>
                              {showReassign === req.id && (
                                <div className="border-t border-gray-200 pt-3 mt-2">
                                  <p className="text-xs text-gray-600 mb-2">The current pro&apos;s quote will be discarded and the new pro will start fresh.</p>
                                  <div className="relative mb-3">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                    <input
                                      type="text"
                                      placeholder="Search pros by name or business..."
                                      value={proSearch}
                                      onChange={(e) => setProSearch(e.target.value)}
                                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400"
                                    />
                                  </div>
                                  <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
                                    {prosLoading ? (
                                      <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
                                    ) : (
                                      prosList
                                        .filter(p => {
                                          const term = proSearch.toLowerCase();
                                          return !term || (p.business_name || '').toLowerCase().includes(term) || (p.profiles?.full_name || '').toLowerCase().includes(term);
                                        })
                                        .map(pro => (
                                          <button
                                            key={pro.id}
                                            type="button"
                                            onClick={() => setSelectedProId(pro.id)}
                                            className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center gap-3 ${
                                              selectedProId === pro.id
                                                ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                                : 'border-gray-200 hover:bg-gray-50'
                                            }`}
                                          >
                                            <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                                              selectedProId === pro.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400'
                                            }`} />
                                            <div className="flex-1 min-w-0">
                                              <p className="text-sm font-medium text-gray-900 truncate">
                                                {pro.business_name || pro.profiles?.full_name}
                                              </p>
                                              <div className="flex items-center gap-2 text-xs text-gray-500">
                                                {pro.rating > 0 && (
                                                  <span className="flex items-center gap-0.5">
                                                    <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {Number(pro.rating).toFixed(1)}
                                                  </span>
                                                )}
                                                <span>{pro.completed_jobs || 0} jobs</span>
                                                {pro.profiles?.city && <span>{pro.profiles.city}</span>}
                                              </div>
                                            </div>
                                          </button>
                                        ))
                                    )}
                                  </div>
                                  <button
                                    onClick={() => { handleAssignPro(req.id); setShowReassign(null); }}
                                    disabled={actionLoading === req.id || !selectedProId}
                                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    Re-assign Pro
                                  </button>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Send Quote to Guest (pro_quoted — pro has submitted their quote) */}
                          {req.status === 'pro_quoted' && (
                            <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/50">
                              <p className="text-sm font-medium text-blue-800 mb-2">Send Quote to Guest</p>
                              <p className="text-xs text-gray-600 mb-3">
                                Pro quoted <strong>{formatCurrency(req.pro_quoted_price)}</strong>. You can adjust the price or send it as is.
                              </p>
                              <div className="flex gap-2 mb-2">
                                <div className="flex-1">
                                  <label className="block text-xs text-gray-600 mb-1">Price (CAD)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0.01"
                                    placeholder={String(req.pro_quoted_price)}
                                    value={quotePrice}
                                    onChange={(e) => setQuotePrice(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480]"
                                  />
                                  <p className="text-xs text-gray-400 mt-1">Leave blank to use pro&apos;s price ({formatCurrency(req.pro_quoted_price)})</p>
                                </div>
                              </div>
                              <div className="mb-2">
                                <label className="block text-xs text-gray-600 mb-1">Message to guest (optional)</label>
                                <textarea
                                  rows={2}
                                  value={quoteMessage}
                                  onChange={(e) => setQuoteMessage(e.target.value)}
                                  placeholder="Any notes or details about the quote..."
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] resize-none"
                                />
                              </div>
                              <button
                                onClick={() => handleSendQuote(req.id, req.pro_quoted_price)}
                                disabled={actionLoading === req.id}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                Send Quote Email
                              </button>
                            </div>
                          )}

                          {/* Send Payment Link (only if quoted) */}
                          {req.status === 'quoted' && (
                            <div className="border border-purple-100 rounded-lg p-4 bg-purple-50/50">
                              <p className="text-sm font-medium text-purple-800 mb-2">
                                Send Payment Link — {formatCurrency(total)}
                              </p>
                              <p className="text-xs text-gray-600 mb-3">
                                Creates a Stripe Checkout session and emails the payment link to the guest.
                              </p>
                              <button
                                onClick={() => handleSendPaymentLink(req.id)}
                                disabled={actionLoading === req.id}
                                className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                Send Payment Link
                              </button>
                            </div>
                          )}

                          {/* Send Invoice (only if paid) */}
                          {req.status === 'paid' && (
                            <div className="border border-green-100 rounded-lg p-4 bg-green-50/50">
                              <p className="text-sm font-medium text-green-800 mb-2">Payment Received</p>
                              <p className="text-xs text-gray-600 mb-3">
                                Payment has been confirmed. Send the guest an invoice receipt via email.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleSendInvoice(req.id)}
                                  disabled={actionLoading === req.id}
                                  className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                  {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
                                  Send Invoice Email
                                </button>
                                <button
                                  onClick={() => handleMarkCompleted(req.id)}
                                  disabled={actionLoading === req.id}
                                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                  Mark Completed
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Re-assign / Reactivate (cancelled) */}
                          {req.status === 'cancelled' && (
                            <div className="border border-indigo-100 rounded-lg p-4 bg-indigo-50/50">
                              <p className="text-sm font-medium text-indigo-800 mb-2 flex items-center gap-2">
                                <RefreshCw className="w-4 h-4" /> Reactivate & Assign Pro
                              </p>
                              <p className="text-xs text-gray-600 mb-3">
                                This request was cancelled. Select a pro to reactivate and assign it.
                              </p>
                              <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                  type="text"
                                  placeholder="Search pros by name or business..."
                                  value={proSearch}
                                  onChange={(e) => setProSearch(e.target.value)}
                                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                              <div className="max-h-48 overflow-y-auto space-y-2 mb-3">
                                {prosLoading ? (
                                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
                                ) : (
                                  prosList
                                    .filter(p => {
                                      const term = proSearch.toLowerCase();
                                      return !term || (p.business_name || '').toLowerCase().includes(term) || (p.profiles?.full_name || '').toLowerCase().includes(term);
                                    })
                                    .map(pro => (
                                      <button
                                        key={pro.id}
                                        type="button"
                                        onClick={() => setSelectedProId(pro.id)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors flex items-center gap-3 ${
                                          selectedProId === pro.id
                                            ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                                            : 'border-gray-200 hover:bg-gray-50'
                                        }`}
                                      >
                                        <div className={`w-3 h-3 rounded-full border-2 flex-shrink-0 ${
                                          selectedProId === pro.id ? 'border-indigo-600 bg-indigo-600' : 'border-gray-400'
                                        }`} />
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-gray-900 truncate">
                                            {pro.business_name || pro.profiles?.full_name}
                                          </p>
                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                            {pro.rating > 0 && (
                                              <span className="flex items-center gap-0.5">
                                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" /> {Number(pro.rating).toFixed(1)}
                                              </span>
                                            )}
                                            <span>{pro.completed_jobs || 0} jobs</span>
                                            {pro.profiles?.city && <span>{pro.profiles.city}</span>}
                                          </div>
                                        </div>
                                      </button>
                                    ))
                                )}
                              </div>
                              <button
                                onClick={() => handleAssignPro(req.id)}
                                disabled={actionLoading === req.id || !selectedProId}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                              >
                                {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                Reactivate & Assign
                              </button>
                            </div>
                          )}

                          {/* Cancel (unless already cancelled/completed) */}
                          {!['cancelled', 'completed'].includes(req.status) && (
                            <button
                              onClick={() => handleCancel(req.id)}
                              disabled={actionLoading === req.id}
                              className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50 flex items-center gap-2"
                            >
                              <XCircle className="w-4 h-4" />
                              Cancel Request
                            </button>
                          )}
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
    </div>
  );
}
