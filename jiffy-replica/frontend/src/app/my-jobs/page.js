'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { X, Search, ChevronDown, Calendar, Clock, MapPin, Briefcase, MessageSquare, Loader2, CreditCard, CheckCircle, AlertTriangle, Eye, ShieldCheck, ShieldAlert, Star } from 'lucide-react';
import { fetchBookings } from '@/store/slices/bookingsSlice';
import { servicesAPI, paymentsAPI, prosAPI, reviewsAPI } from '@/lib/api';
import ReviewModal from '@/components/ReviewModal';
import { toast } from 'react-toastify';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  disputed: 'bg-red-100 text-red-700',
};

const statusLabels = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'Proof Submitted',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
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

  const handleViewProof = async (bookingId) => {
    try {
      const res = await prosAPI.getJobProof(bookingId);
      setProofModal(res.data?.data?.proof || null);
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
    (b) => ['pending', 'accepted', 'in_progress', 'disputed'].includes(b.status)
  );
  const completedBookings = allBookings.filter((b) => b.status === 'completed');

  const filteredServices = searchQuery.trim()
    ? services.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : services;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Page Title */}
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Jobs</h1>
        <hr className="border-gray-300 mb-6" />

        {/* Promo Banner */}
        {showBanner && (
          <div className="relative rounded-lg overflow-hidden mb-8">
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-purple-600 px-5 py-3 flex items-center justify-between">
              <p className="text-white text-sm font-medium">
                Get $40 off your next 2 jobs if you pay $25 now
              </p>
              <div className="flex items-center gap-3">
                <button className="bg-white text-gray-900 text-xs font-semibold px-4 py-1.5 rounded hover:bg-gray-100 transition-colors">
                  See Offer
                </button>
                <button
                  onClick={() => setShowBanner(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Active Jobs Section */}
        <div className="mb-10">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
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
                  className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 flex items-center gap-4"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-6 h-6 text-[#0E7480]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {booking.service_name}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      {(booking.pro_profiles?.business_name || booking.pro_profiles?.profiles?.full_name) && (
                        <span className="text-xs text-gray-600 font-medium">
                          by {booking.pro_profiles?.business_name || booking.pro_profiles?.profiles?.full_name}
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
                        <Clock className="w-3 h-3" />
                        {booking.scheduled_time || ''}
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {booking.city}, {booking.state}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      statusColors[booking.status] || 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {statusLabels[booking.status] || booking.status}
                  </span>
                  {/* Payment Status */}
                  {booking.transactions?.some(t => t.status === 'succeeded') ? (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-600 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" />
                      Paid
                    </span>
                  ) : booking.transactions?.some(t => t.status === 'held') ? (
                    <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Funds Held
                    </span>
                  ) : !booking.transactions?.some(t => t.status === 'held' || t.status === 'succeeded') && booking.status !== 'disputed' ? (
                    <Link
                      href={`/checkout/${booking.id}`}
                      className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[#0E7480] text-white hover:bg-[#2570d4] transition-colors flex items-center gap-1"
                    >
                      <CreditCard className="w-3 h-3" />
                      Pay Now
                    </Link>
                  ) : null}
                  {/* Actions based on status */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {booking.status === 'in_progress' && booking.proof_submitted_at && (
                      <>
                        <button
                          onClick={() => handleViewProof(booking.id)}
                          className="px-2.5 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700 hover:bg-gray-200 flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          View Proof
                        </button>
                        <button
                          onClick={() => handleConfirmJob(booking.id)}
                          disabled={actionLoading === booking.id}
                          className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-600 text-white hover:bg-green-700 flex items-center gap-1 disabled:opacity-50"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {actionLoading === booking.id ? 'Processing...' : 'Confirm & Pay'}
                        </button>
                        <button
                          onClick={() => { setDisputeModal(booking.id); setDisputeReason(''); }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-50 text-red-600 hover:bg-red-100 flex items-center gap-1"
                        >
                          <ShieldAlert className="w-3 h-3" />
                          Dispute
                        </button>
                      </>
                    )}
                    {(booking.status === 'accepted' || booking.status === 'in_progress') && (
                      <Link
                        href={`/messages/${booking.id}`}
                        className="text-xs text-[#0E7480] hover:underline font-medium flex items-center gap-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        Message
                      </Link>
                    )}
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
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {booking.service_name}
                        </p>
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
              {proofModal.notes && (
                <p className="text-sm text-gray-700 mb-4 bg-gray-50 rounded-lg p-3">{proofModal.notes}</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                {(proofModal.photos || []).map((photo, i) => (
                  <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200">
                    <Image src={photo} alt={`Proof ${i + 1}`} fill className="object-cover" unoptimized />
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Submitted: {proofModal.submitted_at ? new Date(proofModal.submitted_at).toLocaleString() : 'N/A'}
              </p>
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
