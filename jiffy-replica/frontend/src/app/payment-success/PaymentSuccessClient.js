'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { bookingsAPI, paymentsAPI } from '@/lib/api';
import {
  CheckCircle,
  Calendar,
  Clock,
  MapPin,
  MessageSquare,
  Home,
  Loader2,
  ArrowRight,
} from 'lucide-react';

export default function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, authInitialized } = useSelector((state) => state.auth);
  const bookingId = searchParams.get('booking_id');
  const paymentIntentId = searchParams.get('payment_intent');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Wait for auth to initialize before making any decisions
    if (!authInitialized) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (!bookingId) {
      router.push('/dashboard');
      return;
    }

    const fetchBooking = async () => {
      // Confirm payment with backend (updates transaction + booking status)
      // This is a fallback for when Stripe webhooks don't fire (e.g. local dev)
      if (paymentIntentId && bookingId) {
        try {
          await paymentsAPI.confirmPayment({
            payment_intent_id: paymentIntentId,
            booking_id: bookingId,
          });
          console.log('[PAYMENT-SUCCESS] Payment confirmed via API');
        } catch (err) {
          // Not critical — webhook may have already handled it
          console.log('[PAYMENT-SUCCESS] Confirm payment fallback:', err?.response?.status, err?.message);
        }
      }

      try {
        const res = await bookingsAPI.getById(bookingId);
        setBooking(res.data.data.booking);
      } catch (err) {
        console.error('[PAYMENT-SUCCESS] Error fetching booking:', err);
      }
      setLoading(false);
    };

    fetchBooking();
  }, [user, authInitialized, bookingId, paymentIntentId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Success Card */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 text-center">
          {/* Success Icon */}
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>

          <h1 className="text-xl font-bold text-gray-900 mb-2">Payment Authorized!</h1>
          <p className="text-sm text-gray-600 mb-6">
            Your funds are being held securely. You will <strong>not</strong> be charged until you confirm the job is complete. If no pro accepts or you dispute the job, your funds will be returned.
          </p>

          {/* Booking Details */}
          {booking && (
            <div className="bg-gray-50 rounded-lg p-4 text-left mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{booking.service_name}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    {booking.scheduled_date
                      ? new Date(booking.scheduled_date + 'T00:00:00').toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })
                      : 'Date TBD'}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Clock className="w-3.5 h-3.5 text-gray-400" />
                  <span>
                    {booking.scheduled_time
                      ? new Date(`2000-01-01T${booking.scheduled_time}`).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                          hour12: true,
                        })
                      : 'Time TBD'}
                  </span>
                </div>
                <div className="flex items-start gap-2 text-xs text-gray-600">
                  <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" />
                  <span>
                    {booking.address}, {booking.city}, {booking.state} {booking.zip_code}
                  </span>
                </div>
              </div>
              <div className="border-t border-gray-200 mt-3 pt-3 flex justify-between">
                <span className="text-sm font-semibold text-gray-900">Total Paid</span>
                <span className="text-sm font-bold text-blue-600">
                  ${parseFloat(booking.total_price || 0).toFixed(2)} (held)
                </span>
              </div>
            </div>
          )}

          {/* Booking Number */}
          {booking?.booking_number && (
            <p className="text-xs text-gray-500 mb-6">
              Booking Reference: <span className="font-mono font-semibold">{booking.booking_number}</span>
            </p>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {booking && (
              <Link
                href="/my-jobs"
                className="w-full bg-[#0E7480] text-white py-3 rounded-lg font-semibold hover:bg-[#2570d4] transition-colors text-sm flex items-center justify-center gap-2"
              >
                View My Jobs
                <ArrowRight className="w-4 h-4" />
              </Link>
            )}
            <Link
              href="/dashboard"
              className="w-full bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Home className="w-4 h-4" />
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-center text-xs text-gray-500 mt-4">
          Need help? <Link href="/help" className="text-[#0E7480] hover:underline">Contact Support</Link>
        </p>
      </div>
    </div>
  );
}
