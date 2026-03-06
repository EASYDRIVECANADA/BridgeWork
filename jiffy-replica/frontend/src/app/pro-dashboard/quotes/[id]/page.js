'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Send, Loader2, CheckCircle, XCircle, ArrowRight,
  FileText, User, DollarSign, Clock, Calendar, Eye, Edit, Trash2
} from 'lucide-react';
import { fetchQuoteById, sendQuote, deleteQuote, convertQuoteToInvoice } from '@/store/slices/quotesSlice';
import { toast } from 'react-toastify';
import { paymentsAPI } from '@/lib/api';

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

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString('en-CA', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit'
  });
}

export default function QuoteDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);
  const { currentQuote: quote, isLoading } = useSelector((state) => state.quotes);
  const [actionLoading, setActionLoading] = useState(false);
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [commissionRate, setCommissionRate] = useState(0.15);
  const [isCustomRate, setIsCustomRate] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/pro-login');
      return;
    }
    dispatch(fetchQuoteById(id));
    // Fetch pro's commission rate
    paymentsAPI.commissionRate().then(res => {
      const data = res.data?.data;
      if (data) {
        setCommissionRate(data.rate);
        setIsCustomRate(data.is_custom_rate);
      }
    }).catch(() => {});
    // Default due date 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDueDate(d.toISOString().split('T')[0]);
  }, [user, router, dispatch, id]);

  const handleSend = async () => {
    setActionLoading(true);
    try {
      await dispatch(sendQuote(id)).unwrap();
      toast.success('Quote sent to customer!');
    } catch (err) {
      toast.error(err || 'Failed to send quote');
    }
    setActionLoading(false);
  };

  const handleDelete = async () => {
    if (!confirm('Delete this draft quote?')) return;
    setActionLoading(true);
    try {
      await dispatch(deleteQuote(id)).unwrap();
      toast.success('Quote deleted');
      router.push('/pro-dashboard/quotes');
    } catch (err) {
      toast.error(err || 'Failed to delete quote');
    }
    setActionLoading(false);
  };

  const handleConvert = async () => {
    setActionLoading(true);
    try {
      const result = await dispatch(convertQuoteToInvoice({ id, due_date: dueDate })).unwrap();
      toast.success('Invoice created from quote!');
      setShowConvertModal(false);
      router.push(`/pro-dashboard/invoices/${result.invoice.id}`);
    } catch (err) {
      toast.error(err || 'Failed to convert quote');
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
  const isPro = profile?.role === 'pro' || profile?.role === 'admin';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Link href="/pro-dashboard/quotes" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Quotes
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
              <p className="text-sm text-gray-500">{quote.currency}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Timeline / Status Info */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Timeline</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Created</p>
              <p className="font-medium">{formatDateTime(quote.created_at)}</p>
            </div>
            {quote.sent_at && (
              <div>
                <p className="text-gray-500">Sent</p>
                <p className="font-medium">{formatDateTime(quote.sent_at)}</p>
              </div>
            )}
            {quote.viewed_at && (
              <div>
                <p className="text-gray-500">Viewed</p>
                <p className="font-medium">{formatDateTime(quote.viewed_at)}</p>
              </div>
            )}
            {quote.accepted_at && (
              <div>
                <p className="text-green-600">Accepted</p>
                <p className="font-medium text-green-700">{formatDateTime(quote.accepted_at)}</p>
              </div>
            )}
            {quote.declined_at && (
              <div>
                <p className="text-red-600">Declined</p>
                <p className="font-medium text-red-700">{formatDateTime(quote.declined_at)}</p>
              </div>
            )}
            <div>
              <p className="text-gray-500">Valid Until</p>
              <p className="font-medium">{formatDate(quote.valid_until)}</p>
            </div>
          </div>
          {quote.decline_reason && (
            <div className="mt-4 p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-700"><strong>Decline reason:</strong> {quote.decline_reason}</p>
            </div>
          )}
          {quote.customer_notes && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700"><strong>Customer notes:</strong> {quote.customer_notes}</p>
            </div>
          )}
        </div>

        {/* Customer Info */}
        {quote.customer && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4" />
              Customer
            </h2>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-semibold text-sm">
                  {(quote.customer.full_name || '?').charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{quote.customer.full_name}</p>
                <p className="text-sm text-gray-500">{quote.customer.email}</p>
                {quote.customer.phone && (
                  <p className="text-sm text-gray-500">{quote.customer.phone}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Description */}
        {quote.description && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{quote.description}</p>
          </div>
        )}

        {/* Line Items */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Line Items
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-3 font-medium">#</th>
                  <th className="pb-3 font-medium">Description</th>
                  <th className="pb-3 font-medium text-right">Qty</th>
                  <th className="pb-3 font-medium">Unit</th>
                  <th className="pb-3 font-medium text-right">Unit Price</th>
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
          <div className="mt-4 pt-4 border-t space-y-2">
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
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total</span>
                  <span className="text-blue-600">{formatCurrency(quote.total)}</span>
                </div>
                {/* Commission Breakdown */}
                {parseFloat(quote.subtotal) > 0 && (
                  <div className="border-t pt-2 mt-2 space-y-1">
                    <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Your Earnings</p>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Platform Fee ({(commissionRate * 100).toFixed(0)}%{isCustomRate ? ' Custom' : ''})</span>
                      <span className="text-red-500">-{formatCurrency(parseFloat(quote.subtotal) * commissionRate)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-semibold">
                      <span className="text-gray-600">You Earn</span>
                      <span className="text-green-600">{formatCurrency(parseFloat(quote.subtotal) * (1 - commissionRate))}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Internal Notes (pro only) */}
        {isPro && quote.notes && (
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4">
            <p className="text-sm text-yellow-800"><strong>Internal Notes:</strong> {quote.notes}</p>
          </div>
        )}

        {/* Actions */}
        {isPro && (
          <div className="flex items-center gap-3 flex-wrap">
            {quote.status === 'draft' && (
              <>
                <Link
                  href={`/pro-dashboard/quotes/${id}/edit`}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  <Edit className="w-4 h-4" />
                  Edit Quote
                </Link>
                {quote.customer_id && (
                  <button
                    onClick={handleSend}
                    disabled={actionLoading}
                    className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Send to Customer
                  </button>
                )}
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex items-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition font-medium ml-auto"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </>
            )}

            {quote.status === 'accepted' && (
              <button
                onClick={() => setShowConvertModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium"
              >
                <ArrowRight className="w-4 h-4" />
                Convert to Invoice
              </button>
            )}

            {quote.status === 'converted' && (
              <div className="flex items-center gap-2 text-purple-600 bg-purple-50 px-4 py-2.5 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                <span className="font-medium">Converted to invoice</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Convert to Invoice Modal */}
      {showConvertModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Convert Quote to Invoice</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will create an invoice from the accepted quote. All line items will be copied.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowConvertModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConvert}
                disabled={actionLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition font-medium disabled:opacity-50"
              >
                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                Create Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
