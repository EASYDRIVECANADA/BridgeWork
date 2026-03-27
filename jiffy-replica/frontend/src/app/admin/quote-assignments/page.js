'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { bookingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';
import { 
  ClipboardList,
  Users,
  MapPin,
  Calendar,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronUp,
  Star,
  Briefcase,
  Send,
  RefreshCw
} from 'lucide-react';

export default function AdminQuoteAssignmentsPage() {
  const { user, profile } = useSelector((state) => state.auth);
  const router = useRouter();
  useAdminPermission('quote_assignments');
  const [pendingBookings, setPendingBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedBooking, setExpandedBooking] = useState(null);
  const [availablePros, setAvailablePros] = useState([]);
  const [selectedPro, setSelectedPro] = useState(null);
  const [loadingPros, setLoadingPros] = useState(false);
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchPendingAssignments();
  }, [user, profile, router]);

  const fetchPendingAssignments = async () => {
    try {
      setLoading(true);
      const res = await bookingsAPI.getPendingAssignments();
      setPendingBookings(res.data?.data?.bookings || []);
    } catch (err) {
      toast.error('Failed to load pending quote requests');
    } finally {
      setLoading(false);
    }
  };

  const handleExpandBooking = async (bookingId) => {
    if (expandedBooking === bookingId) {
      setExpandedBooking(null);
      setAvailablePros([]);
      setSelectedPro(null);
      return;
    }

    setExpandedBooking(bookingId);
    setLoadingPros(true);
    setSelectedPro(null);

    try {
      const res = await bookingsAPI.getAvailableProsForQuote(bookingId);
      setAvailablePros(res.data?.data?.pros || []);
    } catch (err) {
      toast.error('Failed to load available pros');
    } finally {
      setLoadingPros(false);
    }
  };

  const selectPro = (proId) => {
    setSelectedPro(proId);
  };

  const handleOfferToPro = async (bookingId) => {
    if (!selectedPro) {
      toast.error('Please select a pro');
      return;
    }

    setAssigning(true);
    try {
      await bookingsAPI.directOfferToPro({
        bookingId,
        proId: selectedPro
      });
      toast.success('Booking offered to pro successfully!');
      setExpandedBooking(null);
      setSelectedPro(null);
      setAvailablePros([]);
      fetchPendingAssignments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to offer booking to pro');
    } finally {
      setAssigning(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const [hours, minutes] = timeStr.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 lg:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Quote Assignments</h1>
              <p className="mt-1 text-xs sm:text-sm text-gray-500">
                Select a pro to offer each free quote booking to
              </p>
            </div>
            <button
              onClick={fetchPendingAssignments}
              className="flex items-center justify-center px-3 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
            >
              <RefreshCw className="h-4 sm:h-5 w-4 sm:w-5 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="flex items-center">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <ClipboardList className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-500">Pending Assignment</p>
                <p className="text-2xl font-bold text-gray-900">{pendingBookings.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pending Quote Requests */}
        {pendingBookings.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Pending Assignments</h3>
            <p className="text-gray-500">All quote requests have been assigned to pros.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingBookings.map((booking) => (
              <div key={booking.id} className="bg-white rounded-lg shadow overflow-hidden">
                {/* Booking Header */}
                <div 
                  className="p-4 sm:p-6 cursor-pointer hover:bg-gray-50"
                  onClick={() => handleExpandBooking(booking.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center">
                        <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                          Pending Assignment
                        </span>
                        <span className="ml-3 text-sm text-gray-500">
                          #{booking.booking_number}
                        </span>
                      </div>
                      <h3 className="mt-2 text-base sm:text-lg font-semibold text-gray-900">
                        {booking.service_name || booking.services?.name}
                      </h3>
                      <div className="mt-2 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          {booking.profiles?.full_name || 'Customer'}
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          {booking.city}, {booking.state}
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          {formatDate(booking.scheduled_date)} {formatTime(booking.scheduled_time)}
                        </div>
                      </div>
                      {booking.special_instructions && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {booking.special_instructions}
                        </p>
                      )}
                    </div>
                    <div className="ml-4">
                      {expandedBooking === booking.id ? (
                        <ChevronUp className="h-6 w-6 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Pro Selection */}
                {expandedBooking === booking.id && (
                  <div className="border-t border-gray-200 bg-gray-50 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                      <h4 className="text-base sm:text-lg font-medium text-gray-900">
                        Select a Pro to Offer This Job To
                      </h4>
                      <p className="text-xs sm:text-sm text-gray-500">The selected pro will be assigned directly and notified</p>
                    </div>

                    {loadingPros ? (
                      <div className="flex justify-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    ) : availablePros.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No available pros found for this service category.
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                          {availablePros.map((pro) => (
                            <div
                              key={pro.id}
                              onClick={() => !pro.is_assigned && selectPro(pro.id)}
                              className={`
                                relative p-4 rounded-lg border-2 transition-all
                                ${pro.is_assigned 
                                  ? 'bg-green-50 border-green-300 cursor-not-allowed'
                                  : selectedPro === pro.id
                                    ? 'bg-blue-50 border-blue-500 cursor-pointer'
                                    : 'bg-white border-gray-200 hover:border-blue-300 cursor-pointer'
                                }
                              `}
                            >
                              {/* Radio button indicator */}
                              {!pro.is_assigned && (
                                <div className={`
                                  absolute top-3 right-3 w-5 h-5 rounded-full border-2 flex items-center justify-center
                                  ${selectedPro === pro.id 
                                    ? 'border-blue-500' 
                                    : 'border-gray-300'
                                  }
                                `}>
                                  {selectedPro === pro.id && (
                                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                                  )}
                                </div>
                              )}

                              {pro.is_assigned && (
                                <div className="absolute top-3 right-3">
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                    Already Assigned
                                  </span>
                                </div>
                              )}

                              <div className="flex items-start">
                                <div className="flex-shrink-0">
                                  {pro.profiles?.avatar_url ? (
                                    <img
                                      src={pro.profiles.avatar_url}
                                      alt={pro.business_name}
                                      className="h-12 w-12 rounded-full object-cover"
                                    />
                                  ) : (
                                    <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                                      <Users className="h-6 w-6 text-gray-400" />
                                    </div>
                                  )}
                                </div>
                                <div className="ml-3 flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-900 truncate">
                                    {pro.business_name || pro.profiles?.full_name}
                                  </p>
                                  <div className="flex items-center mt-1">
                                    <Star className="h-4 w-4 text-yellow-400" />
                                    <span className="ml-1 text-sm text-gray-600">
                                      {pro.rating?.toFixed(1) || 'N/A'}
                                    </span>
                                    <span className="mx-2 text-gray-300">•</span>
                                    <Briefcase className="h-4 w-4 text-gray-400" />
                                    <span className="ml-1 text-sm text-gray-600">
                                      {pro.total_jobs || 0} jobs
                                    </span>
                                  </div>
                                  {pro.distance !== null && (
                                    <div className="flex items-center mt-1">
                                      <MapPin className="h-4 w-4 text-gray-400" />
                                      <span className="ml-1 text-sm text-gray-500">
                                        {pro.distance.toFixed(1)} km away
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Assign Button */}
                        <div className="flex justify-center sm:justify-end">
                          <button
                            onClick={() => handleOfferToPro(booking.id)}
                            disabled={!selectedPro || assigning}
                            className={`
                              flex items-center justify-center w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg text-sm sm:text-base font-medium transition-all
                              ${!selectedPro || assigning
                                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                : 'bg-[#0E7480] text-white hover:bg-[#0c6570]'
                              }
                            `}
                          >
                            {assigning ? (
                              <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Offering...
                              </>
                            ) : (
                              <>
                                <Send className="h-5 w-5 mr-2" />
                                Offer to Pro
                              </>
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
