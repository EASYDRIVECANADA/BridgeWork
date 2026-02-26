'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronLeft, Link as LinkIcon } from 'lucide-react';
import { toast } from 'react-toastify';

export default function InsurancePage() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const [selectedProvider, setSelectedProvider] = useState(null);

  const providers = [
    {
      id: 'belairdirect',
      name: 'belairdirect.',
      logo: null,
      textStyle: 'text-[#2D7FE6] font-bold text-lg',
    },
    {
      id: 'intact',
      name: '[intact]',
      logo: null,
      textStyle: 'text-gray-800 font-bold text-lg',
    },
  ];

  const handleLinkAccount = () => {
    if (!selectedProvider) {
      toast.error('Please select an insurance provider');
      return;
    }
    toast.info('Insurance linking functionality coming soon');
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ==================== DARK HEADER ==================== */}
      <div className="bg-[#2b2d42]">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <h1 className="text-3xl font-bold text-white mb-2">Insurance Perks</h1>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 text-[#2D7FE6] hover:text-[#5a9ff0] transition-colors text-sm"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="underline">Back to Dashboard</span>
          </Link>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="max-w-4xl mx-auto px-6 -mt-2">
        <div className="flex gap-8">
          {/* Left spacer to align with design */}
          <div className="hidden lg:block w-48 flex-shrink-0" />

          {/* Center Card */}
          <div className="flex-1 max-w-lg">
            {/* Unlock Exclusive Perks Card */}
            <div className="bg-white rounded-lg shadow-md p-8 mb-8">
              {/* Link Icon */}
              <div className="flex justify-center mb-5">
                <LinkIcon className="w-8 h-8 text-gray-300" />
              </div>

              <h2 className="text-xl font-bold text-gray-900 text-center mb-3">
                Unlock Exclusive Perks
              </h2>

              <p className="text-sm text-gray-500 text-center mb-1">
                Keep your home protected{' '}
                <span className="inline-flex items-center">
                  <svg className="w-4 h-4 text-yellow-500 mx-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2A11.954 11.954 0 0110 1.944z" clipRule="evenodd" />
                  </svg>
                </span>
                —with help from us and your insurance provider.
              </p>

              <p className="text-sm text-[#2D7FE6] text-center mb-8">
                Link your account to unlock exclusive perks.
              </p>

              {/* Select Insurance Provider */}
              <h3 className="text-sm font-semibold text-gray-900 mb-4">
                Select your Insurance Provider :
              </h3>

              <div className="flex gap-4 mb-8">
                {providers.map((provider) => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id)}
                    className={`flex-1 py-4 px-6 rounded-lg border-2 transition-all text-center ${
                      selectedProvider === provider.id
                        ? 'border-[#2D7FE6] bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className={provider.textStyle}>{provider.name}</span>
                  </button>
                ))}
              </div>

              {/* Link Button */}
              <button
                onClick={handleLinkAccount}
                className="w-full bg-[#2D7FE6] text-white py-3 rounded-full font-semibold hover:bg-[#2570d4] transition-colors flex items-center justify-center gap-2"
              >
                <LinkIcon className="w-4 h-4" />
                Link My Insurance Account
              </button>
            </div>

            {/* ==================== SPECIAL OFFERS ==================== */}
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4">Special Offers</h3>

              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-5 flex items-center gap-4">
                {/* Gold coin icon */}
                <div className="flex-shrink-0">
                  <div className="w-14 h-14 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                    <span className="text-white text-lg font-bold">$</span>
                  </div>
                  <p className="text-center text-yellow-600 text-lg font-bold mt-0.5">$50</p>
                  <p className="text-center text-yellow-600 text-[10px] font-medium">credits</p>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-0.5">Exclusive Offer</p>
                  <p className="text-sm font-bold text-gray-900">
                    Link your insurance account $50 in BridgeWork Credits
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
