'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { 
  FileText, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle,
  XCircle,
  Loader2,
  User,
  Star,
  Briefcase,
  ChevronDown,
  ChevronUp,
  Award
} from 'lucide-react';
import { bookingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function AdminQuotationsPage() {
  const router = useRouter();
  const { user, profile } = useSelector((state) => state.auth);
  useAdminPermission('quotations');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [filter, setFilter] = useState('approved'); // 'approved', 'all'
  const [pagination, setPagination] = useState({ limit: 15, offset: 0, total: 0 });

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchQuotations(0);
  }, [user, profile, router]);

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

  const filteredBookings = bookings.filter(b => {
    if (filter === 'approved') return b.status === 'quote_approved';
    return true;
  });

  const approvedCount = bookings.filter(b => b.status === 'quote_approved').length;
  const pendingPaymentCount = bookings.filter(b => b.status === 'quote_approved' && !b.payment_status).length;

  if (!user || profile?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Quotations Overview</h1>
          <p className="text-gray-600 mt-1">
            View all quotes sent by pros to customers (read-only)
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{approvedCount}</p>
                <p className="text-xs text-gray-500">Quotes Sent to Customers</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingPaymentCount}</p>
                <p className="text-xs text-gray-500">Awaiting Payment</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{bookings.length}</p>
                <p className="text-xs text-gray-500">Total Quotes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('approved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'approved'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Sent to Customers ({approvedCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All ({bookings.length})
          </button>
        </div>

        {/* Bookings List */}
        {loading ? (
          <div className="bg-white rounded-xl p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading quotations...</span>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quotations</h3>
            <p className="text-gray-500">
              {filter === 'awaiting' 
                ? 'No bookings awaiting quotation selection.'
                : filter === 'approved'
                ? 'No approved quotations yet.'
                : 'No quotation requests at the moment.'}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {filteredBookings.map((booking) => {
              const isExpanded = expandedBooking === booking.id;
              const quotations = booking.booking_quotations || [];
              const selectedQuote = quotations.find(q => q.status === 'selected');
              
              return (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Booking Header */}
                  <div 
                    className="p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            {booking.service_name}
                          </h3>
                          <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                            booking.status === 'quote_approved'
                              ? 'bg-green-100 text-green-700'
                              : booking.status === 'paid'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {booking.status === 'quote_approved' ? 'Sent to Customer' : booking.status === 'paid' ? 'Paid' : booking.status}
                          </span>
                          <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                            {quotations.length} quote{quotations.length !== 1 ? 's' : ''} received
                          </span>
                        </div>

                        {/* Customer Info */}
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4 text-gray-400" />
                            {booking.profiles?.full_name || 'Customer'}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-gray-400" />
                            {booking.city}, {booking.state}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {booking.scheduled_date
                              ? new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Flexible'}
                          </span>
                        </div>

                        {/* Selected Quote Preview */}
                        {selectedQuote && (
                          <div className="flex items-center gap-2 text-sm">
                            <Award className="w-4 h-4 text-green-600" />
                            <span className="text-green-700 font-medium">
                              Selected: {selectedQuote.pro_profiles?.business_name || 'Pro'} - ${parseFloat(selectedQuote.quoted_price).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded: Quotations List */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-5 bg-gray-50">
                      <h4 className="text-sm font-semibold text-gray-700 mb-4">
                        Submitted Quotations ({quotations.length})
                      </h4>

                      {quotations.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No quotations submitted yet. Waiting for pros to respond.
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {quotations
                            .sort((a, b) => parseFloat(a.quoted_price) - parseFloat(b.quoted_price))
                            .map((quote, index) => {
                              const isSelected = quote.status === 'selected';
                              const isRejected = quote.status === 'rejected';
                              const taxAmount = parseFloat(quote.quoted_price) * 0.08;
                              const totalWithTax = parseFloat(quote.quoted_price) + taxAmount;

                              return (
                                <div
                                  key={quote.id}
                                  className={`p-4 rounded-lg border ${
                                    isSelected
                                      ? 'bg-green-50 border-green-200'
                                      : isRejected
                                      ? 'bg-gray-100 border-gray-200 opacity-60'
                                      : 'bg-white border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                      {/* Pro Info */}
                                      <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-[#0E7480] rounded-full flex items-center justify-center text-white font-semibold">
                                          {quote.pro_profiles?.business_name?.charAt(0) || 'P'}
                                        </div>
                                        <div>
                                          <p className="font-semibold text-gray-900">
                                            {quote.pro_profiles?.business_name || 'Pro'}
                                            {index === 0 && !isSelected && !isRejected && (
                                              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                                Lowest Price
                                              </span>
                                            )}
                                          </p>
                                          <div className="flex items-center gap-2 text-xs text-gray-500">
                                            {quote.pro_profiles?.rating && (
                                              <span className="flex items-center gap-1">
                                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                                {quote.pro_profiles.rating.toFixed(1)}
                                              </span>
                                            )}
                                            {quote.pro_profiles?.total_jobs && (
                                              <span className="flex items-center gap-1">
                                                <Briefcase className="w-3 h-3" />
                                                {quote.pro_profiles.total_jobs} jobs
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Quote Details */}
                                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-2">
                                        <div>
                                          <p className="text-gray-500 text-xs">Quote Price</p>
                                          <p className="font-bold text-[#0E7480]">
                                            ${parseFloat(quote.quoted_price).toFixed(2)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 text-xs">+ Tax (8%)</p>
                                          <p className="font-medium text-gray-700">
                                            ${taxAmount.toFixed(2)}
                                          </p>
                                        </div>
                                        <div>
                                          <p className="text-gray-500 text-xs">Customer Total</p>
                                          <p className="font-bold text-gray-900">
                                            ${totalWithTax.toFixed(2)}
                                          </p>
                                        </div>
                                        {quote.estimated_duration && (
                                          <div>
                                            <p className="text-gray-500 text-xs">Est. Duration</p>
                                            <p className="font-medium text-gray-700">
                                              {quote.estimated_duration} min
                                            </p>
                                          </div>
                                        )}
                                      </div>

                                      {/* Description */}
                                      {quote.description && (
                                        <p className="text-sm text-gray-600 mb-2">
                                          {quote.description}
                                        </p>
                                      )}

                                      {/* Extra Info */}
                                      <div className="flex flex-wrap gap-2 text-xs">
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
                                      </div>
                                    </div>

                                    {/* Status Indicator (Read-only) */}
                                    <div className="ml-4">
                                      <span className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold">
                                        <CheckCircle className="w-4 h-4" />
                                        Sent to Customer
                                      </span>
                                    </div>
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

            {/* Pagination Controls */}
            {pagination.total > pagination.limit && (
              <div className="flex items-center justify-between mt-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <p className="text-sm text-gray-600">
                  Showing {pagination.offset + 1}–{Math.min(pagination.offset + pagination.limit, pagination.total)} of {pagination.total}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => fetchQuotations(Math.max(0, pagination.offset - pagination.limit))}
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
    </div>
  );
}
