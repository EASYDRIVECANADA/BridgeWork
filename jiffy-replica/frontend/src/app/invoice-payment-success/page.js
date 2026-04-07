'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

function InvoicePaymentSuccessContent() {
  const searchParams = useSearchParams();
  const invoiceNumber = searchParams.get('invoice');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-9 h-9 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful</h1>
        {invoiceNumber && (
          <p className="text-sm text-gray-500 mb-1">Invoice <span className="font-medium text-gray-700">{invoiceNumber}</span></p>
        )}
        <p className="text-gray-500 mt-2 mb-6">
          Your payment has been received. The service professional has been notified.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/dashboard/invoices"
            className="flex-1 px-4 py-2.5 bg-[#0E7480] text-white rounded-lg text-sm font-semibold hover:bg-[#0c6670] transition-colors"
          >
            View My Invoices
          </Link>
          <Link
            href="/dashboard"
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function InvoicePaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E7480]" /></div>}>
      <InvoicePaymentSuccessContent />
    </Suspense>
  );
}
