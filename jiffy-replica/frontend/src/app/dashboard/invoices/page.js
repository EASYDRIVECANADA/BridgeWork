'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Receipt, Loader2, ChevronRight, Clock, FileText, CheckCircle, Download
} from 'lucide-react';
import { fetchInvoices } from '@/store/slices/quotesSlice';
import { generateInvoicePDF } from '@/utils/generateInvoicePDF';

const invoiceStatusColors = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  refunded: 'bg-orange-100 text-orange-700',
  converted: 'bg-purple-100 text-purple-700',
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CustomerInvoicesPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { invoices, isLoading } = useSelector((state) => state.quotes);
  const [activeTab, setActiveTab] = useState('pending');
  const [downloadingId, setDownloadingId] = useState(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    dispatch(fetchInvoices({}));
  }, [user, router, dispatch]);

  const handleDownloadPDF = async (invoice, e) => {
    e.preventDefault();
    e.stopPropagation();
    setDownloadingId(invoice.id);
    try {
      await generateInvoicePDF(invoice);
    } catch (error) {
      // PDF generation failed
    }
    setDownloadingId(null);
  };

  if (!user) return null;

  // Filter invoices by status - include all non-draft invoices
  // 'converted' means the quote was converted to an invoice and is awaiting payment
  const visibleInvoices = (invoices || []).filter(i => ['sent', 'paid', 'partially_paid', 'overdue', 'converted'].includes(i.status));
  const pendingInvoices = visibleInvoices.filter(i => ['sent', 'partially_paid', 'overdue', 'converted'].includes(i.status));
  const paidInvoices = visibleInvoices.filter(i => i.status === 'paid');

  const displayedInvoices = activeTab === 'pending' ? pendingInvoices : paidInvoices;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Invoices & Receipts</h1>
          <p className="text-gray-500 mt-1">View and pay invoices from your service professionals</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'pending'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Pending Invoices
            {pendingInvoices.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-700'
              }`}>
                {pendingInvoices.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('receipts')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
              activeTab === 'receipts'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <CheckCircle className="w-4 h-4" />
            Receipts
            {paidInvoices.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                activeTab === 'receipts' ? 'bg-white/20 text-white' : 'bg-green-100 text-green-700'
              }`}>
                {paidInvoices.length}
              </span>
            )}
          </button>
        </div>

        {/* Action Required Banner - only show on pending tab */}
        {activeTab === 'pending' && pendingInvoices.length > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium text-blue-900">Action Required</p>
                <p className="text-sm text-blue-700 mt-0.5">
                  {pendingInvoices.length} invoice(s) awaiting payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
          </div>
        ) : displayedInvoices.length > 0 ? (
          <div className="space-y-3">
            {displayedInvoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-white rounded-xl border shadow-sm hover:shadow-md transition p-5"
              >
                <div className="flex items-start justify-between">
                  <Link href={`/dashboard/invoices/${invoice.id}`} className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900">{invoice.title}</h3>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${invoiceStatusColors[invoice.status]}`}>
                        {invoice.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                      {['sent', 'partially_paid', 'overdue'].includes(invoice.status) && (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                          Payment Due
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span className="font-mono">{invoice.invoice_number}</span>
                      <span>From: {invoice.pro_profiles?.business_name || 'Pro'}</span>
                      <span>{activeTab === 'receipts' ? 'Paid' : 'Due'} {formatDate(activeTab === 'receipts' ? invoice.paid_at : invoice.due_date)}</span>
                    </div>
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
                      {parseFloat(invoice.amount_due) > 0 && invoice.status !== 'paid' && (
                        <p className="text-xs text-orange-600">Due: {formatCurrency(invoice.amount_due)}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleDownloadPDF(invoice, e)}
                        disabled={downloadingId === invoice.id}
                        className="p-2 text-gray-500 hover:text-[#0E7480] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Download PDF"
                      >
                        {downloadingId === invoice.id ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Download className="w-5 h-5" />
                        )}
                      </button>
                      <Link href={`/dashboard/invoices/${invoice.id}`}>
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border">
            {activeTab === 'pending' ? (
              <>
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No pending invoices</h3>
                <p className="text-gray-500">All invoices have been paid. Great job!</p>
              </>
            ) : (
              <>
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">No receipts yet</h3>
                <p className="text-gray-500">Paid invoices will appear here as receipts</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
