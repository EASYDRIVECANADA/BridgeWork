'use client';

import { useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { toast } from 'react-toastify';

export default function CreditsPage() {
  const router = useRouter();
  const { user } = useSelector((state) => state.auth);
  const [promoCode, setPromoCode] = useState('');
  const [referralEmail, setReferralEmail] = useState('');

  const handleAddPromo = () => {
    if (!promoCode.trim()) {
      toast.error('Please enter a promo code');
      return;
    }
    toast.info('Promo code functionality coming soon');
    setPromoCode('');
  };

  const handleSendReferral = () => {
    if (!referralEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }
    toast.info('Referral functionality coming soon');
    setReferralEmail('');
  };

  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ==================== DARK HEADER ==================== */}
      <div className="bg-[#2b2d42]">
        <div className="max-w-4xl mx-auto px-6 pt-10 pb-0">
          <div className="flex items-center justify-between border-b border-gray-600">
            <h1 className="text-3xl font-bold text-white pb-4">Credits</h1>
            <div className="flex items-center gap-8">
              <Link
                href="/profile/edit"
                className="text-gray-400 hover:text-white pb-4 transition-colors"
              >
                Edit Profile
              </Link>
              <Link
                href="/credits"
                className="text-[#0E7480] pb-4 border-b-2 border-[#0E7480] font-medium"
              >
                Credits
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== AVAILABLE CREDITS CARD ==================== */}
      <div className="bg-[#2b2d42] pb-16">
        <div className="max-w-4xl mx-auto px-6 flex justify-center pt-10">
          <div className="bg-white rounded-lg shadow-lg px-16 py-8 text-center">
            <h2 className="text-xs font-bold tracking-[0.2em] text-gray-700 mb-4">
              AVAILABLE BRIDGEWORK CREDITS
            </h2>
            <div className="flex items-center justify-center gap-2 mb-2">
              {/* Gold dollar coin icon */}
              <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-bold">$</span>
              </div>
              <span className="text-5xl font-light text-gray-700">$0</span>
            </div>
            <div className="flex items-center justify-center gap-1 text-sm">
              {/* Coupon tag icon */}
              <svg className="w-4 h-4 text-[#0E7480]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
              </svg>
              <span className="text-[#0E7480]">Coupons:</span>
              <span className="text-[#0E7480]">0</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MAIN CONTENT ==================== */}
      <div className="max-w-4xl mx-auto px-6 -mt-6">
        {/* ==================== PROMO CODE SECTION ==================== */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter Promo Code"
              className="flex-1 px-4 py-2.5 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent text-gray-700 text-sm"
              onKeyPress={(e) => e.key === 'Enter' && handleAddPromo()}
            />
            <button
              onClick={handleAddPromo}
              className="bg-[#0E7480] text-white px-8 py-2.5 rounded-md hover:bg-[#2570d4] transition-colors font-medium text-sm"
            >
              Add
            </button>
          </div>
        </div>

        {/* ==================== COUPONS + SHARE & SAVE ==================== */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          {/* Coupons Card */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h3 className="text-xs font-bold tracking-[0.2em] text-gray-900 text-center mb-3">
              COUPONS
            </h3>
            <p className="text-sm text-orange-500 text-center mb-6">
              Only one coupon is valid per job request. Discount is not applied until the job has been booked.
            </p>
            <hr className="border-gray-200" />
            {/* Empty state - no coupons */}
          </div>

          {/* Share + Save Card */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            {/* Share + Save Banner Image */}
            <div className="relative h-48 bg-gradient-to-r from-[#f5d5b8] to-[#e8c4a0] flex items-center justify-center overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1521791136064-7986c2920216?q=80&w=600"
                alt="Share and Save"
                fill
                className="object-cover opacity-30"
              />
              <div className="relative z-10 text-center">
                <p className="text-4xl font-black text-orange-500 leading-none">SHARE</p>
                <p className="text-3xl font-black text-orange-400 leading-none">+</p>
                <p className="text-4xl font-black text-orange-500 leading-none">SAVE</p>
              </div>
              {/* Decorative hand illustrations */}
              <div className="absolute right-4 top-4 z-10">
                <svg className="w-16 h-16 text-gray-800 opacity-60" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.5 3.5c-1.1 0-2.1.4-2.8 1.1L12 8.3 8.3 4.6C7.6 3.9 6.6 3.5 5.5 3.5 3.6 3.5 2 5.1 2 7c0 1 .4 1.9 1.1 2.6L12 18.4l8.9-8.9c.7-.7 1.1-1.6 1.1-2.6 0-1.9-1.6-3.4-3.5-3.4z"/>
                </svg>
              </div>
            </div>

            {/* Referral Content */}
            <div className="p-6">
              <h3 className="text-sm font-bold tracking-wide text-gray-900 text-center mb-2">
                GET $25 WHEN YOU REFER A FRIEND
              </h3>
              <p className="text-sm text-gray-500 text-center mb-6">
                Refer a friend to BridgeWork and you&apos;ll both get $25 when they finish their first BridgeWork job
              </p>

              {/* Email Input */}
              <input
                type="email"
                value={referralEmail}
                onChange={(e) => setReferralEmail(e.target.value)}
                placeholder="Enter friend's email"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent text-gray-700 text-sm mb-3"
                onKeyPress={(e) => e.key === 'Enter' && handleSendReferral()}
              />

              {/* Send Button */}
              <button
                onClick={handleSendReferral}
                className="w-full bg-[#0E7480] text-white py-3 rounded-md hover:bg-[#2570d4] transition-colors font-semibold text-sm"
              >
                Send
              </button>

              {/* Referral Code */}
              <div className="mt-6 text-center">
                <h4 className="text-sm font-bold tracking-wide text-gray-900 mb-2">
                  SHARE YOUR REFERRAL CODE
                </h4>
                <div className="inline-block border-2 border-dashed border-gray-300 rounded-md px-6 py-2">
                  <span className="text-sm font-semibold text-gray-700">
                    {user?.email?.split('@')[0] || 'bridgework'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ==================== WAYS TO SAVE SECTION ==================== */}
        <div className="mb-12">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Ways to Save with BridgeWork</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Schedule & Save Card */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-purple-700 to-purple-900 p-6 min-h-[200px] flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-bold tracking-[0.2em] text-green-300 mb-4">
                  SCHEDULE & SAVE
                </h3>
                {/* Circular arrows icon */}
                <div className="w-20 h-20 mx-auto mb-4 opacity-80">
                  <svg viewBox="0 0 100 100" className="w-full h-full">
                    <circle cx="50" cy="50" r="35" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="6"/>
                    <path d="M50 15 A35 35 0 0 1 85 50" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                    <polygon points="82,38 92,50 82,50" fill="white"/>
                    <path d="M50 85 A35 35 0 0 1 15 50" fill="none" stroke="white" strokeWidth="6" strokeLinecap="round"/>
                    <polygon points="18,62 8,50 18,50" fill="white"/>
                  </svg>
                </div>
              </div>
              <div className="text-center">
                <p className="text-white font-semibold text-sm mb-4">
                  Schedule a reminder and save $15 on repeat jobs.
                </p>
                <button className="bg-white text-gray-900 px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors">
                  Learn more
                </button>
              </div>
            </div>

            {/* Get $40 for $25 Card */}
            <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-orange-500 to-red-600 p-6 min-h-[200px] flex flex-col justify-between">
              <div className="text-center">
                {/* Dollar icon and $40 */}
                <div className="flex items-center justify-center gap-2 mb-2">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-300 to-yellow-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-xl font-bold">$</span>
                  </div>
                  <span className="text-5xl font-bold text-white">$40</span>
                </div>
                <h3 className="text-white font-bold text-lg mb-1">
                  Get your job for less!
                </h3>
                <p className="text-white/90 text-sm mb-6">
                  Get $40 off your next 2 jobs if you pay $25 now
                </p>
              </div>
              <div className="text-center">
                <button className="bg-white text-gray-900 px-6 py-2 rounded-md text-sm font-medium hover:bg-gray-100 transition-colors">
                  Buy $40 for $25
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
