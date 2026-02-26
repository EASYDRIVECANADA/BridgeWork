'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { paymentsAPI } from '@/lib/api';
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
  CreditCard,
  Calendar,
  DollarSign,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const statusConfig = {
  succeeded: { label: 'Paid', color: 'bg-green-50 text-green-600', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-600', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-600', icon: XCircle },
};

export default function TransactionsPage() {
  const router = useRouter();
  const { user, authInitialized } = useSelector((state) => state.auth);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ limit: 10, offset: 0, total: 0 });

  useEffect(() => {
    if (!authInitialized) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchTransactions(0);
  }, [user, authInitialized, router]);

  const fetchTransactions = async (offset) => {
    setLoading(true);
    try {
      const res = await paymentsAPI.getTransactions({ limit: 10, offset });
      const data = res.data?.data;
      setTransactions(data?.transactions || []);
      setPagination(data?.pagination || { limit: 10, offset: 0, total: 0 });
    } catch (err) {
      console.error('[TRANSACTIONS] Error:', err);
    }
    setLoading(false);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);
  const currentPage = Math.floor(pagination.offset / pagination.limit) + 1;

  const goToPage = (page) => {
    const newOffset = (page - 1) * pagination.limit;
    fetchTransactions(newOffset);
  };

  if (!authInitialized || (!user && !loading)) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Transaction History</h1>
            <p className="text-sm text-gray-500 mt-0.5">View all your payment transactions</p>
          </div>
        </div>

        {/* Summary Cards */}
        {!loading && transactions.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Paid</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${transactions
                      .filter((t) => t.status === 'succeeded')
                      .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0)
                      .toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Transactions</p>
                  <p className="text-lg font-bold text-gray-900">{pagination.total}</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Pending</p>
                  <p className="text-lg font-bold text-gray-900">
                    {transactions.filter((t) => t.status === 'pending').length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction List */}
        {loading ? (
          <div className="bg-white rounded-xl p-16 flex items-center justify-center border border-gray-100">
            <Loader2 className="w-6 h-6 animate-spin text-[#2D7FE6] mr-3" />
            <span className="text-gray-500">Loading transactions...</span>
          </div>
        ) : transactions.length === 0 ? (
          <div className="bg-white rounded-xl p-16 text-center border border-gray-100">
            <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-1">No transactions yet</h3>
            <p className="text-sm text-gray-500 mb-6">Your payment history will appear here after your first booking.</p>
            <Link
              href="/services"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#2D7FE6] text-white rounded-lg text-sm font-semibold hover:bg-[#2570d4] transition-colors"
            >
              Browse Services
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <div className="col-span-4">Service</div>
              <div className="col-span-2">Date</div>
              <div className="col-span-2">Amount</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2">Reference</div>
            </div>

            {/* Transaction Rows */}
            {transactions.map((tx) => {
              const config = statusConfig[tx.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-12 gap-4 px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center"
                >
                  <div className="col-span-4">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.bookings?.service_name || tx.description || 'Payment'}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {tx.bookings?.booking_number || '—'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">
                      {tx.created_at
                        ? new Date(tx.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm font-semibold text-gray-900">
                      ${parseFloat(tx.amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${config.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-gray-400 font-mono truncate">
                      {tx.stripe_payment_intent_id ? tx.stripe_payment_intent_id.slice(-8) : '—'}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                <p className="text-xs text-gray-500">
                  Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-sm text-gray-600 font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
