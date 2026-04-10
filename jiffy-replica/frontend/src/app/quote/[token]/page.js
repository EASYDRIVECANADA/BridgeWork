'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { quotesAPI } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { CheckCircle, XCircle, Clock, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';

const STATUS_LABELS = {
  sent: 'Awaiting Response',
  viewed: 'Awaiting Response',
  accepted: 'Accepted',
  declined: 'Declined',
  expired: 'Expired',
};

export default function QuotePortalPage() {
  const { token } = useParams();

  const [quote, setQuote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state machine: 'view' | 'accepting' | 'declining' | 'submitted'
  const [step, setStep] = useState('view');

  // Accept form fields
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [zipCode, setZipCode] = useState('');
  const [preferredDate, setPreferredDate] = useState('');

  // Decline form
  const [declineReason, setDeclineReason] = useState('');

  // Result from submit
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await quotesAPI.getPortalQuote(token);
        setQuote(res.data.data.quote);
      } catch (err) {
        setError(err?.response?.data?.message || 'Quote not found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Supabase Realtime: live-update if the pro resends or the quote expires
  // Only subscribe while on the 'view' step — once submitted we don't need updates
  useEffect(() => {
    if (!token || step !== 'view') return;
    const channel = supabase
      .channel(`quote-portal-${token}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quotes',
          filter: `public_token=eq.${token}`,
        },
        (payload) => {
          setQuote((prev) => prev ? { ...prev, ...payload.new } : payload.new);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [token, step]);

  const handleAcceptSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await quotesAPI.respondToPortalQuote(token, {
        action: 'accept',
        address,
        city,
        zip_code: zipCode,
        preferred_date: preferredDate,
      });
      setResult(res.data.data);
      setStep('submitted');
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeclineSubmit = async (e) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitting(true);
    try {
      const res = await quotesAPI.respondToPortalQuote(token, {
        action: 'decline',
        decline_reason: declineReason,
      });
      setResult(res.data.data);
      setStep('submitted');
    } catch (err) {
      setSubmitError(err?.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#0E7480] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your quote…</p>
        </div>
      </div>
    );
  }

  // ── Error / not found ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={44} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Quote Not Found</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const alreadyResponded = ['accepted', 'declined', 'expired'].includes(quote?.status);

  // ── Already responded / expired ──────────────────────────────────────────────
  if (alreadyResponded && step === 'view') {
    const isAccepted = quote.status === 'accepted';
    const isExpired = quote.status === 'expired';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          {isAccepted && <CheckCircle className="mx-auto mb-4 text-green-500" size={44} />}
          {quote.status === 'declined' && <XCircle className="mx-auto mb-4 text-red-400" size={44} />}
          {isExpired && <Clock className="mx-auto mb-4 text-gray-400" size={44} />}
          <h2 className="text-xl font-semibold text-gray-800 mb-2">
            {isAccepted ? 'Quote Already Accepted' : isExpired ? 'Quote Expired' : 'Quote Already Declined'}
          </h2>
          <p className="text-gray-500 text-sm">
            {isAccepted
              ? 'You have already accepted this quote. The service professional has been notified.'
              : isExpired
              ? 'This quote has passed its validity date and is no longer available.'
              : 'You have already declined this quote.'}
          </p>
        </div>
      </div>
    );
  }

  const proName = quote?.pro_profiles?.business_name || quote?.pro_profiles?.profiles?.full_name || 'Service Professional';
  const customerName = quote?.customer?.full_name || 'Valued Customer';
  const items = quote?.quote_items || [];
  const validUntil = quote?.valid_until
    ? new Date(quote.valid_until).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  // ── Submitted success ────────────────────────────────────────────────────────
  if (step === 'submitted') {
    const accepted = result?.action === 'accepted';
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          {accepted ? (
            <>
              <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Quote Accepted!</h2>
              <p className="text-gray-600 text-sm mb-4">
                Great news, {customerName}! Your booking with <strong>{proName}</strong> has been confirmed.
              </p>
              {result?.booking_number && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl px-6 py-4 mb-6">
                  <p className="text-xs text-teal-700 font-medium uppercase tracking-wide mb-1">Booking Reference</p>
                  <p className="text-xl font-bold text-[#0E7480]">{result.booking_number}</p>
                </div>
              )}
              <p className="text-gray-500 text-xs">
                The service professional has been notified and will be in touch to confirm the details of your appointment.
              </p>
            </>
          ) : (
            <>
              <XCircle className="mx-auto mb-4 text-gray-400" size={48} />
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Quote Declined</h2>
              <p className="text-gray-500 text-sm">
                Your response has been recorded. The service professional has been notified.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Main portal view ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="bg-[#142841] rounded-2xl px-8 py-6 mb-6 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-300 mb-1">BridgeWork</p>
          <h1 className="text-2xl font-bold">Home Services You Can Trust</h1>
        </div>

        {/* Quote card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Quote meta */}
          <div className="px-8 pt-8 pb-4 border-b border-gray-100">
            <span className="inline-block text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-3 py-0.5 mb-3 uppercase tracking-wide">
              Quote Ready
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{quote.title}</h2>
            <p className="text-gray-500 text-sm mb-4">
              Hi <strong>{customerName}</strong>, your quote from <strong>{proName}</strong> is ready to review.
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Quote Number</p>
                <p className="text-gray-800 font-medium">{quote.quote_number}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Service Professional</p>
                <p className="text-gray-800 font-medium">{proName}</p>
              </div>
              {validUntil && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Valid Until</p>
                  <p className="text-gray-800 font-medium">{validUntil}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Status</p>
                <p className="text-gray-800 font-medium">{STATUS_LABELS[quote.status] || quote.status}</p>
              </div>
            </div>
          </div>

          {/* Line items */}
          <div className="px-8 py-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Quote Breakdown</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="text-left px-3 py-2 rounded-l-lg">Service / Product</th>
                  <th className="text-center px-3 py-2">Qty</th>
                  <th className="text-right px-3 py-2">Unit Cost</th>
                  <th className="text-right px-3 py-2 rounded-r-lg">Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id || i} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-3 text-gray-800 font-medium">{item.description}</td>
                    <td className="px-3 py-3 text-center text-gray-600">{item.quantity}</td>
                    <td className="px-3 py-3 text-right text-gray-600">${parseFloat(item.unit_price).toFixed(2)}</td>
                    <td className="px-3 py-3 text-right text-gray-800 font-semibold">${parseFloat(item.amount || item.unit_price * item.quantity).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="px-8 py-6 border-b border-gray-100">
            {quote.notes && (
              <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-sm text-gray-600">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Notes</p>
                <p>{quote.notes}</p>
              </div>
            )}
            <div className="ml-auto max-w-xs space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${parseFloat(quote.subtotal || 0).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax ({((quote.tax_rate || 0.13) * 100).toFixed(0)}% HST)</span>
                <span>${parseFloat(quote.tax_amount || 0).toFixed(2)}</span>
              </div>
              {parseFloat(quote.discount_amount) > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>- ${parseFloat(quote.discount_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#0E7480] font-bold text-base pt-2 border-t border-gray-200">
                <span>Quote Total</span>
                <span>${parseFloat(quote.total || 0).toFixed(2)} CAD</span>
              </div>
            </div>
          </div>

          {/* Validity notice */}
          {validUntil && (
            <div className="mx-8 my-4 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3 text-sm text-yellow-800">
              <strong>Quote Validity:</strong> This quote is valid until <strong>{validUntil}</strong>. Please review and accept before it expires.
            </div>
          )}

          {/* Action area */}
          {step === 'view' && (
            <div className="px-8 py-6 flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => setStep('accepting')}
                className="flex-1 bg-[#0E7480] hover:bg-[#0a5d68] text-white font-semibold py-3 rounded-xl transition-colors"
              >
                Accept Quote
              </button>
              <button
                onClick={() => setStep('declining')}
                className="flex-1 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-xl border border-gray-200 transition-colors"
              >
                Decline
              </button>
            </div>
          )}

          {/* Accept form */}
          {step === 'accepting' && (
            <form onSubmit={handleAcceptSubmit} className="px-8 py-6 border-t border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 mb-1">Confirm Your Details</h3>
              <p className="text-sm text-gray-500 mb-5">Please provide your service address and preferred date so the professional can prepare for your appointment.</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Service Address *</label>
                  <input
                    type="text"
                    required
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Main Street"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">City *</label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Toronto"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Postal Code</label>
                    <input
                      type="text"
                      value={zipCode}
                      onChange={(e) => setZipCode(e.target.value)}
                      placeholder="M5V 1A1"
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Preferred Service Date *</label>
                  <input
                    type="date"
                    required
                    min={today}
                    value={preferredDate}
                    onChange={(e) => setPreferredDate(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                  />
                </div>
              </div>

              {submitError && (
                <p className="text-red-500 text-sm mt-4">{submitError}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-[#0E7480] hover:bg-[#0a5d68] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {submitting ? 'Confirming…' : 'Confirm & Accept Quote'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('view'); setSubmitError(null); }}
                  className="px-5 bg-white hover:bg-gray-50 text-gray-600 font-medium py-3 rounded-xl border border-gray-200 transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}

          {/* Decline form */}
          {step === 'declining' && (
            <form onSubmit={handleDeclineSubmit} className="px-8 py-6 border-t border-gray-100">
              <h3 className="text-base font-semibold text-gray-800 mb-1">Decline This Quote</h3>
              <p className="text-sm text-gray-500 mb-5">Optionally let the professional know why you are declining.</p>

              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase mb-1">Reason (optional)</label>
                <textarea
                  rows={3}
                  value={declineReason}
                  onChange={(e) => setDeclineReason(e.target.value)}
                  placeholder="e.g. Found another provider, budget constraints, etc."
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] resize-none"
                />
              </div>

              {submitError && (
                <p className="text-red-500 text-sm mt-4">{submitError}</p>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 bg-red-500 hover:bg-red-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {submitting ? 'Submitting…' : 'Decline Quote'}
                </button>
                <button
                  type="button"
                  onClick={() => { setStep('view'); setSubmitError(null); }}
                  className="px-5 bg-white hover:bg-gray-50 text-gray-600 font-medium py-3 rounded-xl border border-gray-200 transition-colors"
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          © {new Date().getFullYear()} BridgeWork. All rights reserved.
        </p>
      </div>
    </div>
  );
}
