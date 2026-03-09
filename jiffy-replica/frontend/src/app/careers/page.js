'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Apple } from 'lucide-react';

export default function CareersPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Hero Section with Office Background */}
      <div className="relative h-[400px] w-full">
        <Image
          src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2000"
          alt="Office Background"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/40" />
        
        {/* Hero Content */}
        <div className="relative h-full flex flex-col items-center justify-center text-center px-4">
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
            WORK WITH BridgeWork
          </h1>
          <p className="text-xl md:text-2xl text-white font-light">
            Check out our current openings below!
          </p>
        </div>
      </div>

      {/* White Content Section */}
      <div className="bg-white py-20 relative">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="min-h-[200px] flex flex-col items-center justify-center">
            <p className="text-lg text-gray-700 mb-4">
              We're always looking for talented people to <span className="text-[#0E7480] font-semibold">join our growing</span> team.
            </p>
            <Link 
              href="mailto:info@bridgework.com" 
              className="text-[#00bfff] hover:underline text-lg font-medium"
            >
              info@bridgework.com
            </Link>
          </div>
        </div>

        {/* Phone Mockups - Absolutely Positioned to Overlay */}
        <div className="absolute -bottom-64 left-8 md:left-16 flex gap-4 z-20">
          <div className="relative w-32 h-64">
            <Image
              src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=400"
              alt="App Screenshot 1"
              fill
              className="object-cover rounded-3xl"
            />
          </div>
          <div className="relative w-32 h-64">
            <Image
              src="https://images.unsplash.com/photo-1551650975-87deedd944c3?q=80&w=400"
              alt="App Screenshot 2"
              fill
              className="object-cover rounded-3xl"
            />
          </div>
        </div>
      </div>

      {/* Dark Footer Section with App Download */}
      <div className="bg-[#2a2a2a] py-6 pt-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-3 gap-8 items-center">

            {/* Left: Empty space for overlaid phones */}
            <div></div>

            {/* Center: Download Text and Icons */}
            <div className="text-center">
              <h2 className="text-white text-xl font-semibold mb-2">
                Download the app
              </h2>
              <p className="text-white text-sm mb-6">
                on Apple or Android:
              </p>
              <div className="flex justify-center gap-6">
                {/* Apple Icon */}
                <Link 
                  href="#" 
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <Apple className="w-8 h-8 text-gray-900" />
                </Link>
                {/* Android Icon */}
                <Link 
                  href="#" 
                  className="w-16 h-16 bg-white rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
                >
                  <svg className="w-8 h-8 text-gray-900" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4483-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4483.9993.9993 0 .5511-.4483.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1521-.5676.416.416 0 00-.5676.1521l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1367 1.0989L4.841 5.4467a.4161.4161 0 00-.5677-.1521.4157.4157 0 00-.1521.5676l1.9973 3.4592C2.6889 11.1867.3432 14.6589 0 18.761h24c-.3435-4.1021-2.6892-7.5743-6.1185-9.4396"/>
                  </svg>
                </Link>
              </div>
            </div>

            {/* Right: Mascot Character */}
            <div className="flex justify-center md:justify-end">
              <div className="relative w-48 h-48">
                <Image
                  src="https://images.unsplash.com/photo-1589254065878-42c9da997008?q=80&w=400"
                  alt="BridgeWork Mascot"
                  fill
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
