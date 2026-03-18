'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden text-white bg-[linear-gradient(90deg,rgba(14,116,128,1)_0%,rgba(2,75,90,1)_30%,rgba(20,40,65,1)_60%)]">
      {/* Subtle linear sheen like navbar */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-20 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.14),transparent)] opacity-80" />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(255,255,255,0.06),transparent_40%,rgba(255,255,255,0.03))] opacity-70" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 py-8 sm:py-10 lg:py-14">
        {/* Top Section - 4 Columns */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 lg:gap-12 mb-8 sm:mb-12 lg:mb-16">
          {/* Column 1: BridgeWork Jobs */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">BridgeWork Jobs</h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li>
                <Link href="/services" className="text-white/85 hover:text-white transition-colors">
                  Explore Services
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-white/85 hover:text-white transition-colors">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/pro-login" className="text-white/85 hover:text-white transition-colors">
                  Pro Login
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-white/85 hover:text-white transition-colors">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Company */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Company</h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li>
                <Link href="/about" className="text-white/85 hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-white/85 hover:text-white transition-colors">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/become-pro" className="text-white/85 hover:text-white transition-colors">
                  Become a Pro
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-3 sm:mb-4">Legal</h4>
            <ul className="space-y-2 sm:space-y-3 text-xs sm:text-sm">
              <li>
                <Link href="/terms" className="text-white/85 hover:text-white transition-colors">
                  Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/bridgework-terms" className="text-white/85 hover:text-white transition-colors">
                  BridgeWork+ Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/spending-account-terms" className="text-white/85 hover:text-white transition-colors">
                  BridgeWork+ Spending Account Terms & Conditions
                </Link>
              </li>
              <li>
                <Link href="/homeowner-protection" className="text-white/85 hover:text-white transition-colors">
                  Homeowner Protection Promise
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-white/85 hover:text-white transition-colors">
                  Privacy Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Contact Us */}
          <div>
            <h5 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Contact Us</h5>
            <Link href="/contact" className="inline-block text-white/85 hover:text-white transition-colors text-xs sm:text-sm mb-4 sm:mb-6">
              Send us a message →
            </Link>

          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 pt-6 sm:pt-8 border-t border-white/20">
          {/* Left: Logo and Copyright */}
          <div className="text-center md:text-left">
            <div className="font-brand text-xl sm:text-2xl font-extrabold italic tracking-tight">
              <span className="text-white">Bridge</span>
              <span className="text-white/85">Work</span>
            </div>

            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
              <span className="text-red-200">🍁</span>
              <span className="text-sm text-white/85 font-semibold">Proudly Canadian</span>
            </div>

            <p className="mt-3 text-sm text-white/80">© {currentYear} BridgeWork Inc.</p>
          </div>

        </div>
      </div>
    </footer>
  );
}
