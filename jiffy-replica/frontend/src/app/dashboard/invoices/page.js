'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Receipt, Loader2, ChevronRight, Clock
} from 'lucide-react';
import { fetchInvoices } from '@/store/slices/quotesSlice';

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

export default function CustomerInvoicesPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { invoices, isLoading } = useSelector((state) => state.quotes);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    dispatch(fetchInvoices({}));
  }, [user, router, dispatch]);

  if (!user) return null;

  // Only show invoices that have been sent to this customer
  const visibleInvoices = (invoices || []).filter(i => ['sent', 'paid', 'partially_paid', 'overdue'].includes(i.status));
  const pendingInvoices = visibleInvoices.filter(i => ['sent', 'partially_paid', 'overdue'].includes(i.status));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500 mt-1">View and pay invoices from your service professionals</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Action Required Banner */}
        {pendingInvoices.length > 0 && (
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
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : visibleInvoices.length > 0 ? (
          <div className="space-y-3">
            {visibleInvoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/dashboard/invoices/${invoice.id}`}
                className="block bg-white rounded-xl border shadow-sm hover:shadow-md transition p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
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
                      <span>Due {formatDate(invoice.due_date)}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">{formatCurrency(invoice.total)}</p>
                      {parseFloat(invoice.amount_due) > 0 && invoice.status !== 'paid' && (
                        <p className="text-xs text-orange-600">Due: {formatCurrency(invoice.amount_due)}</p>
                      )}
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-xl border">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No invoices yet</h3>
            <p className="text-gray-500">Invoices from your service professionals will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
