'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Loader2, CheckCircle, DollarSign, Clock,
  User, Receipt, Calendar, Download
} from 'lucide-react';
import { fetchInvoiceById } from '@/store/slices/quotesSlice';
import { generateInvoicePDF } from '@/utils/generateInvoicePDF';
import { quotesAPI } from '@/lib/api';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  sent: 'bg-blue-100 text-blue-700 border-blue-200',
  paid: 'bg-green-100 text-green-700 border-green-200',
  partially_paid: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  cancelled: 'bg-gray-100 text-gray-500 border-gray-200',
  refunded: 'bg-orange-100 text-orange-700 border-orange-200',
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

export default function CustomerInvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { currentInvoice: invoice, isLoading } = useSelector((state) => state.quotes);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [payingNow, setPayingNow] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    dispatch(fetchInvoiceById(id));
  }, [user, router, dispatch, id]);

  const handlePayNow = async () => {
    setPayingNow(true);
    try {
      const { data } = await quotesAPI.createInvoicePaymentLink(id);
      if (data?.data?.url) {
        window.location.href = data.data.url;
      }
    } catch {
      setPayingNow(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!invoice) return;
    setDownloadingPDF(true);
    try {
      await generateInvoicePDF(invoice);
    } catch (error) {
      // PDF generation failed
    }
    setDownloadingPDF(false);
  };

  if (!user) return null;

  if (isLoading || !invoice) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  const items = invoice.invoice_items || [];
  const isOverdue = invoice.status === 'sent' && invoice.due_date && new Date(invoice.due_date) < new Date();
  const proName = invoice.pro_profiles?.business_name || invoice.pro_profiles?.profiles?.full_name || 'Service Professional';

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
                <h1 className="text-2xl font-bold text-gray-900">{invoice.title}</h1>
                <span className={`px-3 py-1 rounded-full text-sm font-medium border ${statusColors[invoice.status]}`}>
                  {invoice.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                {isOverdue && (
                  <span className="px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-700 border border-red-200">
                    Overdue
                  </span>
                )}
              </div>
              <p className="text-gray-500 mt-1 font-mono text-sm">{invoice.invoice_number}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
              {parseFloat(invoice.amount_paid) > 0 && (
                <p className="text-sm text-green-600">Paid: {formatCurrency(invoice.amount_paid)}</p>
              )}
              {parseFloat(invoice.amount_due) > 0 && invoice.status !== 'draft' && (
                <p className="text-sm text-orange-600 font-semibold">Balance Due: {formatCurrency(invoice.amount_due)}</p>
              )}
              <button
                onClick={handleDownloadPDF}
                disabled={downloadingPDF}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-[#0E7480] text-white text-sm font-medium rounded-lg hover:bg-[#0a5a63] transition-colors disabled:opacity-50"
              >
                {downloadingPDF ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Overdue Warning */}
        {isOverdue && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-red-800">
              <Clock className="w-5 h-5" />
              <p className="font-medium">This invoice is past due. Please arrange payment as soon as possible.</p>
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
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <span className="text-green-600 font-bold text-lg">
                {proName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-gray-900 text-lg">{proName}</p>
              {invoice.pro_profiles?.profiles?.email && (
                <p className="text-sm text-gray-500">{invoice.pro_profiles.profiles.email}</p>
              )}
              {invoice.pro_profiles?.profiles?.phone && (
                <p className="text-sm text-gray-500">{invoice.pro_profiles.profiles.phone}</p>
              )}
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-white rounded-xl border shadow-sm p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Issue Date</p>
              <p className="font-medium">{formatDate(invoice.issue_date)}</p>
            </div>
            <div>
              <p className="text-gray-500">Due Date</p>
              <p className={`font-medium ${isOverdue ? 'text-red-600' : ''}`}>{formatDate(invoice.due_date)}</p>
            </div>
            {invoice.sent_at && (
              <div>
                <p className="text-gray-500">Sent</p>
                <p className="font-medium">{formatDateTime(invoice.sent_at)}</p>
              </div>
            )}
            {invoice.paid_at && (
              <div>
                <p className="text-green-600">Paid</p>
                <p className="font-medium text-green-700">{formatDateTime(invoice.paid_at)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        {invoice.description && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Description</h2>
            <p className="text-gray-700 whitespace-pre-wrap">{invoice.description}</p>
          </div>
        )}

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
                  <span className="font-medium">{formatCurrency(invoice.subtotal)}</span>
                </div>
                {parseFloat(invoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Discount</span>
                    <span className="font-medium text-green-600">-{formatCurrency(invoice.discount_amount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Tax ({((parseFloat(invoice.tax_rate) || 0) * 100).toFixed(0)}%)</span>
                  <span className="font-medium">{formatCurrency(invoice.tax_amount)}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t pt-2">
                  <span>Total</span>
                  <span>{formatCurrency(invoice.total)}</span>
                </div>
                {parseFloat(invoice.amount_paid) > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Amount Paid</span>
                    <span className="font-medium">{formatCurrency(invoice.amount_paid)}</span>
                  </div>
                )}
                {parseFloat(invoice.amount_due) > 0 && invoice.status !== 'draft' && (
                  <div className="flex justify-between text-lg font-bold text-orange-600 border-t pt-2">
                    <span>Amount Due</span>
                    <span>{formatCurrency(invoice.amount_due)}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Status */}
        {invoice.status === 'paid' && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <p className="text-lg font-semibold text-green-800">Invoice Paid in Full</p>
            {invoice.payment_method && (
              <p className="text-sm text-green-600 mt-1">Payment method: {invoice.payment_method}</p>
            )}
            {invoice.paid_at && (
              <p className="text-sm text-green-600">Paid on {formatDateTime(invoice.paid_at)}</p>
            )}
          </div>
        )}

        {/* Pay Now — for sent/overdue/partially_paid invoices with an outstanding balance */}
        {['sent', 'partially_paid', 'overdue'].includes(invoice.status) && parseFloat(invoice.amount_due) > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <h3 className="font-semibold text-blue-900 mb-1">Pay This Invoice</h3>
            <p className="text-sm text-blue-700 mb-4">
              Securely pay your outstanding balance of{' '}
              <span className="font-semibold">{formatCurrency(invoice.amount_due)}</span> by card.
            </p>
            <button
              onClick={handlePayNow}
              disabled={payingNow}
              className="w-full sm:w-auto px-8 py-3 bg-[#0E7480] text-white rounded-lg font-semibold hover:bg-[#0c6670] transition-colors disabled:opacity-50 flex items-center gap-2 justify-center"
            >
              <DollarSign className="w-4 h-4" />
              {payingNow ? 'Redirecting to payment...' : `Pay ${formatCurrency(invoice.amount_due)} Now`}
            </button>
            <p className="text-xs text-blue-500 mt-3">Powered by Stripe. Your card details are never stored by BridgeWork.</p>
          </div>
        )}
      </div>
    </div>
  );
}
