'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { guestQuotesAPI } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { CheckCircle, AlertTriangle, Clock, ArrowRight, ClipboardList, Wrench, ShieldCheck, DollarSign } from 'lucide-react';

const STATUS_LABELS = {
  pending: 'Pending Review',
  quoted: 'Quote Ready',
  payment_sent: 'Payment Link Sent',
  paid: 'Paid',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function GuestQuotePortalPage() {
  const { token } = useParams();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        const res = await guestQuotesAPI.getPortalQuote(token);
        setRequest(res.data.data.request);
      } catch (err) {
        setError(err?.response?.data?.message || 'Quote not found.');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  // Supabase Realtime: live-update when admin changes the quote status / sends payment link
  useEffect(() => {
    if (!token) return;
    const channel = supabase
      .channel(`guest-quote-portal-${token}`)
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

  const proName = request?.pro_profiles?.business_name
    || request?.pro_profiles?.profiles?.full_name
    || null;

  const subtotal = parseFloat(request?.quoted_price || 0);
  const taxAmount = parseFloat(request?.tax_amount || 0);
  const total = subtotal + taxAmount;
  const taxRate = subtotal > 0 ? Math.round((taxAmount / subtotal) * 100) : 13;
  const workPrice = parseFloat(request?.pro_work_price || 0);
  const materialsTotal = parseFloat(request?.pro_materials_total || 0);

  // Status steps for the timeline
  const steps = [
    {
      key: 'received',
      label: 'Quote Received',
      icon: ClipboardList,
      done: true,
    },
    {
      key: 'pro_assigned',
      label: 'Pro Assigned',
      icon: ShieldCheck,
      done: ['pro_assigned','pro_quoted','quoted','proof_submitted','payment_sent','paid','completed'].includes(request?.status),
    },
    {
      key: 'work',
      label: 'Work In Progress',
      icon: Wrench,
      done: ['proof_submitted','payment_sent','paid','completed'].includes(request?.status),
      active: ['pro_assigned','pro_quoted','quoted'].includes(request?.status),
    },
    {
      key: 'proof',
      label: 'Proof Submitted',
      icon: CheckCircle,
      done: ['proof_submitted','payment_sent','paid','completed'].includes(request?.status),
    },
    {
      key: 'payment',
      label: 'Payment Ready',
      icon: DollarSign,
      done: ['payment_sent','paid','completed'].includes(request?.status),
    },
  ];

  const hasPaymentLink = !!request?.stripe_payment_url;
  const isPaid = ['paid', 'completed'].includes(request?.status);
  const isCancelled = request?.status === 'cancelled';
  const isProofSubmitted = request?.status === 'proof_submitted';
  const isPaymentSent = request?.status === 'payment_sent';
  const isPending = ['pending'].includes(request?.status);

  // Parse materials list safely
  let materialsList = [];
  if (request?.pro_materials_list) {
    try {
      materialsList = typeof request.pro_materials_list === 'string'
        ? JSON.parse(request.pro_materials_list)
        : request.pro_materials_list;
      if (!Array.isArray(materialsList)) materialsList = [];
    } catch (_) { materialsList = []; }
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

        {/* Status banner */}
        {isPaid && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-5 flex items-center gap-3">
            <CheckCircle className="text-green-500 shrink-0" size={22} />
            <p className="text-green-800 text-sm font-medium">Payment received — your service is confirmed!</p>
          </div>
        )}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-5 flex items-center gap-3">
            <AlertTriangle className="text-red-400 shrink-0" size={22} />
            <p className="text-red-800 text-sm font-medium">This quote request has been cancelled.</p>
          </div>
        )}
        {isPending && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-5 py-4 mb-5 flex items-center gap-3">
            <Clock className="text-yellow-500 shrink-0" size={22} />
            <p className="text-yellow-800 text-sm font-medium">Your request is being reviewed. A quote will be sent to you shortly.</p>
          </div>
        )}

        {/* Quote card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Meta */}
          <div className="px-8 pt-8 pb-5 border-b border-gray-100">
            <span className="inline-block text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-3 py-0.5 mb-3 uppercase tracking-wide">
              {STATUS_LABELS[request?.status] || request?.status}
            </span>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">{request?.service_name}</h2>
            <p className="text-gray-500 text-sm mb-4">
              Hi <strong>{request?.guest_name}</strong>, here is the details of your quote request.
            </p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Request Number</p>
                <p className="text-gray-800 font-medium">{request?.request_number}</p>
              </div>
              {proName && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Service Professional</p>
                  <p className="text-gray-800 font-medium">{proName}</p>
                </div>
              )}
              <div className="bg-gray-50 rounded-xl px-4 py-3">
                <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Location</p>
                <p className="text-gray-800 font-medium">{request?.address}, {request?.city}</p>
              </div>
              {request?.preferred_date && (
                <div className="bg-gray-50 rounded-xl px-4 py-3">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Preferred Date</p>
                  <p className="text-gray-800 font-medium">
                    {new Date(request.preferred_date).toLocaleDateString('en-CA', { month: 'long', day: 'numeric', year: 'numeric' })}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {request?.description && (
            <div className="px-8 py-5 border-b border-gray-100">
              <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Your Request</p>
              <p className="text-gray-700 text-sm">{request.description}</p>
            </div>
          )}

          {/* Pricing — only show if a quote has been set */}
          {subtotal > 0 && (
            <div className="px-8 py-6 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Quote Breakdown</h3>

              {/* Service Description */}
              {request?.pro_quote_description && (
                <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 text-sm text-gray-600">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Service Description</p>
                  <p>{request.pro_quote_description}</p>
                </div>
              )}

              {/* Line items table */}
              <table className="w-full text-sm mb-4">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 text-xs uppercase">
                    <th className="text-left px-3 py-2 rounded-l-lg">Item</th>
                    <th className="text-right px-3 py-2 rounded-r-lg">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Labour row */}
                  {workPrice > 0 && (
                    <tr className="border-b border-gray-50">
                      <td className="px-3 py-3 text-gray-800 font-medium">Labour</td>
                      <td className="px-3 py-3 text-right text-gray-800">${workPrice.toFixed(2)}</td>
                    </tr>
                  )}
                  {/* Individual material rows */}
                  {materialsList.map((m, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0">
                      <td className="px-3 py-2 text-gray-600 pl-6">
                        <span className="text-gray-400 mr-1">•</span>{m.name || 'Material'}
                      </td>
                      <td className="px-3 py-2 text-right text-gray-600">${parseFloat(m.price || 0).toFixed(2)}</td>
                    </tr>
                  ))}
                  {/* Materials subtotal row if there are materials */}
                  {materialsTotal > 0 && (
                    <tr className="border-b border-gray-100">
                      <td className="px-3 py-2 text-gray-500 text-xs italic pl-3">Materials subtotal</td>
                      <td className="px-3 py-2 text-right text-gray-500 text-xs">${materialsTotal.toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals */}
              <div className="ml-auto max-w-xs space-y-2 text-sm border-t border-gray-100 pt-3">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Tax ({taxRate}% HST)</span>
                  <span>${taxAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#0E7480] font-bold text-base pt-2 border-t border-gray-200">
                  <span>Total</span>
                  <span>${total.toFixed(2)} CAD</span>
                </div>
              </div>
            </div>
          )}

          {/* Pro additional details */}
          {(request?.pro_estimated_duration || request?.pro_warranty_info || request?.pro_notes) && (
            <div className="px-8 py-5 border-b border-gray-100 grid grid-cols-2 gap-4 text-sm">
              {request?.pro_estimated_duration && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Estimated Duration</p>
                  <p className="text-gray-700">{request.pro_estimated_duration} min</p>
                </div>
              )}
              {request?.pro_warranty_info && (
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Warranty</p>
                  <p className="text-gray-700">{request.pro_warranty_info}</p>
                </div>
              )}
              {request?.pro_notes && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Notes from Pro</p>
                  <p className="text-gray-700">{request.pro_notes}</p>
                </div>
              )}
            </div>
          )}

          {/* Pay Now CTA */}
          <div className="px-8 py-6">

            {/* Status timeline */}
            {!isCancelled && (
              <div className="mb-6">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-4">Request Progress</h3>
                <div className="flex flex-col gap-3">
                  {steps.map((step) => {
                    const Icon = step.icon;
                    return (
                      <div key={step.key} className={`flex items-center gap-3 text-sm ${
                        step.done ? 'text-green-700' : step.active ? 'text-[#0E7480] font-semibold' : 'text-gray-400'
                      }`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          step.done ? 'bg-green-100' : step.active ? 'bg-teal-50 ring-2 ring-[#0E7480]' : 'bg-gray-100'
                        }`}>
                          <Icon size={14} />
                        </div>
                        <span>{step.label}</span>
                        {step.active && <span className="ml-auto text-xs text-[#0E7480] bg-teal-50 border border-teal-200 rounded-full px-2 py-0.5">Current</span>}
                        {step.done && <CheckCircle size={14} className="ml-auto text-green-500" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Status-specific messages */}
            {['pro_assigned','pro_quoted','quoted'].includes(request?.status) && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-5 py-4 text-sm text-blue-800">
                <p className="font-medium mb-1">Work is in progress</p>
                <p className="text-blue-600 text-xs">Once the job is complete, your service professional will submit proof of work. You will then receive a payment link by email.</p>
              </div>
            )}

            {isProofSubmitted && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-5 py-4 text-sm text-indigo-800">
                <p className="font-medium mb-1">Proof submitted — awaiting payment link</p>
                <p className="text-indigo-600 text-xs">The work is done. Our team is reviewing the proof and will send your payment link shortly.</p>
              </div>
            )}

            {isPaymentSent && hasPaymentLink && !isPaid && (
              <div className="mt-2">
                <p className="text-sm text-gray-500 mb-4 text-center">Your payment link is ready. Click below to complete your payment securely.</p>
                <a
                  href={request.stripe_payment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full bg-[#0E7480] hover:bg-[#0a5d68] text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  Complete Payment — ${total.toFixed(2)} CAD
                  <ArrowRight size={16} />
                </a>
                <p className="text-xs text-gray-400 text-center mt-3">Secure payment powered by Stripe</p>
              </div>
            )}

            {isPaid && (
              <div className="text-center">
                <CheckCircle className="mx-auto mb-2 text-green-500" size={36} />
                <p className="text-green-700 font-semibold">Payment Complete</p>
                <p className="text-gray-500 text-sm mt-1">Thank you! Your service is confirmed.</p>
              </div>
            )}

            {isCancelled && (
              <p className="text-center text-gray-500 text-sm">This request is no longer active.</p>
            )}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8">
          © {new Date().getFullYear()} BridgeWork. All rights reserved.
          {' '}Need help?{' '}
          <a href="mailto:bridgeworkservice@gmail.com" className="underline">Contact us</a>
        </p>
      </div>
    </div>
  );
}
