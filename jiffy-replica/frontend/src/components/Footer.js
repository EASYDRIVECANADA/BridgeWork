'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Facebook, Instagram } from 'lucide-react';

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

      <div className="relative max-w-7xl mx-auto px-4 py-14">
        {/* Top Section - 4 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          {/* Column 1: BridgeWork Jobs */}
          <div>
            <h4 className="font-semibold mb-4">BridgeWork Jobs</h4>
            <ul className="space-y-3 text-sm">
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
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-3 text-sm">
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
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm">
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
            <h5 className="font-semibold mb-3">Contact Us</h5>
            <Link href="/contact" className="inline-block text-white/85 hover:text-white transition-colors text-sm mb-6">
              Send us a message →
            </Link>

            {/* Social Media */}
            <div className="mb-6">
              <h5 className="font-semibold mb-3">Follow BridgeWork</h5>
              <div className="flex gap-4">
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center hover:bg-white transition-all duration-200 shadow-sm ring-1 ring-black/5 hover:-translate-y-0.5"
                >
                  <Facebook className="w-5 h-5 text-[#142841]" />
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-10 h-10 bg-white/95 rounded-full flex items-center justify-center hover:bg-white transition-all duration-200 shadow-sm ring-1 ring-black/5 hover:-translate-y-0.5"
                >
                  <Instagram className="w-5 h-5 text-[#142841]" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 pt-8 border-t border-white/20">
          {/* Left: Logo and Copyright */}
          <div>
            <div className="font-brand text-2xl font-extrabold italic tracking-tight">
              <span className="text-white">Bridge</span>
              <span className="text-white/85">Work</span>
            </div>

            <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">
              <span className="text-red-200">🍁</span>
              <span className="text-sm text-white/85 font-semibold">Proudly Canadian</span>
            </div>

            <p className="mt-3 text-sm text-white/80">© {currentYear} BridgeWork Inc.</p>
          </div>

          {/* Right: App Download Buttons */}
          <div>
            <p className="text-sm font-semibold mb-3 text-center md:text-right">Download the app</p>
            <div className="flex gap-3">
              <a 
                href="https://apps.apple.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <Image
                  src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg"
                  alt="Download on App Store"
                  width={135}
                  height={40}
                  className="h-10 w-auto"
                />
              </a>
              <a 
                href="https://play.google.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:opacity-80 transition-opacity"
              >
                <Image
                  src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg"
                  alt="Get it on Google Play"
                  width={135}
                  height={40}
                  className="h-10 w-auto"
                />
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
