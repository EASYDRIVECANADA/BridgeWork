'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector } from 'react-redux';
import Link from 'next/link';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { bookingsAPI, paymentsAPI, settingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Shield,
  Lock,
  CreditCard,
  Calendar,
  Clock,
  MapPin,
  Loader2,
  CheckCircle,
  Tag,
  Receipt,
} from 'lucide-react';

const stripePromise = loadStripe(
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_placeholder'
);

function CheckoutForm({ booking, clientSecret, paymentIntentId }) {
  const stripe = useStripe();
  const elements = useElements();
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) return;

    setProcessing(true);
    setError(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        setError(submitError.message);
        setProcessing(false);
        return;
      }

      const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success?booking_id=${booking.id}`,
        },
      });

      if (confirmError) {
        setError(confirmError.message);
        setProcessing(false);
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <CreditCard className="w-4 h-4" />
          Payment Details
        </h3>
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <PaymentElement
            options={{
              layout: 'tabs',
            }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-[#0E7480] text-white py-3 rounded-lg font-semibold hover:bg-[#2570d4] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing Payment...
          </>
        ) : (
          <>
            <Lock className="w-4 h-4" />
            Pay ${(booking.updated_total_price || booking.total_price)?.toFixed(2) || '0.00'}
          </>
        )}
      </button>

      <div className="flex items-center justify-center gap-2 text-xs text-gray-500">
        <Shield className="w-3.5 h-3.5" />
        <span>Secured by Stripe. Your payment info is encrypted.</span>
      </div>
    </form>
  );
}

export default function CheckoutClient() {
  const params = useParams();
  const router = useRouter();
  const { user, authInitialized } = useSelector((state) => state.auth);
  const bookingId = params.bookingId;

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clientSecret, setClientSecret] = useState(null);
  const [paymentIntentId, setPaymentIntentId] = useState(null);
  const [creatingIntent, setCreatingIntent] = useState(false);
  const [taxRate, setTaxRate] = useState(13); // Default 13%, fetched from API
  const fetchedRef = useRef(false);

  // Fetch booking details — only once, with retry logic for database replication lag
  useEffect(() => {
    if (!authInitialized) return;

    if (!user) {
      router.push('/login');
      return;
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    // Fetch tax rate for display
    const fetchTaxRate = async () => {
      try {
        const res = await settingsAPI.getTaxRate('quote');
        const rate = res.data?.data?.tax_rate;
        if (rate !== undefined) {
          setTaxRate(rate);
        }
      } catch (err) {
        console.error('Failed to fetch tax rate:', err);
      }
    };

    const fetchBooking = async (retries = 3, delay = 800) => {
      try {
        const res = await bookingsAPI.getById(bookingId);
        const bookingData = res.data.data.booking;
        setBooking(bookingData);
        fetchTaxRate(); // Fetch tax rate for display

        // Allow payment for pending, accepted, or proof_submitted bookings
        // proof_submitted = new flow where customer pays AFTER reviewing proof
        if (!['pending', 'accepted', 'proof_submitted'].includes(bookingData.status)) {
          toast.info('This booking has already been processed.');
          router.push('/dashboard');
          return;
        }

        // Check if already paid/held
        const alreadyPaid = bookingData.transactions?.some(
          t => t.status === 'succeeded' || t.status === 'held'
        );
        if (alreadyPaid) {
          toast.info('Payment has already been made for this booking.');
          router.push('/dashboard');
          return;
        }

        // Create payment intent
        setCreatingIntent(true);
        try {
          const payRes = await paymentsAPI.createIntent({ booking_id: bookingId });
          setClientSecret(payRes.data.data.client_secret);
          setPaymentIntentId(payRes.data.data.payment_intent_id);
        } catch (payErr) {
          console.error('[CHECKOUT] Payment intent error:', payErr.response?.data || payErr.message);
          // If booking must be accepted first, show info message
          if (payErr.response?.status === 400) {
            toast.info(payErr.response?.data?.message || 'Payment not available yet for this booking.');
          } else {
            toast.error('Failed to initialize payment. Please try again.');
          }
        }
        setCreatingIntent(false);
        setLoading(false);
      } catch (err) {
        console.error('[CHECKOUT] Fetch booking error:', err);
        
        // Retry logic for 404 errors (database replication lag) or network errors
        if (retries > 0 && (err.response?.status === 404 || !err.response)) {
          console.log(`[CHECKOUT] Booking not found, retrying in ${delay}ms... (${retries} retries left)`);
          await new Promise(resolve => setTimeout(resolve, delay));
          return fetchBooking(retries - 1, Math.min(delay * 1.5, 3000));
        }
        
        // After all retries failed
        toast.error('Booking not found. Please check your bookings in the dashboard.');
        router.push('/dashboard');
        setLoading(false);
      }
    };

    fetchBooking();
  }, [user, authInitialized, bookingId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0E7480] mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const stripeAppearance = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#0E7480',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      borderRadius: '8px',
    },
    rules: {
      '.Input': {
        border: '1px solid #d1d5db',
        boxShadow: 'none',
        padding: '10px 12px',
      },
      '.Input:focus': {
        border: '1px solid #0E7480',
        boxShadow: '0 0 0 1px #0E7480',
      },
      '.Label': {
        fontWeight: '500',
        fontSize: '14px',
        marginBottom: '6px',
      },
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Checkout</h1>
            <p className="text-xs text-gray-500">Booking #{booking.booking_number}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-8">
          {/* Left: Payment Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-base font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Lock className="w-4 h-4 text-[#0E7480]" />
                Secure Payment
              </h2>

              {creatingIntent ? (
                <div className="text-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0E7480] mx-auto mb-3" />
                  <p className="text-sm text-gray-600">Preparing payment...</p>
                </div>
              ) : clientSecret ? (
                <Elements
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    appearance: stripeAppearance,
                  }}
                >
                  <CheckoutForm
                    booking={booking}
                    clientSecret={clientSecret}
                    paymentIntentId={paymentIntentId}
                  />
                </Elements>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-1">Payment Not Available Yet</h3>
                  <p className="text-xs text-gray-600 mb-4">
                    Your booking needs to be accepted by a pro before payment can be processed.
                    We&apos;ll notify you when it&apos;s ready.
                  </p>
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 text-sm text-[#0E7480] hover:underline"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Dashboard
                  </Link>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className="mt-6 grid grid-cols-3 gap-4">
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <Shield className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-700">Secure Payment</p>
                <p className="text-[10px] text-gray-500">256-bit SSL encryption</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-700">Money-Back Guarantee</p>
                <p className="text-[10px] text-gray-500">If service not delivered</p>
              </div>
              <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                <Lock className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-xs font-medium text-gray-700">Powered by Stripe</p>
                <p className="text-[10px] text-gray-500">PCI-DSS compliant</p>
              </div>
            </div>
          </div>

          {/* Right: Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-8">
              <h2 className="text-base font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#0E7480]" />
                Order Summary
              </h2>

              {/* Service Info */}
              <div className="mb-4">
                <h3 className="text-sm font-semibold text-gray-900">{booking.service_name}</h3>
                {booking.service_description && (
                  <p className="text-xs text-gray-600 mt-1 line-clamp-2">{booking.service_description}</p>
                )}
              </div>

              {/* Booking Details */}
              <div className="space-y-2 mb-4">
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

              {/* Pro Info */}
              {booking.pro_profiles && (
                <div className="border-t border-gray-200 pt-3 mb-4">
                  <p className="text-xs text-gray-500 mb-1">Assigned Pro</p>
                  <p className="text-sm font-medium text-gray-900">
                    {booking.pro_profiles.business_name ||
                      booking.pro_profiles.profiles?.full_name ||
                      'Pending Assignment'}
                  </p>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="border-t border-gray-200 pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Fee</span>
                  <span className="text-gray-900">${parseFloat(booking.base_price || 0).toFixed(2)}</span>
                </div>
                {parseFloat(booking.discount || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600 flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      Discount
                    </span>
                    <span className="text-green-600">-${parseFloat(booking.discount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax ({taxRate}%)</span>
                  <span className="text-gray-900">${parseFloat(booking.tax || 0).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between">
                  <span className="text-base font-bold text-gray-900">Total</span>
                  <span className="text-base font-bold text-gray-900">
                    ${parseFloat(booking.updated_total_price || booking.total_price || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Special Instructions */}
              {booking.special_instructions && (
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <p className="text-xs text-gray-500 mb-1">Special Instructions</p>
                  <p className="text-xs text-gray-700">{booking.special_instructions}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
