'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { guestQuotesAPI } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { CheckCircle, AlertTriangle, CreditCard, ShieldCheck, Lock, ChevronDown, ChevronUp } from 'lucide-react';

export default function GuestPaymentPortalPage() {
  const { token } = useParams();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proofExpanded, setProofExpanded] = useState(false);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await guestQuotesAPI.getPortalQuote(token);
        setRequest(res.data.data.request);
      } catch (err) {
        setError(err?.response?.data?.message || 'Payment link not found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Supabase Realtime: live-update when admin sends the payment link or payment is completed
  useEffect(() => {
    if (!token) return;
    const channel = supabase
      .channel(`guest-payment-portal-${token}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'guest_quote_requests',
          filter: `public_token=eq.${token}`,
        },
        (payload) => {
          setRequest((prev) => prev ? { ...prev, ...payload.new } : payload.new);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [token]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#0E7480] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading your payment details…</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <AlertTriangle className="mx-auto mb-4 text-yellow-500" size={44} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Payment Link Not Found</h2>
          <p className="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const subtotal = parseFloat(request?.quoted_price || 0);
  const taxAmount = parseFloat(request?.tax_amount || 0);
  const total = subtotal + taxAmount;
  const taxRate = subtotal > 0 ? Math.round((taxAmount / subtotal) * 100) : 13;
  const workPrice = parseFloat(request?.pro_work_price || 0);
  const materialsTotal = parseFloat(request?.pro_materials_total || 0);

  let materialsList = [];
  if (request?.pro_materials_list) {
    try {
      materialsList = typeof request.pro_materials_list === 'string'
        ? JSON.parse(request.pro_materials_list)
        : request.pro_materials_list;
      if (!Array.isArray(materialsList)) materialsList = [];
    } catch (_) { materialsList = []; }
  }

  const isPaid = ['paid', 'completed'].includes(request?.status);
  const isCancelled = request?.status === 'cancelled';
  const hasPaymentLink = !!request?.stripe_payment_url;
  const proName = request?.pro_profiles?.business_name
    || request?.pro_profiles?.profiles?.full_name
    || 'Service Professional';

  const proofPhotos = Array.isArray(request?.proof_photos) ? request.proof_photos : [];
  const hasProof = !!request?.proof_submitted_at;

  // ── Already paid ─────────────────────────────────────────────────────────────
  if (isPaid) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <CheckCircle className="mx-auto mb-4 text-green-500" size={48} />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Payment Complete!</h2>
          <p className="text-gray-500 text-sm mb-4">
            Thank you, <strong>{request?.guest_name}</strong>! Your payment of{' '}
            <strong>${total.toFixed(2)} CAD</strong> has been received.
          </p>
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">
            Reference: <strong>{request?.request_number}</strong>
          </div>
          <p className="text-gray-400 text-xs mt-4">
            {proName} has been notified and will be in touch shortly.
          </p>
        </div>
      </div>
    );
  }

  // ── Cancelled ─────────────────────────────────────────────────────────────────
  if (isCancelled) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <AlertTriangle className="mx-auto mb-4 text-gray-400" size={44} />
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Request Cancelled</h2>
          <p className="text-gray-500 text-sm">This service request has been cancelled and is no longer active.</p>
        </div>
      </div>
    );
  }

  // ── No payment link yet ────────────────────────────────────────────────────────
  if (!hasPaymentLink) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <CreditCard className="text-[#0E7480]" size={24} />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Payment Link Coming Soon</h2>
          <p className="text-gray-500 text-sm">
            Your payment link is being prepared. You will receive an email once it is ready.
          </p>
          {request?.request_number && (
            <p className="text-xs text-gray-400 mt-3">Reference: {request.request_number}</p>
          )}
        </div>
      </div>
    );
  }

  // ── Main payment portal ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="bg-[#142841] rounded-2xl px-8 py-6 mb-6 text-center text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-300 mb-1">BridgeWork</p>
          <h1 className="text-2xl font-bold">Secure Payment</h1>
        </div>

        {/* Payment card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Summary header */}
          <div className="px-8 pt-8 pb-5 border-b border-gray-100">
            <h2 className="text-xl font-bold text-gray-900 mb-1">{request?.service_name}</h2>
            <p className="text-gray-500 text-sm">
              Hi <strong>{request?.guest_name}</strong>, please review your order and complete payment below.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Reference</p>
                <p className="text-gray-800 font-medium">{request?.request_number}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Service By</p>
                <p className="text-gray-800 font-medium">{proName}</p>
              </div>
              <div className="bg-gray-50 rounded-xl px-4 py-3 col-span-2">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Service Location</p>
                <p className="text-gray-800 font-medium">{request?.address}, {request?.city}, {request?.state}</p>
              </div>
            </div>
          </div>

          {/* Order breakdown */}
          <div className="px-8 py-6 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Order Summary</h3>
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <th className="text-left px-3 py-2 rounded-l-lg">Item</th>
                  <th className="text-right px-3 py-2 rounded-r-lg">Amount</th>
                </tr>
              </thead>
              <tbody>
                {workPrice > 0 && (
                  <tr className="border-b border-gray-50">
                    <td className="px-3 py-3 text-gray-800 font-medium">Labour</td>
                    <td className="px-3 py-3 text-right text-gray-800">${workPrice.toFixed(2)}</td>
                  </tr>
                )}
                {materialsList.map((m, i) => (
                  <tr key={i} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2 text-gray-600 pl-6">
                      <span className="text-gray-400 mr-1">•</span>{m.name || 'Material'}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-600">${parseFloat(m.price || 0).toFixed(2)}</td>
                  </tr>
                ))}
                {materialsTotal > 0 && (
                  <tr className="border-b border-gray-100">
                    <td className="px-3 py-2 text-gray-400 text-xs italic pl-3">Materials subtotal</td>
                    <td className="px-3 py-2 text-right text-gray-400 text-xs">${materialsTotal.toFixed(2)}</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="ml-auto max-w-xs space-y-2 text-sm border-t border-gray-100 pt-3">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Tax ({taxRate}% HST)</span>
                <span>${taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[#0E7480] font-bold text-lg pt-2 border-t border-gray-200">
                <span>Total Due</span>
                <span>${total.toFixed(2)} CAD</span>
              </div>
            </div>
          </div>

          {/* Proof of Work section */}
          {hasProof && (
            <div className="px-8 py-5 border-b border-gray-100">
              <button
                onClick={() => setProofExpanded(p => !p)}
                className="flex items-center justify-between w-full text-sm font-semibold text-gray-700"
              >
                <span className="flex items-center gap-2">
                  <CheckCircle size={15} className="text-green-500" />
                  Proof of Work
                </span>
                {proofExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {proofExpanded && (
                <div className="mt-3 space-y-3">
                  {request?.proof_description && (
                    <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-4 py-3">{request.proof_description}</p>
                  )}
                  {proofPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {proofPhotos.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer">
                          <img src={url} alt={`Proof ${i + 1}`} className="w-24 h-24 object-cover rounded-xl border border-gray-200 hover:opacity-80 transition-opacity" />
                        </a>
                      ))}
                    </div>
                  )}
                  {proofPhotos.length === 0 && !request?.proof_description && (
                    <p className="text-sm text-gray-500">Proof submitted by service professional.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pay Now CTA */}
          <div className="px-8 py-8">
            <a
              href={request.stripe_payment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 w-full bg-[#0E7480] hover:bg-[#0a5d68] text-white font-bold py-4 rounded-xl transition-colors text-lg shadow-sm"
            >
              <CreditCard size={22} />
              Pay ${total.toFixed(2)} CAD Now
            </a>

            {/* Trust badges */}
            <div className="flex items-center justify-center gap-6 mt-5 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <Lock size={12} />
                SSL Encrypted
              </span>
              <span className="flex items-center gap-1">
                <ShieldCheck size={12} />
                Powered by Stripe
              </span>
              <span className="flex items-center gap-1">
                <CheckCircle size={12} />
                Secure Checkout
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          © {new Date().getFullYear()} BridgeWork. All rights reserved.{' '}
          Need help?{' '}
          <a href="mailto:bridgeworkservice@gmail.com" className="underline">Contact us</a>
        </p>
      </div>
    </div>
  );
}
