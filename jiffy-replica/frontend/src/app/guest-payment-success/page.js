'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Link from 'next/link';
import { CheckCircle } from 'lucide-react';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const requestNumber = searchParams.get('request');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h1>
        <p className="text-gray-600 mb-4">
          Thank you for your payment. Your transaction has been completed successfully.
        </p>
        {requestNumber && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-500">Reference Number</p>
            <p className="text-lg font-bold text-[#0E7480]">{requestNumber}</p>
          </div>
        )}
        <p className="text-sm text-gray-500 mb-6">
          You will receive an invoice via email shortly. If you have any questions, please contact us.
        </p>
        <Link
          href="/"
          className="inline-block bg-[#0E7480] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#0d6670] transition-colors"
        >
          Back to Home
        </Link>
      </div>
    </div>
  );
}

export default function GuestPaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0E7480]" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
