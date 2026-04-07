'use client';

import Image from 'next/image';
import Link from 'next/link';

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
              href="mailto:bridgeworkservice@gmail.com" 
              className="text-[#00bfff] hover:underline text-lg font-medium"
            >
              bridgeworkservice@gmail.com
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
