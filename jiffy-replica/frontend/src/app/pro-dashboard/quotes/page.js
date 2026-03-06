'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  FileText, Plus, Send, Eye, Check, X, Trash2, ArrowRight,
  DollarSign, Clock, CheckCircle, XCircle, Loader2, Filter,
  BarChart3, Receipt, ChevronRight
} from 'lucide-react';
import { fetchQuotes, fetchInvoices, sendQuote, deleteQuote, fetchStats } from '@/store/slices/quotesSlice';
import { toast } from 'react-toastify';

const quoteStatusColors = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  viewed: 'bg-indigo-100 text-indigo-700',
  accepted: 'bg-green-100 text-green-700',
  declined: 'bg-red-100 text-red-700',
  expired: 'bg-yellow-100 text-yellow-700',
  converted: 'bg-purple-100 text-purple-700',
};

const invoiceStatusColors = {
  draft: 'bg-gray-100 text-gray-700',
  sent: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  partially_paid: 'bg-yellow-100 text-yellow-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
  refunded: 'bg-orange-100 text-orange-700',
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(amount || 0);
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ProQuotesPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);
  const { quotes, invoices, stats, isLoading } = useSelector((state) => state.quotes);
  const [activeTab, setActiveTab] = useState('quotes');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (!user) {
      router.push('/pro-login');
      return;
    }
    dispatch(fetchQuotes(statusFilter ? { status: statusFilter } : {}));
    dispatch(fetchInvoices({}));
    dispatch(fetchStats());
  }, [user, router, dispatch, statusFilter]);

  const handleSendQuote = async (quoteId) => {
    try {
      await dispatch(sendQuote(quoteId)).unwrap();
      toast.success('Quote sent to customer!');
    } catch (err) {
      toast.error(err || 'Failed to send quote');
    }
  };

  const handleDeleteQuote = async (quoteId) => {
    if (!confirm('Delete this draft quote?')) return;
    try {
      await dispatch(deleteQuote(quoteId)).unwrap();
      toast.success('Quote deleted');
    } catch (err) {
      toast.error(err || 'Failed to delete quote');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Quotes & Invoices</h1>
              <p className="text-gray-500 mt-1">Create and manage quotes for your customers</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/pro-dashboard/quotes/new"
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Plus className="w-4 h-4" />
                New Quote
              </Link>
              <Link
                href="/pro-dashboard/invoices/new"
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-medium"
              >
                <Receipt className="w-4 h-4" />
                New Invoice
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <FileText className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Quotes Sent</p>
                  <p className="text-xl font-bold">{stats.quotes?.sent || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Accepted</p>
                  <p className="text-xl font-bold">{stats.quotes?.accepted || 0}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Accepted Value</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.quotes?.accepted_value)}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-50 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Outstanding</p>
                  <p className="text-xl font-bold">{formatCurrency(stats.invoices?.total_outstanding)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => setActiveTab('quotes')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'quotes' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4 inline mr-1.5" />
            Quotes ({quotes?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition ${
              activeTab === 'invoices' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Receipt className="w-4 h-4 inline mr-1.5" />
            Invoices ({invoices?.length || 0})
          </button>
        </div>

        {/* Status Filter */}
        {activeTab === 'quotes' && (
          <div className="flex gap-2 mb-6 flex-wrap">
            {['', 'draft', 'sent', 'viewed', 'accepted', 'declined', 'converted'].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  statusFilter === s
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}
              >
                {s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All'}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : activeTab === 'quotes' ? (
          /* Quotes List */
          quotes && quotes.length > 0 ? (
            <div className="space-y-3">
              {quotes.map((quote) => (
                <div
                  key={quote.id}
                  className="bg-white rounded-xl border shadow-sm hover:shadow-md transition p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{quote.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${quoteStatusColors[quote.status]}`}>
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="font-mono">{quote.quote_number}</span>
                        <span>
                          {quote.customer?.full_name || 'No customer assigned'}
                        </span>
                        <span>Created {formatDate(quote.created_at)}</span>
                        {quote.valid_until && (
                          <span>Expires {formatDate(quote.valid_until)}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(quote.total)}</p>
                      <p className="text-xs text-gray-500">{(quote.quote_items || quote.items || []).length} item(s)</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Link
                      href={`/pro-dashboard/quotes/${quote.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>

                    {quote.status === 'draft' && (
                      <>
                        <Link
                          href={`/pro-dashboard/quotes/${quote.id}/edit`}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition"
                        >
                          Edit
                        </Link>
                        {quote.customer_id && (
                          <button
                            onClick={() => handleSendQuote(quote.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 rounded-lg transition"
                          >
                            <Send className="w-4 h-4" />
                            Send
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteQuote(quote.id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}

                    {quote.status === 'accepted' && (
                      <Link
                        href={`/pro-dashboard/quotes/${quote.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition"
                      >
                        <ArrowRight className="w-4 h-4" />
                        Convert to Invoice
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No quotes yet</h3>
              <p className="text-gray-500 mb-6">Create your first quote to send to a customer</p>
              <Link
                href="/pro-dashboard/quotes/new"
                className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg hover:bg-blue-700 transition font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Quote
              </Link>
            </div>
          )
        ) : (
          /* Invoices List */
          invoices && invoices.length > 0 ? (
            <div className="space-y-3">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="bg-white rounded-xl border shadow-sm hover:shadow-md transition p-5"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-gray-900">{invoice.title}</h3>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${invoiceStatusColors[invoice.status]}`}>
                          {invoice.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="font-mono">{invoice.invoice_number}</span>
                        <span>{invoice.customer?.full_name || 'No customer'}</span>
                        <span>Due {formatDate(invoice.due_date)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
                      {parseFloat(invoice.amount_paid) > 0 && (
                        <p className="text-xs text-green-600">Paid: {formatCurrency(invoice.amount_paid)}</p>
                      )}
                      {parseFloat(invoice.amount_due) > 0 && invoice.status !== 'draft' && (
                        <p className="text-xs text-orange-600">Due: {formatCurrency(invoice.amount_due)}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                    <Link
                      href={`/pro-dashboard/invoices/${invoice.id}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Eye className="w-4 h-4" />
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 bg-white rounded-xl border">
              <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No invoices yet</h3>
              <p className="text-gray-500 mb-6">Create an invoice or convert an accepted quote</p>
              <Link
                href="/pro-dashboard/invoices/new"
                className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg hover:bg-green-700 transition font-medium"
              >
                <Plus className="w-4 h-4" />
                Create Invoice
              </Link>
            </div>
          )
        )}
      </div>
    </div>
  );
}
