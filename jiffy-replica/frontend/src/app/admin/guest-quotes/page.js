'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import {
  FileText, Clock, User, MapPin, Calendar, DollarSign, Loader2,
  ChevronDown, ChevronUp, CheckCircle, XCircle, Send, AlertTriangle,
  Mail, Phone, CreditCard, Receipt, MessageSquare, ExternalLink,
  UserPlus, Briefcase, Star, Search, Wrench, RefreshCw, Download
} from 'lucide-react';
import { guestQuotesAPI, prosAPI } from '@/lib/api';
import { toast } from 'react-toastify';
import { generateGuestQuotePDF } from '@/utils/generateGuestQuotePDF';
import { generateGuestInvoicePDF } from '@/utils/generateGuestInvoicePDF';
import { generatePayoutReceiptPDF } from '@/utils/generatePayoutReceiptPDF';

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
  const [guestCommissions, setGuestCommissions] = useState({}); // { [requestId]: { dollar: string, pct: string } }
  const [guestProPrices, setGuestProPrices] = useState({}); // { [requestId]: string }
  const [guestTaxRates, setGuestTaxRates] = useState({}); // { [requestId]: string (percentage, e.g. "13") }
  const [guestQuoteEdits, setGuestQuoteEdits] = useState({}); // { [requestId]: { description, duration, warranty, notes } }

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

  const DEFAULT_GUEST_COMMISSION_RATE = 0.1722;

  const computeGuestBreakdown = (reqId, proPrice, commissionDollar) => {
    const pro = parseFloat(proPrice) || 0;
    const comm = parseFloat(commissionDollar) || 0;
    const subtotal = pro + comm;
    const taxPct = parseFloat(getGuestTaxRate(reqId)) || 0;
    const taxRate = taxPct / 100;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;
    return { pro, comm, subtotal, tax, taxPct, total };
  };

  const getGuestProPrice = (reqId, originalProPrice) => {
    if (guestProPrices[reqId] !== undefined) return guestProPrices[reqId];
    return parseFloat(originalProPrice).toFixed(2);
  };

  const getGuestTaxRate = (reqId) => {
    if (guestTaxRates[reqId] !== undefined) return guestTaxRates[reqId];
    return '13';
  };

  const getGuestCommission = (reqId, originalProPrice) => {
    if (guestCommissions[reqId]) return guestCommissions[reqId];
    const pro = parseFloat(getGuestProPrice(reqId, originalProPrice)) || 0;
    const defaultDollar = (pro * DEFAULT_GUEST_COMMISSION_RATE).toFixed(2);
    return { dollar: defaultDollar, pct: (DEFAULT_GUEST_COMMISSION_RATE * 100).toFixed(2) };
  };

  const setGuestCommissionDollar = (reqId, originalProPrice, dollarVal) => {
    const pro = parseFloat(getGuestProPrice(reqId, originalProPrice)) || 0;
    const dollar = parseFloat(dollarVal) || 0;
    const pct = pro > 0 ? ((dollar / pro) * 100).toFixed(2) : '0.00';
    setGuestCommissions(prev => ({ ...prev, [reqId]: { dollar: dollarVal, pct } }));
  };

  const setGuestCommissionPct = (reqId, originalProPrice, pctVal) => {
    const pro = parseFloat(getGuestProPrice(reqId, originalProPrice)) || 0;
    const pct = parseFloat(pctVal) || 0;
    const dollar = ((pro * pct) / 100).toFixed(2);
    setGuestCommissions(prev => ({ ...prev, [reqId]: { dollar, pct: pctVal } }));
  };

  const applyGuestPreset = (reqId, originalProPrice, pct) => {
    setGuestCommissionPct(reqId, originalProPrice, String(pct));
  };

  const handleGuestProPriceChange = (reqId, originalProPrice, newPrice) => {
    setGuestProPrices(prev => ({ ...prev, [reqId]: newPrice }));
    // Recalculate commission at same rate
    const comm = getGuestCommission(reqId, originalProPrice);
    const oldPro = parseFloat(getGuestProPrice(reqId, originalProPrice)) || 0;
    const rate = oldPro > 0 ? parseFloat(comm.dollar) / oldPro : DEFAULT_GUEST_COMMISSION_RATE;
    const newPro = parseFloat(newPrice) || 0;
    const newDollar = (newPro * rate).toFixed(2);
    const newPct = newPro > 0 ? ((parseFloat(newDollar) / newPro) * 100).toFixed(2) : '0.00';
    setGuestCommissions(prev => ({ ...prev, [reqId]: { dollar: newDollar, pct: newPct } }));
  };

  const getGuestQuoteEdit = (reqId, req) => {
    if (guestQuoteEdits[reqId]) return guestQuoteEdits[reqId];
    return {
      description: req.pro_quote_description || '',
      duration: req.pro_estimated_duration || '',
      warranty: req.pro_warranty_info || '',
      notes: req.pro_notes || '',
    };
  };

  const updateGuestQuoteEdit = (reqId, field, value) => {
    setGuestQuoteEdits(prev => ({
      ...prev,
      [reqId]: { ...getGuestQuoteEdit(reqId, {}), ...prev[reqId], [field]: value }
    }));
  };

  const handleSendQuote = async (id, originalProQuotedPrice, req) => {
    const effectiveProPrice = parseFloat(getGuestProPrice(id, originalProQuotedPrice)) || 0;
    const comm = getGuestCommission(id, originalProQuotedPrice);
    const bd = computeGuestBreakdown(id, effectiveProPrice, comm.dollar);
    const price = parseFloat(bd.subtotal.toFixed(2));
    if (!price || price <= 0) {
      toast.error('Please enter a valid quote price.');
      return;
    }

    const taxPct = parseFloat(getGuestTaxRate(id)) || 0;
    const taxRateDecimal = taxPct / 100;

    setActionLoading(id);
    try {
      const payload = {
        quoted_price: price,
        message: quoteMessage || undefined,
        commission_amount: parseFloat(comm.dollar) || 0,
      };
      // Send edited pro price if different from original
      if (effectiveProPrice !== parseFloat(originalProQuotedPrice)) {
        payload.edited_pro_price = effectiveProPrice;
      }
      // Send custom tax rate if different from default 13%
      if (Math.abs(taxRateDecimal - 0.13) > 0.0001) {
        payload.tax_rate = taxRateDecimal;
      }
      // Send edited quote content fields if admin changed them
      const edits = guestQuoteEdits[id];
      if (edits) {
        if (edits.description !== undefined && edits.description !== (req.pro_quote_description || '')) {
          payload.pro_quote_description = edits.description;
        }
        if (edits.duration !== undefined && edits.duration !== (req.pro_estimated_duration || '')) {
          payload.pro_estimated_duration = edits.duration;
        }
        if (edits.warranty !== undefined && edits.warranty !== (req.pro_warranty_info || '')) {
          payload.pro_warranty_info = edits.warranty;
        }
        if (edits.notes !== undefined && edits.notes !== (req.pro_notes || '')) {
          payload.pro_notes = edits.notes;
        }
      }
      await guestQuotesAPI.sendQuote(id, payload);
      toast.success('Quote sent to guest via email.');

      // Fire LeadConnector webhook (non-blocking)
      try {
        const req = requests.find(r => r.id === id);
        if (req) {
          const portalBase = typeof window !== 'undefined' ? window.location.origin : 'https://bridgeworkservices.com';
          const quotePortalUrl = req.public_token
            ? `${portalBase}/guest-quote/${req.public_token}`
            : null;
          fetch('https://services.leadconnectorhq.com/hooks/abbrIJCoCxWRtUOHdFzW/webhook-trigger/039eacdc-7770-4078-a409-f80bd2d6f758', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'guest_quote_sent',
              // Portal link (fixed, permanent — use {{quote_portal_url}} in GHL)
              quote_portal_url: quotePortalUrl,
              // Request identifiers
              request_id: req.id,
              request_number: req.request_number,
              status: req.status,
              created_at: req.created_at,
              updated_at: req.updated_at,
              // Service
              service_id: req.service_id,
              service_name: req.service_name,
              // Guest contact
              guest_name: req.guest_name,
              guest_email: req.guest_email,
              guest_phone: req.guest_phone,
              // Job location
              address: req.address,
              city: req.city,
              state: req.state,
              zip_code: req.zip_code,
              // Guest request details
              description: req.description || null,
              preferred_date: req.preferred_date || null,
              preferred_time: req.preferred_time || null,
              // Pro quotation
              pro: req.pro_profiles ? {
                id: req.assigned_pro_id,
                business_name: req.pro_profiles.business_name,
                user_id: req.pro_profiles.user_id,
              } : null,
              assigned_at: req.assigned_at || null,
              pro_quoted_price: req.pro_quoted_price ? parseFloat(req.pro_quoted_price) : null,
              pro_work_price: req.pro_work_price ? parseFloat(req.pro_work_price) : null,
              pro_materials_total: req.pro_materials_total ? parseFloat(req.pro_materials_total) : null,
              pro_materials_list: (() => {
                if (!req.pro_materials_list) return '';
                try {
                  const list = typeof req.pro_materials_list === 'string'
                    ? JSON.parse(req.pro_materials_list)
                    : req.pro_materials_list;
                  return Array.isArray(list) ? list.map(m => m.name || '').filter(Boolean).join(', ') : '';
                } catch (_) { return ''; }
              })(),
              pro_quote_description: req.pro_quote_description || null,
              pro_estimated_duration: req.pro_estimated_duration || null,
              pro_warranty_info: req.pro_warranty_info || null,
              pro_notes: req.pro_notes || null,
              pro_quote_submitted_at: req.pro_quote_submitted_at || null,
              // Admin pricing (commission + finalized quote)
              commission_dollar: parseFloat(bd.comm.toFixed(2)),
              commission_rate_pct: parseFloat(comm.pct),
              subtotal: price,
              tax_amount: parseFloat((bd.total - price).toFixed(2)),
              total_with_tax: parseFloat(bd.total.toFixed(2)),
              admin_message: quoteMessage || null,
              admin_notes: req.admin_notes || null,
              // Payment / invoice tracking
              stripe_session_id: req.stripe_session_id || null,
              stripe_payment_url: req.stripe_payment_url || null,
              stripe_payment_intent_id: req.stripe_payment_intent_id || null,
              invoice_sent_at: req.invoice_sent_at || null,
            }),
          }).catch(() => {}); // fire-and-forget
        }
      } catch (_) {
        // webhook failure must never break the send flow
      }

      setQuoteMessage('');
      setGuestCommissions(prev => { const n = { ...prev }; delete n[id]; return n; });
      setGuestProPrices(prev => { const n = { ...prev }; delete n[id]; return n; });
      setGuestTaxRates(prev => { const n = { ...prev }; delete n[id]; return n; });
      setGuestQuoteEdits(prev => { const n = { ...prev }; delete n[id]; return n; });
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

      // Fire LeadConnector webhook (non-blocking)
      try {
        const req = requests.find(r => r.id === id);
        if (req) {
          const portalBase = typeof window !== 'undefined' ? window.location.origin : 'https://bridgeworkservices.com';
          const paymentPortalUrl = req.public_token
            ? `${portalBase}/guest-payment/${req.public_token}`
            : null;
          fetch('https://services.leadconnectorhq.com/hooks/abbrIJCoCxWRtUOHdFzW/webhook-trigger/039eacdc-7770-4078-a409-f80bd2d6f758', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: 'payment_link_sent',
              // Payment portal link — use {{payment_portal_url}} in GHL
              payment_portal_url: paymentPortalUrl,
              // Request identifiers
              request_id: req.id,
              request_number: req.request_number,
              status: 'payment_sent',
              created_at: req.created_at,
              updated_at: new Date().toISOString(),
              // Service
              service_id: req.service_id,
              service_name: req.service_name,
              // Guest contact
              guest_name: req.guest_name,
              guest_email: req.guest_email,
              guest_phone: req.guest_phone,
              // Job location
              address: req.address,
              city: req.city,
              state: req.state,
              zip_code: req.zip_code,
              // Pricing
              quoted_price: req.quoted_price ? parseFloat(req.quoted_price) : null,
              tax_amount: req.tax_amount ? parseFloat(req.tax_amount) : null,
              total_with_tax: (req.quoted_price && req.tax_amount)
                ? parseFloat((parseFloat(req.quoted_price) + parseFloat(req.tax_amount)).toFixed(2))
                : null,
              // Pro
              pro: req.pro_profiles ? {
                id: req.assigned_pro_id,
                business_name: req.pro_profiles.business_name,
                user_id: req.pro_profiles.user_id,
              } : null,
              // Stripe (may be null until page refreshes — backend sets this)
              stripe_payment_url: req.stripe_payment_url || null,
              stripe_session_id: req.stripe_session_id || null,
            }),
          }).catch(() => {}); // fire-and-forget
        }
      } catch (_) {
        // webhook failure must never break the send flow
      }

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
      // Initialize quote content edits from pro's submission
      if (req.pro_quoted_price && req.status === 'pro_quoted') {
        setGuestQuoteEdits(prev => ({
          ...prev,
          [id]: {
            description: req.pro_quote_description || '',
            duration: req.pro_estimated_duration || '',
            warranty: req.pro_warranty_info || '',
            notes: req.pro_notes || '',
          }
        }));
      }
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
                      {req.pro_quoted_price && (() => {
                        const isEditable = req.status === 'pro_quoted';
                        const edit = getGuestQuoteEdit(req.id, req);

                        const handleDownloadAndStore = async () => {
                          try {
                            // Generate and download
                            generateGuestQuotePDF(req);
                            // Also generate as blob and upload to storage
                            const blob = await generateGuestQuotePDF(req, { download: false });
                            if (blob) {
                              const res2 = await guestQuotesAPI.uploadPDF(req.id, blob);
                              if (res2.data?.success) {
                                toast.success('PDF saved to storage');
                                loadRequests();
                              }
                            }
                          } catch {
                            // Download still worked, storage save failed silently
                          }
                        };

                        return (
                          <div className="bg-white rounded-lg p-4 border border-cyan-200">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                                <Wrench className="w-4 h-4 text-cyan-600" /> Pro&apos;s Quotation
                                {isEditable && <span className="text-xs font-normal text-orange-600 ml-1">(editable by admin)</span>}
                              </h4>
                              <div className="flex items-center gap-2">
                                {req.quote_pdf_url && (
                                  <a
                                    href={req.quote_pdf_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                    title="View stored PDF"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" /> View PDF
                                  </a>
                                )}
                                <button
                                  onClick={handleDownloadAndStore}
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0E7480] bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                                  title="Download quotation as PDF"
                                >
                                  <Download className="w-3.5 h-3.5" /> Download PDF
                                </button>
                              </div>
                            </div>
                            <div className="space-y-3 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-600">Quoted Price:</span>
                                <span className="font-bold text-lg text-cyan-700">{formatCurrency(req.pro_quoted_price)}</span>
                              </div>
                              <div>
                                <label className="text-gray-600 text-xs font-medium">Description:</label>
                                {isEditable ? (
                                  <textarea
                                    rows={3}
                                    value={edit.description}
                                    onChange={(e) => updateGuestQuoteEdit(req.id, 'description', e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border-2 border-orange-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-300 bg-orange-50 resize-none"
                                    placeholder="Quote description..."
                                  />
                                ) : (
                                  req.pro_quote_description && <p className="text-gray-800 mt-0.5 p-2 bg-gray-50 rounded text-xs">{req.pro_quote_description}</p>
                                )}
                              </div>
                              <div>
                                <label className="text-gray-600 text-xs font-medium">Estimated Duration:</label>
                                {isEditable ? (
                                  <input
                                    type="text"
                                    value={edit.duration}
                                    onChange={(e) => updateGuestQuoteEdit(req.id, 'duration', e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border-2 border-orange-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-300 bg-orange-50"
                                    placeholder="e.g. 2-3 hours"
                                  />
                                ) : (
                                  req.pro_estimated_duration && <p className="text-gray-700 mt-0.5"><strong>Estimated Duration:</strong> {req.pro_estimated_duration}</p>
                                )}
                              </div>
                              <div>
                                <label className="text-gray-600 text-xs font-medium">Warranty:</label>
                                {isEditable ? (
                                  <input
                                    type="text"
                                    value={edit.warranty}
                                    onChange={(e) => updateGuestQuoteEdit(req.id, 'warranty', e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border-2 border-orange-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-300 bg-orange-50"
                                    placeholder="e.g. 1 year warranty on parts and labor"
                                  />
                                ) : (
                                  req.pro_warranty_info && <p className="text-gray-700 mt-0.5"><strong>Warranty:</strong> {req.pro_warranty_info}</p>
                                )}
                              </div>
                              <div>
                                <label className="text-gray-600 text-xs font-medium">Pro Notes:</label>
                                {isEditable ? (
                                  <textarea
                                    rows={2}
                                    value={edit.notes}
                                    onChange={(e) => updateGuestQuoteEdit(req.id, 'notes', e.target.value)}
                                    className="w-full mt-1 px-3 py-2 border-2 border-orange-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-300 bg-orange-50 resize-none"
                                    placeholder="Additional notes..."
                                  />
                                ) : (
                                  req.pro_notes && <p className="text-gray-800 mt-0.5 p-2 bg-gray-50 rounded text-xs">{req.pro_notes}</p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Price Summary (if quote has been sent to guest) */}
                      {req.quoted_price && (
                        <div className="bg-white rounded-lg p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-[#0E7480]" /> Quote Summary
                            </h4>
                            <div className="flex items-center gap-2">
                              {req.quote_pdf_url && (
                                <a
                                  href={req.quote_pdf_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                  title="View stored PDF"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" /> View PDF
                                </a>
                              )}
                              <button
                                onClick={async () => {
                                  try {
                                    generateGuestQuotePDF(req);
                                    const blob = await generateGuestQuotePDF(req, { download: false });
                                    if (blob) {
                                      const res2 = await guestQuotesAPI.uploadPDF(req.id, blob);
                                      if (res2.data?.success) {
                                        toast.success('PDF saved to storage');
                                        loadRequests();
                                      }
                                    }
                                  } catch { /* download still worked */ }
                                }}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#0E7480] bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors"
                                title="Download quote as PDF"
                              >
                                <Download className="w-3.5 h-3.5" /> Quotation
                              </button>
                              <button
                                onClick={() => generateGuestInvoicePDF(req)}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-orange-700 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                                title="Download invoice as PDF"
                              >
                                <Receipt className="w-3.5 h-3.5" /> Invoice
                              </button>
                            </div>
                          </div>
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
                          {req.status === 'pro_quoted' && (() => {
                            const effectiveProPrice = getGuestProPrice(req.id, req.pro_quoted_price);
                            const comm = getGuestCommission(req.id, req.pro_quoted_price);
                            const bd = computeGuestBreakdown(req.id, effectiveProPrice, comm.dollar);
                            return (
                              <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/50">
                                <p className="text-sm font-semibold text-blue-800 mb-1">Edit Quote, Add Revenue &amp; Send to Client</p>
                                <p className="text-xs text-gray-500 mb-4">
                                  Pro quoted <strong>{formatCurrency(req.pro_quoted_price)}</strong>. You can edit the price, set your revenue/commission, and adjust the tax rate before sending.
                                </p>

                                {/* Editable Pro Price + Tax Rate row */}
                                <div className="flex gap-3 mb-4">
                                  <div className="flex-1">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Pro Price (CAD) — editable</label>
                                    <div className="relative">
                                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">$</span>
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={effectiveProPrice}
                                        onChange={(e) => handleGuestProPriceChange(req.id, req.pro_quoted_price, e.target.value)}
                                        className="w-full pl-7 pr-3 py-2 border-2 border-orange-400 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-orange-300 bg-orange-50"
                                      />
                                    </div>
                                    {parseFloat(effectiveProPrice) !== parseFloat(req.pro_quoted_price) && (
                                      <p className="text-xs text-orange-600 mt-1">Original: {formatCurrency(req.pro_quoted_price)} — modified by admin</p>
                                    )}
                                  </div>
                                  <div className="w-36">
                                    <label className="block text-xs font-medium text-gray-600 mb-1">Tax Rate</label>
                                    <div className="relative">
                                      <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={getGuestTaxRate(req.id)}
                                        onChange={(e) => setGuestTaxRates(prev => ({ ...prev, [req.id]: e.target.value }))}
                                        className="w-full pl-3 pr-8 py-2 border-2 border-purple-400 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-purple-300 bg-purple-50"
                                      />
                                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">%</span>
                                    </div>
                                    <div className="flex gap-1 mt-1">
                                      {[0, 5, 13, 15].map(tr => (
                                        <button
                                          key={tr}
                                          type="button"
                                          onClick={() => setGuestTaxRates(prev => ({ ...prev, [req.id]: String(tr) }))}
                                          className={`px-1.5 py-0.5 text-[10px] font-medium rounded transition-colors ${
                                            parseFloat(getGuestTaxRate(req.id)) === tr
                                              ? 'bg-purple-600 text-white'
                                              : 'bg-gray-100 text-gray-600 hover:bg-purple-100'
                                          }`}
                                        >
                                          {tr}%
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>

                                {/* Commission inputs */}
                                <div className="flex gap-3 mb-3">
                                  <div className="flex-1">
                                    <label className="block text-xs text-gray-600 mb-1">Revenue / Commission ($)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={comm.dollar}
                                      onChange={(e) => setGuestCommissionDollar(req.id, req.pro_quoted_price, e.target.value)}
                                      className="w-full px-3 py-2 border-2 border-[#0E7480] rounded-lg text-sm font-semibold focus:ring-2 focus:ring-[#0E7480]"
                                    />
                                  </div>
                                  <div className="w-28">
                                    <label className="block text-xs text-gray-600 mb-1">Revenue (%)</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      value={comm.pct}
                                      onChange={(e) => setGuestCommissionPct(req.id, req.pro_quoted_price, e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480]"
                                    />
                                  </div>
                                </div>

                                {/* Preset buttons */}
                                <div className="flex flex-wrap gap-1.5 mb-4">
                                  {[10, 15, 17.22, 20, 25].map(pct => (
                                    <button
                                      key={pct}
                                      type="button"
                                      onClick={() => applyGuestPreset(req.id, req.pro_quoted_price, pct)}
                                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                                        parseFloat(comm.pct) === pct
                                          ? 'bg-[#0E7480] text-white border-[#0E7480]'
                                          : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                                      }`}
                                    >
                                      {pct}%
                                    </button>
                                  ))}
                                </div>

                                {/* Breakdown cards */}
                                <div className="grid grid-cols-5 gap-2 mb-4">
                                  <div className="bg-white rounded-lg p-2.5 border border-gray-200 text-center">
                                    <p className="text-xs text-gray-500 mb-0.5">Pro Price</p>
                                    <p className="text-sm font-bold text-gray-800">{formatCurrency(bd.pro)}</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-2.5 border border-[#0E7480]/30 text-center">
                                    <p className="text-xs text-gray-500 mb-0.5">Revenue</p>
                                    <p className="text-sm font-bold text-[#0E7480]">{formatCurrency(bd.comm)}</p>
                                  </div>
                                  <div className="bg-white rounded-lg p-2.5 border border-gray-200 text-center">
                                    <p className="text-xs text-gray-500 mb-0.5">Subtotal</p>
                                    <p className="text-sm font-bold text-gray-800">{formatCurrency(bd.subtotal)}</p>
                                  </div>
                                  <div className="bg-purple-50 rounded-lg p-2.5 border border-purple-200 text-center">
                                    <p className="text-xs text-gray-500 mb-0.5">Tax ({bd.taxPct}%)</p>
                                    <p className="text-sm font-bold text-purple-700">{formatCurrency(bd.tax)}</p>
                                  </div>
                                  <div className="bg-[#0E7480]/5 rounded-lg p-2.5 border border-[#0E7480]/20 text-center">
                                    <p className="text-xs text-gray-500 mb-0.5">Client Total</p>
                                    <p className="text-sm font-bold text-[#0E7480]">{formatCurrency(bd.total)}</p>
                                  </div>
                                </div>

                                {/* Optional message */}
                                <div className="mb-3">
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
                                  onClick={() => handleSendQuote(req.id, req.pro_quoted_price, req)}
                                  disabled={actionLoading === req.id}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                  {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                  Send Quote Email ({formatCurrency(bd.total)} to client)
                                </button>
                              </div>
                            );
                          })()}

                          {/* Send Payment Link (only if quoted or proof_submitted) */}
                          {['quoted', 'proof_submitted'].includes(req.status) && (() => {
                            const hasProof = !!req.proof_submitted_at;
                            const isSuperAdmin = profile?.is_superadmin === true;
                            const canSend = hasProof || isSuperAdmin;                            return (
                              <div className="border border-purple-100 rounded-lg p-4 bg-purple-50/50">
                                <p className="text-sm font-medium text-purple-800 mb-2">
                                  Send Payment Link — {formatCurrency(total)}
                                </p>

                                {/* Proof of work section */}
                                {hasProof ? (
                                  <div className="mb-3 bg-green-50 border border-green-200 rounded-lg p-3">
                                    <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                                      <CheckCircle className="w-3.5 h-3.5" /> Proof of Work Submitted
                                    </p>
                                    {req.proof_description && (
                                      <p className="text-xs text-green-800 mb-2">{req.proof_description}</p>
                                    )}
                                    {Array.isArray(req.proof_photos) && req.proof_photos.length > 0 && (
                                      <div className="flex flex-wrap gap-2 mt-2">
                                        {req.proof_photos.map((url, i) => (
                                          <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                                            <img src={url} alt={`Proof ${i + 1}`} className="w-16 h-16 object-cover rounded-lg border border-green-200 hover:opacity-80 transition-opacity" />
                                          </a>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="mb-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                                      <p className="text-xs text-amber-800">
                                        {isSuperAdmin
                                          ? 'Pro has not submitted proof yet. As SuperAdmin, you can override and send payment now.'
                                          : 'Waiting for the pro to submit proof of completed work before sending payment.'}
                                      </p>
                                    </div>
                                  </div>
                                )}

                                <p className="text-xs text-gray-600 mb-3">
                                  Creates a Stripe Checkout session and emails the payment link to the guest.
                                </p>
                                <button
                                  onClick={() => handleSendPaymentLink(req.id)}
                                  disabled={actionLoading === req.id || !canSend}
                                  title={!canSend ? 'Waiting for pro to submit proof of work' : (!hasProof ? 'SuperAdmin override — sending without proof' : undefined)}
                                  className={`px-4 py-2 text-white rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${!hasProof && isSuperAdmin ? 'bg-amber-600 hover:bg-amber-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                                >
                                  {actionLoading === req.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                                  Send Payment Link
                                </button>
                              </div>
                            );
                          })()}

                          {/* Send Invoice (only if paid) */}
                          {req.status === 'paid' && (
                            <div className="border border-green-100 rounded-lg p-4 bg-green-50/50">
                              <p className="text-sm font-medium text-green-800 mb-2">Payment Received</p>
                              <p className="text-xs text-gray-600 mb-3">
                                Payment has been confirmed. Send the guest an invoice receipt via email.
                              </p>
                              <div className="flex flex-wrap gap-2">
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
                                {req.pro_quoted_price && (
                                  <button
                                    onClick={() => generatePayoutReceiptPDF({
                                      proName: req.pro_profiles?.business_name || req.pro_profiles?.profiles?.full_name || 'Pro',
                                      proEmail: req.pro_profiles?.profiles?.email || '',
                                      type: 'payout',
                                      amount: parseFloat(req.pro_quoted_price),
                                      platformFee: req.commission_amount ? parseFloat(req.commission_amount) : 0,
                                      commissionRate: req.commission_amount && req.pro_quoted_price ? parseFloat(req.commission_amount) / parseFloat(req.pro_quoted_price) : 0,
                                      status: 'completed',
                                      payoutMethod: 'e_transfer',
                                      createdAt: new Date().toISOString(),
                                      serviceName: req.service_name,
                                      bookingNumber: req.request_number,
                                      entryId: req.id,
                                    })}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                                  >
                                    <Download className="w-4 h-4" />
                                    Pro Payout Receipt
                                  </button>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Pro Payout Receipt (available once payment sent or later) */}
                          {['payment_sent', 'paid', 'completed'].includes(req.status) && req.pro_quoted_price && (
                            <div className="border border-blue-100 rounded-lg p-4 bg-blue-50/50">
                              <p className="text-sm font-medium text-blue-800 mb-2 flex items-center gap-2">
                                <Download className="w-4 h-4" /> Pro Payout Receipt
                              </p>
                              <p className="text-xs text-gray-600 mb-3">
                                Download a payout receipt for the pro&apos;s payment of {formatCurrency(req.pro_quoted_price)}.
                              </p>
                              <button
                                onClick={() => generatePayoutReceiptPDF({
                                  proName: req.pro_profiles?.business_name || req.pro_profiles?.profiles?.full_name || 'Pro',
                                  proEmail: req.pro_profiles?.profiles?.email || '',
                                  type: 'payout',
                                  amount: parseFloat(req.pro_quoted_price),
                                  platformFee: req.commission_amount ? parseFloat(req.commission_amount) : 0,
                                  commissionRate: req.commission_amount && req.pro_quoted_price ? parseFloat(req.commission_amount) / parseFloat(req.pro_quoted_price) : 0,
                                  status: 'completed',
                                  payoutMethod: 'e_transfer',
                                  createdAt: new Date().toISOString(),
                                  serviceName: req.service_name,
                                  bookingNumber: req.request_number,
                                  entryId: req.id,
                                })}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                              >
                                <Download className="w-4 h-4" />
                                Download Payout Receipt ({formatCurrency(req.pro_quoted_price)})
                              </button>
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
