'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import {
  FileText,
  MapPin,
  Calendar,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Star,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Award,
  Send,
  RefreshCw
} from 'lucide-react';
import { bookingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

const DEFAULT_COMMISSION_RATE = 0.1722; // 17.22% suggested starting point

export default function AdminQuotationsPage() {
  const router = useRouter();
  const { user, profile, authInitialized } = useSelector((state) => state.auth);
  useAdminPermission('quotations');

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [activeTab, setActiveTab] = useState('pending_review');
  const [pagination, setPagination] = useState({ limit: 15, offset: 0, total: 0 });

  // Per-quotation commission editor state
  const [commissionInputs, setCommissionInputs] = useState({});
  const [reviewNotes, setReviewNotes] = useState({});
  const [processingId, setProcessingId] = useState(null);
  const [rejectModalId, setRejectModalId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (!authInitialized) return;
    if (!user || profile?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchQuotations(0);
  }, [authInitialized, user, profile, router]);

  const fetchQuotations = async (offset = 0) => {
    try {
      setLoading(true);
      const res = await bookingsAPI.getAllQuotations({ limit: 15, offset });
      setBookings(res.data?.data?.bookings || []);
      setPagination(res.data?.data?.pagination || { limit: 15, offset, total: 0 });
    } catch (err) {
      toast.error('Failed to load quotations');
    } finally {
      setLoading(false);
    }
  };

  const allQuotations = bookings.flatMap((b) =>
    (b.booking_quotations || []).map((q) => ({ ...q, booking: b }))
  );
  const pendingReviewQuotes = allQuotations.filter((q) => q.status === 'pending_admin_review');
  const sentToCustomerQuotes = allQuotations.filter(
    (q) => q.status === 'pending' || q.status === 'selected'
  );

  const filteredBookings = bookings.filter((b) => {
    const quotes = b.booking_quotations || [];
    if (activeTab === 'pending_review') return quotes.some((q) => q.status === 'pending_admin_review');
    if (activeTab === 'sent_to_customer')
      return quotes.some((q) => q.status === 'pending' || q.status === 'selected');
    return true;
  });

  const getCommissionInput = (quotationId, quotedPrice) => {
    if (commissionInputs[quotationId] !== undefined) return commissionInputs[quotationId];
    return (parseFloat(quotedPrice) * DEFAULT_COMMISSION_RATE).toFixed(2);
  };

  // When admin edits the dollar amount, sync the percentage display
  const handleCommissionDollarChange = (quotationId, quotedPrice, dollarValue) => {
    setCommissionInputs((prev) => ({ ...prev, [quotationId]: dollarValue }));
  };

  // When admin edits the percentage, convert to dollars and update
  const handleCommissionPctChange = (quotationId, quotedPrice, pctValue) => {
    const proPrice = parseFloat(quotedPrice) || 0;
    const pct = parseFloat(pctValue) || 0;
    const dollars = ((pct / 100) * proPrice).toFixed(2);
    setCommissionInputs((prev) => ({ ...prev, [quotationId]: dollars }));
  };

  // Apply a quick preset percentage
  const applyPreset = (quotationId, quotedPrice, pct) => {
    const proPrice = parseFloat(quotedPrice) || 0;
    const dollars = ((pct / 100) * proPrice).toFixed(2);
    setCommissionInputs((prev) => ({ ...prev, [quotationId]: dollars }));
  };

  const computeBreakdown = (quotedPrice, commissionInput) => {
    const proPrice = parseFloat(quotedPrice) || 0;
    const commission = parseFloat(commissionInput) || 0;
    const adminPrice = proPrice + commission;
    const tax = adminPrice * 0.13;
    const customerTotal = adminPrice + tax;
    const effectiveRate = proPrice > 0 ? ((commission / proPrice) * 100).toFixed(1) : '0.0';
    return { proPrice, commission, adminPrice, tax, customerTotal, effectiveRate };
  };

  const handleApprove = async (quotationId, quotedPrice) => {
    const commissionAmt = parseFloat(getCommissionInput(quotationId, quotedPrice));
    if (isNaN(commissionAmt) || commissionAmt < 0) {
      toast.error('Enter a valid commission amount (0 or more)');
      return;
    }
    setProcessingId(quotationId);
    try {
      await bookingsAPI.approveQuotation(quotationId, {
        commission_amount: commissionAmt,
        admin_review_notes: reviewNotes[quotationId] || ''
      });
      toast.success('Quote approved and sent to customer!');
      fetchQuotations(pagination.offset);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to approve quotation');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModalId) return;
    setProcessingId(rejectModalId);
    try {
      await bookingsAPI.rejectQuotationByAdmin(rejectModalId, { reason: rejectReason });
      toast.success('Quote rejected. Pro has been notified.');
      setRejectModalId(null);
      setRejectReason('');
      fetchQuotations(pagination.offset);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reject quotation');
    } finally {
      setProcessingId(null);
    }
  };

  if (!authInitialized || !user || profile?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quotations</h1>
            <p className="text-gray-600 mt-1">
              Review pro-submitted quotes, set BridgeWork commission, then release to customers.
            </p>
          </div>
          <button
            onClick={() => fetchQuotations(pagination.offset)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingReviewQuotes.length}</p>
              <p className="text-xs text-gray-500">Pending Admin Review</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Send className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{sentToCustomerQuotes.length}</p>
              <p className="text-xs text-gray-500">Sent to Customers</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{allQuotations.length}</p>
              <p className="text-xs text-gray-500">Total Quotations</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending_review')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 ${
              activeTab === 'pending_review'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Pending Review
            {pendingReviewQuotes.length > 0 && (
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  activeTab === 'pending_review'
                    ? 'bg-white text-[#0E7480]'
                    : 'bg-amber-100 text-amber-700'
                }`}
              >
                {pendingReviewQuotes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('sent_to_customer')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'sent_to_customer'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Sent to Customers ({sentToCustomerQuotes.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'all'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All ({allQuotations.length})
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="bg-white rounded-xl p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading quotations...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {activeTab === 'pending_review' ? 'No Quotes Pending Review' : 'No Quotations'}
            </h3>
            <p className="text-gray-500">
              {activeTab === 'pending_review'
                ? 'All pro-submitted quotes have been reviewed.'
                : 'No quotations to show for the selected filter.'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
                const isExpanded = expandedBooking === booking.id;
                const allQs = booking.booking_quotations || [];
                const visibleQs =
                  activeTab === 'pending_review'
                    ? allQs.filter((q) => q.status === 'pending_admin_review')
                    : activeTab === 'sent_to_customer'
                    ? allQs.filter((q) => q.status === 'pending' || q.status === 'selected')
                    : allQs;

                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    {/* Booking header */}
                    <div
                      className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2 flex-wrap">
                            <h3 className="text-lg font-semibold text-gray-900">
                              {booking.service_name}
                            </h3>
                            <span
                              className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                                booking.status === 'quote_approved'
                                  ? 'bg-green-100 text-green-700'
                                  : 'bg-yellow-100 text-yellow-700'
                              }`}
                            >
                              {booking.status === 'quote_approved'
                                ? 'Quote Approved'
                                : booking.status === 'awaiting_quotes'
                                ? 'Awaiting Quotes'
                                : booking.status}
                            </span>
                            {allQs.some((q) => q.status === 'pending_admin_review') && (
                              <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" /> Needs Review
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-gray-600 flex-wrap">
                            <span className="flex items-center gap-1">
                              <User className="w-4 h-4 text-gray-400" />
                              {booking.profiles?.full_name || 'Customer'}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4 text-gray-400" />
                              {booking.city}, {booking.state}
                            </span>
                            {booking.scheduled_date && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-gray-400" />
                                {new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-3 shrink-0">
                          <span className="text-sm text-gray-400">
                            {visibleQs.length} quote{visibleQs.length !== 1 ? 's' : ''}
                          </span>
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded quotations */}
                    {isExpanded && (
                      <div className="border-t border-gray-100 p-5 bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-700 mb-4">
                          {activeTab === 'pending_review'
                            ? 'Quotes Awaiting Your Review'
                            : 'Submitted Quotations'}{' '}
                          ({visibleQs.length})
                        </h4>

                        {visibleQs.length === 0 ? (
                          <p className="text-sm text-gray-500 text-center py-4">
                            No quotations in this view.
                          </p>
                        ) : (
                          <div className="space-y-5">
                            {visibleQs.map((quote) => {
                              const isPendingReview = quote.status === 'pending_admin_review';
                              const isSelected = quote.status === 'selected';
                              const isRejected = quote.status === 'rejected';
                              const commissionVal = getCommissionInput(
                                quote.id,
                                quote.quoted_price
                              );
                              const bd = computeBreakdown(quote.quoted_price, commissionVal);

                              return (
                                <div
                                  key={quote.id}
                                  className={`p-4 rounded-xl border ${
                                    isPendingReview
                                      ? 'bg-amber-50 border-amber-200'
                                      : isSelected
                                      ? 'bg-green-50 border-green-200'
                                      : isRejected
                                      ? 'bg-gray-100 border-gray-200 opacity-60'
                                      : 'bg-white border-gray-200'
                                  }`}
                                >
                                  {/* Pro info row */}
                                  <div className="flex items-center gap-3 mb-3">
                                    <div className="w-10 h-10 bg-[#0E7480] rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0">
                                      {quote.pro_profiles?.business_name?.charAt(0) || 'P'}
                                    </div>
                                    <div className="flex-1">
                                      <p className="font-semibold text-gray-900">
                                        {quote.pro_profiles?.business_name || 'Pro'}
                                      </p>
                                      <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                        {quote.pro_profiles?.rating && (
                                          <span className="flex items-center gap-1">
                                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                            {parseFloat(quote.pro_profiles.rating).toFixed(1)}
                                          </span>
                                        )}
                                        {quote.pro_profiles?.total_jobs && (
                                          <span className="flex items-center gap-1">
                                            <Briefcase className="w-3 h-3" />
                                            {quote.pro_profiles.total_jobs} jobs
                                          </span>
                                        )}
                                        <span
                                          className={`font-medium px-2 py-0.5 rounded-full ${
                                            isPendingReview
                                              ? 'bg-amber-100 text-amber-700'
                                              : isSelected
                                              ? 'bg-green-100 text-green-700'
                                              : isRejected
                                              ? 'bg-gray-200 text-gray-600'
                                              : 'bg-blue-100 text-blue-700'
                                          }`}
                                        >
                                          {isPendingReview
                                            ? 'Needs Review'
                                            : isSelected
                                            ? 'Selected by Customer'
                                            : isRejected
                                            ? 'Rejected'
                                            : 'Sent to Customer'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {quote.description && (
                                    <p className="text-sm text-gray-600 mb-3 italic">
                                      {quote.description}
                                    </p>
                                  )}

                                  {/* COMMISSION CALCULATOR — only for pending_admin_review */}
                                  {isPendingReview ? (
                                    <div className="bg-white rounded-lg border border-amber-200 p-4 mb-3">
                                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
                                        Commission Calculator
                                      </p>
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-4">
                                        <div className="bg-gray-50 rounded-lg p-3">
                                          <p className="text-xs text-gray-400 mb-1">Pro Price</p>
                                          <p className="font-bold text-gray-900 text-lg">
                                            ${bd.proPrice.toFixed(2)}
                                          </p>
                                        </div>
                                        <div className="bg-[#0E7480]/10 rounded-lg p-3">
                                          <p className="text-xs text-[#0E7480] mb-1">
                                            BridgeWork Commission
                                          </p>
                                          <p className="font-bold text-[#0E7480] text-lg">
                                            ${bd.commission.toFixed(2)}
                                          </p>
                                          <p className="text-xs text-gray-400">
                                            ({bd.effectiveRate}% of pro price)
                                          </p>
                                        </div>
                                        <div className="bg-blue-50 rounded-lg p-3">
                                          <p className="text-xs text-blue-500 mb-1">
                                            Customer Subtotal
                                          </p>
                                          <p className="font-bold text-blue-700 text-lg">
                                            ${bd.adminPrice.toFixed(2)}
                                          </p>
                                        </div>
                                        <div className="bg-gray-900 rounded-lg p-3">
                                          <p className="text-xs text-gray-400 mb-1">
                                            Customer Total (+13% HST)
                                          </p>
                                          <p className="font-bold text-white text-lg">
                                            ${bd.customerTotal.toFixed(2)}
                                          </p>
                                        </div>
                                      </div>

                                      {/* Quick preset buttons */}
                                      <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs text-gray-500 mr-1">Quick set:</span>
                                        {[10, 15, 17.22, 20, 25].map((pct) => (
                                          <button
                                            key={pct}
                                            type="button"
                                            onClick={() => applyPreset(quote.id, quote.quoted_price, pct)}
                                            className="px-2.5 py-1 text-xs font-medium rounded-md bg-gray-100 text-gray-700 hover:bg-[#0E7480] hover:text-white transition-colors"
                                          >
                                            {pct}%
                                          </button>
                                        ))}
                                      </div>

                                      {/* Dollar + Percentage inputs (synced) */}
                                      <div className="flex flex-col sm:flex-row gap-3 mb-3">
                                        <div className="flex-1">
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Commission — Dollar Amount (CAD)
                                          </label>
                                          <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                                              $
                                            </span>
                                            <input
                                              type="number"
                                              min="0"
                                              step="0.01"
                                              value={commissionVal}
                                              onChange={(e) =>
                                                handleCommissionDollarChange(
                                                  quote.id,
                                                  quote.quoted_price,
                                                  e.target.value
                                                )
                                              }
                                              className="w-full pl-7 pr-3 py-2.5 border-2 border-[#0E7480] rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0E7480]/50 bg-white"
                                              placeholder="0.00"
                                            />
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Commission — Percentage of Pro Price
                                          </label>
                                          <div className="relative">
                                            <input
                                              type="number"
                                              min="0"
                                              max="100"
                                              step="0.01"
                                              value={bd.effectiveRate}
                                              onChange={(e) =>
                                                handleCommissionPctChange(
                                                  quote.id,
                                                  quote.quoted_price,
                                                  e.target.value
                                                )
                                              }
                                              className="w-full pl-3 pr-8 py-2.5 border-2 border-[#0E7480] rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#0E7480]/50 bg-white"
                                              placeholder="0.00"
                                            />
                                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
                                              %
                                            </span>
                                          </div>
                                        </div>
                                        <div className="flex-1">
                                          <label className="block text-xs font-medium text-gray-600 mb-1">
                                            Internal Notes (optional)
                                          </label>
                                          <input
                                            type="text"
                                            value={reviewNotes[quote.id] || ''}
                                            onChange={(e) =>
                                              setReviewNotes((prev) => ({
                                                ...prev,
                                                [quote.id]: e.target.value
                                              }))
                                            }
                                            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                                            placeholder="Admin-only notes"
                                          />
                                        </div>
                                      </div>

                                      <div className="flex gap-3 mt-4">
                                        <button
                                          onClick={() =>
                                            handleApprove(quote.id, quote.quoted_price)
                                          }
                                          disabled={processingId === quote.id}
                                          className="flex items-center gap-2 px-5 py-2.5 bg-[#0E7480] text-white rounded-lg text-sm font-semibold hover:bg-[#0a5a63] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                          {processingId === quote.id ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <Send className="w-4 h-4" />
                                          )}
                                          Approve &amp; Send to Customer
                                        </button>
                                        <button
                                          onClick={() => {
                                            setRejectModalId(quote.id);
                                            setRejectReason('');
                                          }}
                                          disabled={processingId === quote.id}
                                          className="flex items-center gap-2 px-5 py-2.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-sm font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
                                        >
                                          <XCircle className="w-4 h-4" /> Reject Quote
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    /* Read-only price summary for processed quotes */
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                                      <div>
                                        <p className="text-gray-400 text-xs">Pro Price</p>
                                        <p className="font-bold text-gray-700">
                                          ${parseFloat(quote.quoted_price).toFixed(2)}
                                        </p>
                                      </div>
                                      {quote.commission_amount != null && (
                                        <div>
                                          <p className="text-gray-400 text-xs">Commission</p>
                                          <p className="font-bold text-[#0E7480]">
                                            ${parseFloat(quote.commission_amount).toFixed(2)}
                                          </p>
                                        </div>
                                      )}
                                      <div>
                                        <p className="text-gray-400 text-xs">Customer Subtotal</p>
                                        <p className="font-bold text-blue-700">
                                          $
                                          {parseFloat(
                                            quote.admin_price || quote.quoted_price
                                          ).toFixed(2)}
                                        </p>
                                      </div>
                                      <div>
                                        <p className="text-gray-400 text-xs">
                                          Customer Total (+13% HST)
                                        </p>
                                        <p className="font-bold text-gray-900">
                                          $
                                          {(
                                            parseFloat(
                                              quote.admin_price || quote.quoted_price
                                            ) * 1.13
                                          ).toFixed(2)}
                                        </p>
                                      </div>
                                    </div>
                                  )}

                                  <div className="flex flex-wrap gap-2 text-xs mt-3">
                                    {quote.materials_included && (
                                      <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                        Materials Included
                                      </span>
                                    )}
                                    {quote.warranty_info && (
                                      <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                        {quote.warranty_info}
                                      </span>
                                    )}
                                    {quote.admin_approved_at && (
                                      <span className="bg-green-100 text-green-700 px-2 py-1 rounded">
                                        Approved{' '}
                                        {new Date(quote.admin_approved_at).toLocaleDateString()}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-600">
                  Showing {pagination.offset + 1}&ndash;
                  {Math.min(pagination.offset + pagination.limit, pagination.total)} of{' '}
                  {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      fetchQuotations(Math.max(0, pagination.offset - pagination.limit))
                    }
                    disabled={pagination.offset === 0}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => fetchQuotations(pagination.offset + pagination.limit)}
                    disabled={pagination.offset + pagination.limit >= pagination.total}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#0E7480] rounded-lg hover:bg-[#0a5a63] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reject confirmation modal */}
      {rejectModalId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Reject This Quote?</h3>
            <p className="text-sm text-gray-600 mb-4">
              The pro will be notified that their quote was not approved. Optionally provide a
              reason.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason (optional) — shared with the pro"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-400 mb-4 resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setRejectModalId(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processingId === rejectModalId}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {processingId === rejectModalId && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

