'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FileText, 
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ChevronRight,
  User,
  Send
} from 'lucide-react';
import { bookingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function ProQuoteRequestsPage() {
  const router = useRouter();
  const { user, profile } = useSelector((state) => state.auth);
  const [quoteRequests, setQuoteRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'available', 'submitted'

  useEffect(() => {
    if (!user || profile?.role !== 'pro') {
      router.push('/pro-login');
      return;
    }
    fetchQuoteRequests();
  }, [user, profile, router]);

  const fetchQuoteRequests = async () => {
    try {
      setLoading(true);
      const res = await bookingsAPI.getQuoteRequestsForPro();
      setQuoteRequests(res.data?.data?.bookings || []);
    } catch (err) {
      toast.error('Failed to load quote requests');
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = quoteRequests.filter(req => {
    if (filter === 'available') return req.can_submit_quote;
    if (filter === 'submitted') return req.has_submitted_quote;
    return true;
  });

  const availableCount = quoteRequests.filter(r => r.can_submit_quote).length;
  const submittedCount = quoteRequests.filter(r => r.has_submitted_quote).length;

  if (!user || profile?.role !== 'pro') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Quote Requests</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">
            Submit your quotations for Free Quote service requests
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{quoteRequests.length}</p>
                <p className="text-xs text-gray-500">Total Requests</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{availableCount}</p>
                <p className="text-xs text-gray-500">Available to Bid</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{submittedCount}</p>
                <p className="text-xs text-gray-500">Quotes Submitted</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs - Scrollable on mobile */}
        <div className="flex gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => setFilter('all')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All ({quoteRequests.length})
          </button>
          <button
            onClick={() => setFilter('available')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filter === 'available'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Available ({availableCount})
          </button>
          <button
            onClick={() => setFilter('submitted')}
            className={`flex-shrink-0 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              filter === 'submitted'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Submitted ({submittedCount})
          </button>
        </div>

        {/* Quote Requests List */}
        {loading ? (
          <div className="bg-white rounded-xl p-12 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading quote requests...</span>
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Quote Requests</h3>
            <p className="text-gray-500">
              {filter === 'available' 
                ? 'No new quote requests available at the moment.'
                : filter === 'submitted'
                ? 'You haven\'t submitted any quotes yet.'
                : 'There are no quote requests at the moment.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredRequests.map((request) => (
              <div
                key={request.id}
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Service Name & Status */}
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-2">
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                          {request.service_name}
                        </h3>
                        {request.has_submitted_quote ? (
                          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-green-100 text-green-700 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Quote Submitted
                          </span>
                        ) : request.can_submit_quote ? (
                          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">
                            Awaiting Your Quote
                          </span>
                        ) : (
                          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-gray-100 text-gray-700">
                            No Longer Accepting Quotes
                          </span>
                        )}
                        {request.my_quote_status === 'counter_offered' && (
                          <span className="px-2 sm:px-2.5 py-0.5 sm:py-1 text-[10px] sm:text-xs font-semibold rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            Counter-Offer
                          </span>
                        )}
                        <span className="text-[10px] sm:text-xs text-gray-400">
                          {request.total_quotes} quote{request.total_quotes !== 1 ? 's' : ''} received
                        </span>
                      </div>

                      {/* Customer Info */}
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{request.profiles?.full_name || 'Customer'}</span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                        <div className="flex items-center gap-2 text-gray-600">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          <span>{request.city}, {request.state}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>
                            {request.scheduled_date
                              ? new Date(request.scheduled_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Flexible'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{request.scheduled_time || 'Flexible'}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span className="font-medium text-[#0E7480]">Free Quote</span>
                        </div>
                      </div>

                      {/* Special Instructions */}
                      {request.special_instructions && (
                        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">Notes:</span> {request.special_instructions}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Button */}
                    <Link
                      href={`/pro-dashboard/quote-requests/${request.id}`}
                      className={`flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg text-sm font-semibold transition-colors ${
                        request.my_quote_status === 'counter_offered'
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : request.can_submit_quote
                          ? 'bg-[#0E7480] text-white hover:bg-[#0a5a63]'
                          : request.has_submitted_quote
                          ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {request.my_quote_status === 'counter_offered'
                        ? 'Review Counter-Offer'
                        : request.can_submit_quote
                        ? 'Submit Quote'
                        : request.has_submitted_quote
                        ? 'View Quote'
                        : 'View Details'}
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
