'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, CheckCircle, XCircle, DollarSign, Clock,
  User, FileText, Calendar, ThumbsUp, ThumbsDown
} from 'lucide-react';
import { fetchQuoteById, respondToQuote } from '@/store/slices/quotesSlice';
import { toast } from 'react-toastify';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  viewed: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  accepted: 'bg-green-100 text-green-700 border-green-200',
  declined: 'bg-red-100 text-red-700 border-red-200',
  expired: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  converted: 'bg-purple-100 text-purple-700 border-purple-200',
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CustomerQuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentQuote: quote, isLoading } = useSelector((state) => state.quotes);
  const [actionLoading, setActionLoading] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    dispatch(fetchQuoteById(id));
  }, [user, router, dispatch, id]);

  const handleAccept = async () => {
    if (!confirm('Accept this quote? The pro will be notified.')) return;
    setActionLoading(true);
    try {
      await dispatch(respondToQuote({
        id,
        action: 'accept',
        customer_notes: customerNotes || undefined,
      })).unwrap();
      toast.success('Quote accepted! The pro has been notified.');
    } catch (err) {
      toast.error(err || 'Failed to accept quote');
    }
    setActionLoading(false);
  };

  const handleDecline = async () => {
    setActionLoading(true);
    try {
      await dispatch(respondToQuote({
        id,
        action: 'decline',
        decline_reason: declineReason || undefined,
        customer_notes: customerNotes || undefined,
      })).unwrap();
      toast.success('Quote declined. The pro has been notified.');
      setShowDeclineModal(false);
    } catch (err) {
      toast.error(err || 'Failed to decline quote');
    }
    setActionLoading(false);
  };

  if (!user) return null;

  if (isLoading || !quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const items = quote.quote_items || [];
  const canRespond = ['sent', 'viewed'].includes(quote.status);
  const isExpired = quote.valid_until && new Date(quote.valid_until) < new Date();
  const proName = quote.pro_profiles?.business_name || quote.pro_profiles?.profiles?.full_name || 'Service Professional';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Link href="/dashboard/quotes" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Quotes & Invoices
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">{quote.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[quote.status]}`}>
                  {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                </span>
              </div>
              <p className="text-gray-500 mt-1 font-mono text-sm">{quote.quote_number}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(quote.total)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Expiry Warning */}
        {canRespond && isExpired && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-yellow-800">
              <Clock className="w-5 h-5" />
              <p className="font-medium">This quote has expired and may no longer be valid.</p>
            </div>
          </div>
        )}

        {/* Pro Info */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <User className="w-4 h-4" />
            From
          </h2>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-blue-600 font-bold text-lg">
                {proName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{proName}</p>
              {quote.pro_profiles?.profiles?.email && (
                <p className="text-sm text-gray-500">{quote.pro_profiles.profiles.email}</p>
              )}
              {quote.pro_profiles?.profiles?.phone && (
                <p className="text-sm text-gray-500">{quote.pro_profiles.profiles.phone}</p>
              )}
              {quote.pro_profiles?.rating > 0 && (
                <p className="text-sm text-yellow-600">★ {quote.pro_profiles.rating} rating</p>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {quote.description && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>
          </div>
        )}

        {/* Dates */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Date Sent</p>
              <p className="font-medium">{formatDate(quote.sent_at || quote.created_at)}</p>
            </div>
            <div>
              <p className="text-gray-500">Valid Until</p>
              <p className={`font-medium ${isExpired ? 'text-red-600' : ''}`}>{formatDate(quote.valid_until)}</p>
            </div>
            {quote.accepted_at && (
              <div>
                <p className="text-green-600">Accepted</p>
                <p className="font-medium text-green-700">{formatDate(quote.accepted_at)}</p>
              </div>
            )}
            {quote.declined_at && (
              <div>
                <p className="text-red-600">Declined</p>
                <p className="font-medium text-red-700">{formatDate(quote.declined_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Itemized Breakdown
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">#</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-right">Qty</th>
                  <th className="pb-3 font-medium">Unit</th>
                  <th className="pb-3 font-medium text-right">Price</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => (
                  <tr key={item.id || idx} className="border-b last:border-b-0">
                    <td className="py-3 text-gray-400">{idx + 1}</td>
                    <td className="py-3 text-gray-900 font-medium">{item.description}</td>
                    <td className="py-3 text-right">{item.quantity}</td>
                    <td className="py-3 text-gray-500">{item.unit}</td>
                    <td className="py-3 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="py-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-4 pt-4 border-t">
            <div className="flex justify-end">
              <div className="w-64 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal</span>
                  <span className="font-medium">{formatCurrency(quote.subtotal)}</span>
                </div>
                {parseFloat(quote.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-green-600">-{formatCurrency(quote.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({((parseFloat(quote.tax_rate) || 0) * 100).toFixed(0)}%)</span>
                  <span className="font-medium">{formatCurrency(quote.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(quote.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Response Actions */}
        {canRespond && !isExpired && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Respond to this Quote</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes for the pro (optional)</label>
              <textarea
                value={customerNotes}
                onChange={(e) => setCustomerNotes(e.target.value)}
                rows={2}
                placeholder="Any questions or comments..."
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleAccept}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition font-semibold text-lg disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsUp className="w-5 h-5" />}
                Accept Quote
              </button>
              <button
                onClick={() => setShowDeclineModal(true)}
                disabled={actionLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition font-semibold text-lg disabled:opacity-50"
              >
                <ThumbsDown className="w-5 h-5" />
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Already Responded */}
        {quote.status === 'accepted' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <p className="text-lg font-semibold text-green-800">You accepted this quote</p>
            <p className="text-sm text-green-600 mt-1">The pro has been notified and will follow up with next steps.</p>
          </div>
        )}

        {quote.status === 'declined' && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <XCircle className="w-10 h-10 text-red-600 mx-auto mb-2" />
            <p className="text-lg font-semibold text-red-800">You declined this quote</p>
            {quote.decline_reason && (
              <p className="text-sm text-red-600 mt-1">Reason: {quote.decline_reason}</p>
            )}
          </div>
        )}
      </div>

      {/* Decline Modal */}
      {showDeclineModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Decline Quote</h3>
            <p className="text-sm text-gray-600 mb-4">Let the pro know why you're declining (optional).</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                rows={3}
                placeholder="e.g. Price too high, found another provider, changed my mind..."
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-red-500 outline-none resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeclineModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4" />}
                Decline Quote
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
