'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { X, Search, ChevronDown, Calendar, Clock, MapPin, Briefcase, MessageSquare, Loader2, CreditCard, CheckCircle, AlertTriangle, Eye, ShieldCheck, ShieldAlert, Star, FileText } from 'lucide-react';
import { fetchBookings, cancelBooking } from '@/store/slices/bookingsSlice';
import { servicesAPI, paymentsAPI, prosAPI, reviewsAPI } from '@/lib/api';
import ReviewModal from '@/components/ReviewModal';
import { toast } from 'react-toastify';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  proof_submitted: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  disputed: 'bg-red-100 text-red-700',
  pending_assignment: 'bg-amber-100 text-amber-700',
  awaiting_quotes: 'bg-orange-100 text-orange-700',
  quote_approved: 'bg-teal-100 text-teal-700',
  quote_pending: 'bg-orange-100 text-orange-700',
};

const statusLabels = {
  pending: 'Pending',
  accepted: 'In Progress',
  in_progress: 'In Progress',
  proof_submitted: 'Review & Pay',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  pending_assignment: 'Under Review',
  awaiting_quotes: 'Getting Quotes',
  quote_approved: 'Quote Ready',
  quote_pending: 'Quote Pending',
};

export default function MyJobsPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { bookings, isLoading } = useSelector((state) => state.bookings);
  const [showBanner, setShowBanner] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [services, setServices] = useState([]);
  const [proofModal, setProofModal] = useState(null);
  const [disputeModal, setDisputeModal] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState(new Set());
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    dispatch(fetchBookings());
  }, [user, router, dispatch]);

  // Check which completed bookings already have reviews
  useEffect(() => {
    if (!bookings || !Array.isArray(bookings)) return;
    const reviewed = new Set();
    for (const b of bookings) {
      if (b.reviews && b.reviews.length > 0) {
        reviewed.add(b.id);
      }
    }
    setReviewedBookingIds(reviewed);
  }, [bookings]);

  useEffect(() => {
    const loadServices = async () => {
      try {
        const res = await servicesAPI.getAll();
        setServices(res.data?.data?.services || []);
      } catch (err) {
        console.log('[MY-JOBS] Could not load services for search');
      }
    };
    loadServices();
  }, []);

  const handleCancelBooking = async () => {
    if (!cancelModal) return;
    setCancelLoading(true);
    try {
      await dispatch(cancelBooking({ id: cancelModal, reason: cancelReason || 'Cancelled by homeowner' })).unwrap();
      toast.success('Booking cancelled. Any held funds will be released back to your card.');
      setCancelModal(null);
      setCancelReason('');
      dispatch(fetchBookings());
    } catch (err) {
      toast.error(err || 'Failed to cancel booking.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleViewProof = async (bookingId) => {
    try {
      const res = await prosAPI.getJobProof(bookingId);
      const data = res.data?.data;
      setProofModal({
        proof: data?.proof || null,
        additional_invoice: data?.additional_invoice || null
      });
    } catch {
      toast.error('Could not load proof of work.');
    }
  };

  const handleConfirmJob = async (bookingId) => {
    setActionLoading(bookingId);
    try {
      await paymentsAPI.capturePayment({ booking_id: bookingId });
      toast.success('Job confirmed! Payment has been released to the pro.');
      dispatch(fetchBookings());
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to confirm job.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDispute = async () => {
    if (!disputeModal || disputeReason.trim().length < 10) {
      toast.error('Please provide a detailed reason (at least 10 characters).');
      return;
    }
    setActionLoading(disputeModal);
    try {
      await paymentsAPI.disputeBooking({ booking_id: disputeModal, reason: disputeReason });
      toast.success('Dispute submitted. An admin will review it.');
      setDisputeModal(null);
      setDisputeReason('');
      dispatch(fetchBookings());
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to submit dispute.');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user) return null;

  const allBookings = Array.isArray(bookings) ? bookings : [];
  const activeBookings = allBookings.filter(
    (b) => ['pending', 'accepted', 'in_progress', 'proof_submitted', 'disputed', 'pending_assignment', 'awaiting_quotes', 'quote_approved', 'quote_pending'].includes(b.status)
  );
  const completedBookings = allBookings.filter((b) => b.status === 'completed');

  const filteredServices = searchQuery.trim()
    ? services.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : services;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-10">
        {/* Page Title */}
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2">Jobs</h1>
        <hr className="border-gray-300 mb-4 sm:mb-6" />

        {/* Promo Banner */}
        {showBanner && (
          <div className="relative rounded-lg overflow-hidden mb-4 sm:mb-6 lg:mb-8">
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 px-3 sm:px-5 py-2 sm:py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
              <p className="text-white text-xs sm:text-sm font-medium">
                Get $40 off your next 2 jobs if you pay $25 now
              </p>
              <div className="flex items-center gap-2 sm:gap-3">
                <button className="bg-white text-gray-900 text-xs font-semibold px-3 sm:px-4 py-1 sm:py-1.5 rounded hover:bg-gray-100 transition-colors">
                  See Offer
                </button>
                <button
                  onClick={() => setShowBanner(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-4 sm:w-5 h-4 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Jobs Section */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
            Active Jobs ({activeBookings.length})
          </h2>

          {isLoading ? (
            <div className="bg-gray-100 rounded-lg p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">Loading jobs...</span>
            </div>
          ) : activeBookings.length > 0 ? (
            <div className="space-y-3">
              {activeBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Icon */}
                    <div className="w-10 sm:w-14 h-10 sm:h-14 bg-gradient-to-br from-[#0E7480] to-[#0a5a63] rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Briefcase className="w-5 sm:w-7 h-5 sm:h-7 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Title Row */}
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-3 mb-2 sm:mb-3">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-gray-900 mb-1">
                            {booking.service_name}
                          </h3>
                          {(booking.pro_profiles?.business_name || booking.pro_profiles?.profiles?.full_name) && (
                            <p className="text-sm text-gray-600">
                              by <span className="font-medium text-gray-900">{booking.pro_profiles?.business_name || booking.pro_profiles?.profiles?.full_name}</span>
                            </p>
                          )}
                        </div>
                        {booking.total_price > 0 && (
                          <div className="text-right">
                            <p className="text-xl font-bold text-[#0E7480]">
                              ${parseFloat(booking.updated_total_price || booking.total_price).toFixed(2)}
                            </p>
                            {booking.has_additional_invoice && booking.updated_total_price && (
                              <p className="text-xs text-gray-500 line-through">
                                ${parseFloat(booking.total_price).toFixed(2)}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Details Row */}
                      <div className="flex items-center gap-2 sm:gap-4 mb-3 sm:mb-4 flex-wrap text-xs sm:text-sm">
                        <span className="text-gray-600 flex items-center gap-1">
                          <Calendar className="w-3.5 sm:w-4 h-3.5 sm:h-4 text-gray-400" />
                          {booking.scheduled_date
                            ? new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })
                            : ''}
                        </span>
                        <span className="text-sm text-gray-600 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-gray-400" />
                          {booking.scheduled_time || ''}
                        </span>
                        <span className="text-sm text-gray-600 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-gray-400" />
                          {booking.city}, {booking.state}
                        </span>
                      </div>

                      {/* Status & Actions Row */}
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {/* Status Badge */}
                        <span
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                            statusColors[booking.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {statusLabels[booking.status] || booking.status}
                        </span>

                        {/* Payment Status */}
                        {booking.transactions?.some(t => t.status === 'succeeded') ? (
                          <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-green-50 text-green-700 border border-green-200 flex items-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Paid
                          </span>
                        ) : booking.transactions?.some(t => t.status === 'held') ? (
                          <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            Funds Held
                          </span>
                        ) : !booking.transactions?.some(t => t.status === 'held' || t.status === 'succeeded') && booking.status !== 'disputed' ? (
                          <Link
                            href={`/checkout/${booking.id}`}
                            className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-[#0E7480] text-white hover:bg-[#0a5a63] transition-colors flex items-center gap-1.5 shadow-sm"
                          >
                            <CreditCard className="w-4 h-4" />
                            Pay Now
                          </Link>
                        ) : null}

                        {/* Cancel button */}
                        {['pending', 'accepted'].includes(booking.status) && !booking.transactions?.some(t => t.status === 'held' || t.status === 'succeeded') && (
                          <button
                            onClick={() => { setCancelModal(booking.id); setCancelReason(''); }}
                            className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        )}

                        {/* Proof Submitted - Customer reviews and pays */}
                        {booking.status === 'proof_submitted' && (
                          <>
                            <button
                              onClick={() => handleViewProof(booking.id)}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors flex items-center gap-1.5"
                            >
                              <Eye className="w-4 h-4" />
                              View Proof
                            </button>
                            <Link
                              href={`/checkout/${booking.id}`}
                              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <CreditCard className="w-4 h-4" />
                              Approve & Pay
                            </Link>
                            <button
                              onClick={() => { setDisputeModal(booking.id); setDisputeReason(''); }}
                              className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5"
                            >
                              <ShieldAlert className="w-4 h-4" />
                              Dispute
                            </button>
                          </>
                        )}

                        {/* Legacy: in_progress with proof (for backward compatibility) */}
                        {booking.status === 'in_progress' && booking.proof_submitted_at && (
                          <>
                            <button
                              onClick={() => handleViewProof(booking.id)}
                              className="px-3 py-1.5 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors flex items-center gap-1.5"
                            >
                              <Eye className="w-4 h-4" />
                              View Proof
                            </button>
                            <button
                              onClick={() => handleConfirmJob(booking.id)}
                              disabled={actionLoading === booking.id}
                              className="px-4 py-1.5 text-sm font-semibold rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                            >
                              <ShieldCheck className="w-4 h-4" />
                              {actionLoading === booking.id ? 'Processing...' : 'Confirm & Pay'}
                            </button>
                            <button
                              onClick={() => { setDisputeModal(booking.id); setDisputeReason(''); }}
                              className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors flex items-center gap-1.5"
                            >
                              <ShieldAlert className="w-4 h-4" />
                              Dispute
                            </button>
                          </>
                        )}

                        {/* Message Pro */}
                        {(booking.status === 'accepted' || booking.status === 'in_progress' || booking.status === 'proof_submitted') && (
                          <Link
                            href={`/messages/${booking.id}`}
                            className="px-3 py-1.5 text-sm font-medium rounded-lg text-[#0E7480] hover:bg-[#0E7480]/10 border border-[#0E7480]/20 transition-colors flex items-center gap-1.5"
                          >
                            <MessageSquare className="w-4 h-4" />
                            Message
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State — matches the uploaded design exactly */
            <div className="bg-gray-100 rounded-lg p-8 flex items-start gap-6">
              {/* Illustration */}
              <div className="flex-shrink-0 w-28 h-28 relative">
                <Image
                  src="https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=200"
                  alt="No active jobs"
                  width={112}
                  height={112}
                  className="object-cover rounded-lg opacity-70"
                  unoptimized
                />
              </div>

              <div className="flex-1">
                <p className="text-gray-700 font-medium mb-1">
                  You don&apos;t have any jobs yet.
                </p>
                <p className="text-gray-500 text-sm mb-4">Let&apos;s get started.</p>

                {/* Search Dropdown */}
                <div className="relative max-w-xs">
                  <div
                    className="flex items-center bg-white border border-gray-300 rounded-md px-3 py-2 cursor-pointer hover:border-gray-400 transition-colors"
                    onClick={() => setSearchOpen(!searchOpen)}
                  >
                    <Search className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
                    <input
                      type="text"
                      placeholder="What can we help you with?"
                      className="flex-1 text-sm text-gray-700 placeholder-gray-400 outline-none bg-transparent"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setSearchOpen(true);
                      }}
                      onFocus={() => setSearchOpen(true)}
                    />
                    <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  </div>

                  {searchOpen && filteredServices.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto z-10">
                      {filteredServices.slice(0, 8).map((service) => (
                        <Link
                          key={service.id}
                          href={`/services/${service.slug || service.id}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                          onClick={() => setSearchOpen(false)}
                        >
                          {service.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Completed Jobs Section */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            Completed Jobs ({completedBookings.length})
          </h2>

          {isLoading ? (
            <div className="bg-gray-100 rounded-lg p-10 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
              <span className="text-gray-500">Loading...</span>
            </div>
          ) : completedBookings.length > 0 ? (
            <div className="space-y-3">
              {completedBookings.map((booking) => {
                const review = booking.reviews?.[0];
                const proName = booking.pro_profiles?.business_name || booking.pro_profiles?.profiles?.full_name;
                return (
                  <div
                    key={booking.id}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                  >
                    <div className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-6 h-6 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {booking.service_name}
                          </p>
                          {booking.total_price > 0 && (
                            <span className="text-sm font-bold text-green-600">
                              ${parseFloat(booking.updated_total_price || booking.total_price).toFixed(2)}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {proName && (
                            <span className="text-xs text-gray-600 font-medium">
                              by {proName}
                            </span>
                          )}
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {booking.scheduled_date
                              ? new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : ''}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {booking.city}, {booking.state}
                          </span>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">
                        Completed
                      </span>
                      {booking.transactions && booking.transactions.some(t => t.status === 'succeeded') && (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Paid
                        </span>
                      )}
                      {reviewedBookingIds.has(booking.id) ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-50 text-yellow-600 flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-500" />
                          Reviewed
                        </span>
                      ) : (
                        <button
                          onClick={() => setReviewBooking(booking)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[#0E7480] text-white hover:bg-[#2570d4] transition-colors flex items-center gap-1"
                        >
                          <Star className="w-3 h-3" />
                          Leave a Review
                        </button>
                      )}
                    </div>
                    {/* Inline review display */}
                    {review && (
                      <div className="px-4 pb-4 pt-0">
                        <div className="bg-gray-50 rounded-lg p-3 ml-16">
                          <div className="flex items-center gap-1 mb-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                              />
                            ))}
                            <span className="text-xs text-gray-400 ml-2">
                              {review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                            </span>
                          </div>
                          {review.comment && (
                            <p className="text-xs text-gray-600 leading-relaxed">{review.comment}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            /* Empty State for Completed */
            <div className="bg-gray-100 rounded-lg p-8 flex items-center gap-6">
              <div className="flex-shrink-0 w-20 h-20 relative">
                <Image
                  src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=200"
                  alt="No completed jobs"
                  width={80}
                  height={80}
                  className="object-cover rounded-lg opacity-60"
                  unoptimized
                />
              </div>
              <p className="text-gray-500 text-sm">You have not completed any jobs</p>
            </div>
          )}
        </div>

        {/* Proof Modal */}
        {proofModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProofModal(null)}>
            <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Proof of Work</h3>
                <button onClick={() => setProofModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {proofModal.proof?.notes && (
                <p className="text-sm text-gray-700 mb-4 bg-gray-50 rounded-lg p-3">{proofModal.proof.notes}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {(proofModal.proof?.photos || []).map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <Image src={photo} alt={`Proof ${i + 1}`} fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Submitted: {proofModal.proof?.submitted_at ? new Date(proofModal.proof.submitted_at).toLocaleString() : 'N/A'}
              </p>

              {/* Additional Invoice Section */}
              {proofModal.additional_invoice && (
                <div className="mt-4 border border-[#0E7480]/30 rounded-lg p-4 bg-[#0E7480]/5">
                  <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#0E7480]" />
                    Additional Invoice
                  </h4>
                  
                  {/* Original Amount */}
                  <div className="flex justify-between text-sm mb-2 pb-2 border-b border-gray-200">
                    <span className="text-gray-600">Original Booking:</span>
                    <span className="font-medium text-gray-900">${parseFloat(proofModal.additional_invoice.original_amount || 0).toFixed(2)}</span>
                  </div>

                  {/* Additional Labor */}
                  {proofModal.additional_invoice.additional_hours > 0 && (
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">
                        Additional Labor ({proofModal.additional_invoice.additional_hours}hrs × ${parseFloat(proofModal.additional_invoice.hourly_rate || 0).toFixed(2)}/hr):
                      </span>
                      <span className="text-gray-900">${parseFloat(proofModal.additional_invoice.labor_total || 0).toFixed(2)}</span>
                    </div>
                  )}

                  {/* Materials */}
                  {proofModal.additional_invoice.materials && proofModal.additional_invoice.materials.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs font-medium text-gray-600 mb-1">Materials:</p>
                      {proofModal.additional_invoice.materials.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs text-gray-600 pl-2">
                          <span>{item.name} ({item.quantity} × ${parseFloat(item.unit_price || 0).toFixed(2)})</span>
                          <span>${parseFloat(item.total || 0).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Materials Total:</span>
                        <span className="text-gray-900">${parseFloat(proofModal.additional_invoice.materials_total || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  )}

                  {/* Tax */}
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-600">Tax ({((proofModal.additional_invoice.tax_rate || 0.13) * 100).toFixed(0)}%):</span>
                    <span className="text-gray-900">${parseFloat(proofModal.additional_invoice.tax || 0).toFixed(2)}</span>
                  </div>

                  {/* Grand Total */}
                  <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-300">
                    <span className="text-gray-900">NEW TOTAL:</span>
                    <span className="text-[#0E7480]">${parseFloat(proofModal.additional_invoice.grand_total || 0).toFixed(2)}</span>
                  </div>

                  {/* Invoice Notes */}
                  {proofModal.additional_invoice.notes && (
                    <p className="text-xs text-gray-600 mt-2 bg-gray-100 rounded p-2">
                      <span className="font-medium">Note:</span> {proofModal.additional_invoice.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Review Modal */}
        {reviewBooking && (
          <ReviewModal
            booking={reviewBooking}
            onClose={() => setReviewBooking(null)}
            onReviewSubmitted={() => {
              setReviewedBookingIds((prev) => new Set([...prev, reviewBooking.id]));
              dispatch(fetchBookings());
            }}
          />
        )}

        {/* Cancel Booking Modal */}
        {cancelModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setCancelModal(null)}>
            <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Cancel Booking
                </h3>
                <button onClick={() => setCancelModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Are you sure you want to cancel this booking? If payment was already held, it will be released back to your card.
              </p>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (optional)..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-20 focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setCancelModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Keep Booking
                </button>
                <button
                  onClick={handleCancelBooking}
                  disabled={cancelLoading}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {cancelLoading ? 'Cancelling...' : 'Yes, Cancel Booking'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dispute Modal */}
        {disputeModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDisputeModal(null)}>
            <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  Dispute Job
                </h3>
                <button onClick={() => setDisputeModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                If the pro did not complete the work as expected, describe what happened. An admin will review and may refund your held payment.
              </p>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                placeholder="Describe the issue in detail (min 10 characters)..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-28 focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => setDisputeModal(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispute}
                  disabled={actionLoading || disputeReason.trim().length < 10}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Submitting...' : 'Submit Dispute'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
