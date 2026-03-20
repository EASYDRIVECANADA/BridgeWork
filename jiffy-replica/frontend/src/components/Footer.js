'use client';

import Link from 'next/link';
import Image from 'next/image';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative overflow-hidden text-white bg-gradient-to-br from-[#0E7480] via-[#024B5A] to-[#142841]">
      {/* Modern gradient overlay */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(255,255,255,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(14,116,128,0.2),transparent_50%)]" />
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-16">
        {/* Top Section - 4 Columns */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 sm:gap-10 lg:gap-12 mb-10 sm:mb-12 lg:mb-16">
          {/* Column 1: BridgeWork Jobs */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-4 tracking-wide uppercase text-white/95">BridgeWork Jobs</h4>
            <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
              <li>
                <Link href="/services" className="text-white/80 hover:text-white hover:translate-x-0.5 transition-all duration-200 inline-block">
                  Explore Services
                </Link>
              </li>
              <li>
                <Link href="/login" className="text-white/80 hover:text-white hover:translate-x-0.5 transition-all duration-200 inline-block">
                  Login
                </Link>
              </li>
              <li>
                <Link href="/pro-login" className="text-white/80 hover:text-white hover:translate-x-0.5 transition-all duration-200 inline-block">
                  Pro Login
                </Link>
              </li>
              <li>
                <Link href="/help" className="text-white/80 hover:text-white hover:translate-x-0.5 transition-all duration-200 inline-block">
                  Help Center
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 2: Company */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-4 tracking-wide uppercase text-white/95">Company</h4>
            <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
              <li>
                <Link href="/about" className="text-white/80 hover:text-white hover:translate-x-0.5 transition-all duration-200 inline-block">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/careers" className="text-white/80 hover:text-white hover:translate-x-0.5 transition-all duration-200 inline-block">
                  Careers
                </Link>
              </li>
              <li>
                <Link href="/become-pro" className="text-white/80 hover:text-white hover:translate-x-0.5 transition-all duration-200 inline-block">
                  Become a Pro
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Legal */}
          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-4 tracking-wide uppercase text-white/95">Legal</h4>
            <ul className="space-y-2.5 sm:space-y-3 text-xs sm:text-sm">
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
            <h4 className="font-semibold text-sm sm:text-base mb-4 tracking-wide uppercase text-white/95">Contact Us</h4>
            <p className="text-xs sm:text-sm text-white/70 mb-4 leading-relaxed">
              Have a question or need help? We're here for you.
            </p>
            <Link href="/contact" className="inline-flex items-center gap-2 text-white font-semibold text-xs sm:text-sm bg-white/15 hover:bg-white/25 px-5 py-3 rounded-xl transition-all duration-200 shadow-lg shadow-black/10 hover:shadow-xl hover:-translate-y-0.5 group">
              Send us a message
              <span aria-hidden className="group-hover:translate-x-0.5 transition-transform">→</span>
            </Link>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6 pt-10 border-t border-white/10">
          {/* Left: Logo and Copyright */}
          <div className="text-center sm:text-left">
            <div className="font-brand text-xl sm:text-2xl font-extrabold italic tracking-tight">
              <span className="text-white">Bridge</span>
              <span className="text-white/85">Work</span>
            </div>
            <p className="mt-2 text-sm text-white/60">© {currentYear} BridgeWork Inc.</p>
          </div>

          {/* Right: Badge */}
          <div className="inline-flex items-center gap-2.5 rounded-full bg-white/10 backdrop-blur-sm px-5 py-2.5 ring-1 ring-white/20 shadow-lg shadow-black/5">
            <span className="text-red-300 text-lg">🍁</span>
            <span className="text-sm text-white font-semibold">Proudly Canadian</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
