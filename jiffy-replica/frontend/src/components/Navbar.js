'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, MessageSquare } from 'lucide-react';
import { signOut } from '@/store/slices/authSlice';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);
  const unreadCount = useSelector((state) => state.messages.unreadCount);
  
  // Hide navigation links on login and signup pages
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/pro-login' || pathname === '/become-pro';
  const isAuthenticated = !!user;
  const isPro = profile?.role === 'pro';
  const isAdmin = profile?.role === 'admin';

  const handleSignOut = async () => {
    await dispatch(signOut());
    router.push('/');
  };

  // Hover/animation styles (keeps layout identical; only visual + motion)
  const navLinkClass =
    "group relative text-white/90 hover:text-white text-sm font-medium px-3 py-2 rounded-lg " +
    "transition-all duration-200 ease-out hover:bg-white/10 hover:-translate-y-[1px] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 " +
    "after:content-[''] after:absolute after:left-3 after:right-3 after:-bottom-0.5 after:h-px " +
    "after:bg-gradient-to-r after:from-transparent after:via-white/80 after:to-transparent " +
    "after:scale-x-0 after:origin-center after:transition-transform after:duration-300 " +
    "group-hover:after:scale-x-100";

  const navButtonClass =
    "relative text-white/90 hover:text-white text-sm font-medium px-3 py-2 rounded-lg " +
    "transition-all duration-200 ease-out hover:bg-white/10 hover:-translate-y-[1px] " +
    "active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";

  const primaryCtaClass =
    "relative overflow-hidden bg-white text-[#042E5C] px-6 py-2.5 rounded-xl text-sm font-semibold " +
    "shadow-sm ring-1 ring-white/30 transition-all duration-200 ease-out " +
    "hover:bg-white/90 hover:-translate-y-[1px] hover:shadow-md hover:ring-white/40 " +
    "active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70";

  const navMobileLinkClass = navLinkClass + " block w-full";
  const navMobileButtonClass = navButtonClass + " w-full text-left";

  return (
    <nav className="sticky top-0 z-50 relative overflow-hidden bg-[linear-gradient(90deg,rgba(14,116,128,1)_0%,rgba(2,75,90,1)_30%,rgba(20,40,65,1)_60%)] shadow-xl shadow-black/20 ring-1 ring-white/10">
      {/* Subtle bottom border */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-white/20" />

      {/* Full-width container so content sits closer to edges */}
      <div className="relative mx-auto w-full px-4 sm:px-6 lg:px-10 xl:px-14">
        <div className="flex items-center justify-between h-20">
          {/* Left: Logo + primary links (beside logo) */}
          <div className="flex items-center gap-[6.5625rem]">
            <Link href="/" className="flex items-center">
              <Image
                src="/images/logo/logov2.png"
                alt="Bridge Work"
                width={240}
                height={96}
                className="h-16 w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] pointer-events-none select-none transform-gpu origin-left scale-[2.10]"
                priority
                unoptimized
              />
            </Link>

            {!isAuthPage && (
              <div className="hidden md:flex items-center gap-8">
                {isAuthenticated && isPro ? (
                  <>
                    <Link href="/pro-dashboard" className={navLinkClass}>
                      Pro Dashboard
                    </Link>
                    <Link href="/pro-dashboard/quotes" className={navLinkClass}>
                      Quotes
                    </Link>
                    <Link href="/help" className={navLinkClass}>
                      Help Center
                    </Link>
                  </>
                ) : (
                  <>
                    <Link href="/services" className={navLinkClass}>
                      Explore Services
                    </Link>
                    {isAuthenticated && (
                      <Link href="/my-jobs" className={navLinkClass}>
                        My Jobs
                      </Link>
                    )}
                    {isAuthenticated && (
                      <Link href="/dashboard/quotes" className={navLinkClass}>
                        Quotes
                      </Link>
                    )}
                    <Link href="/help" className={navLinkClass}>
                      Help Center
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Right Navigation */}
          <div className="flex items-center justify-end gap-3">
            <div className="hidden md:flex items-center gap-6">
              {isAuthenticated ? (
                isAdmin ? (
                  <>
                    <Link href="/admin/revenue" className={navLinkClass}>
                      Admin Dashboard
                    </Link>
                    <Link href="/admin/pro-applications" className={navLinkClass}>
                      Pro Applications
                    </Link>
                    <Link href="/admin/support-chat" className={navLinkClass}>
                      Support Chat
                    </Link>
                    <Link href="/messages" className={navLinkClass + " relative"}>
                      Messages
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ring-2 ring-[#142841]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/dashboard" className={navLinkClass}>
                      {profile?.full_name || 'Admin'}
                    </Link>
                    <button onClick={handleSignOut} className={navButtonClass}>
                      Sign Out
                    </button>
                  </>
                ) : isPro ? (
                  <>
                    <Link href="/pro-dashboard" className={navLinkClass}>
                      {profile?.full_name || 'Pro'}
                    </Link>
                    <button onClick={handleSignOut} className={navButtonClass}>
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/messages" className={navLinkClass + " relative"}>
                      Messages
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ring-2 ring-[#142841]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    <Link href="/dashboard" className={navLinkClass}>
                      {profile?.full_name || 'User'}
                    </Link>
                    <button onClick={handleSignOut} className={navButtonClass}>
                      Sign Out
                    </button>
                  </>
                )
              ) : (
                <>
                  <Link href="/pro-login" className={navLinkClass}>
                    Pro Login
                  </Link>
                  {!isAuthPage && (
                    <Link href="/login" className={primaryCtaClass}>
                      Login
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Mobile Menu Button */}
            {!isAuthPage && (
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="md:hidden p-2 text-white/90 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              >
                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && !isAuthPage && (
          <div className="md:hidden pb-4 pt-2">
            <div className="flex flex-col gap-3">
              {isAuthenticated && isAdmin ? (
                <>
                  <Link href="/admin/revenue" className={navMobileLinkClass}>
                    Admin Dashboard
                  </Link>
                  <Link href="/admin/pro-applications" className={navMobileLinkClass}>
                    Pro Applications
                  </Link>
                  <Link href="/help" className={navMobileLinkClass}>
                    Help Center
                  </Link>
                  <Link href="/messages" className={navMobileLinkClass + " flex items-center gap-2"}>
                    Messages
                    {unreadCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/dashboard" className={navMobileLinkClass}>
                    {profile?.full_name || 'Admin'}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className={navMobileButtonClass}
                  >
                    Sign Out
                  </button>
                </>
              ) : isAuthenticated && isPro ? (
                <>
                  <Link href="/pro-dashboard" className={navMobileLinkClass}>
                    Pro Dashboard
                  </Link>
                  <Link href="/pro-dashboard/quotes" className={navMobileLinkClass}>
                    Quotes & Invoices
                  </Link>
                  <Link href="/help" className={navMobileLinkClass}>
                    Help Center
                  </Link>
                  <Link href="/pro-dashboard" className={navMobileLinkClass}>
                    {profile?.full_name || 'Pro'}
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className={navMobileButtonClass}
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link href="/services" className={navMobileLinkClass}>
                    Explore Services
                  </Link>
                  {isAuthenticated && (
                    <Link href="/my-jobs" className={navMobileLinkClass}>
                      My Jobs
                    </Link>
                  )}
                  {isAuthenticated && (
                    <Link href="/dashboard/quotes" className={navMobileLinkClass}>
                      Quotes & Invoices
                    </Link>
                  )}
                  <Link href="/help" className={navMobileLinkClass}>
                    Help Center
                  </Link>
                  {isAuthenticated ? (
                    <>
                      <Link href="/messages" className={navMobileLinkClass + " flex items-center gap-2"}>
                        Messages
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/dashboard" className={navMobileLinkClass}>
                        {profile?.full_name || 'User'}
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className={navMobileButtonClass}
                      >
                        Sign Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/pro-login" className={navMobileLinkClass}>
                        Pro Login
                      </Link>
                      <Link 
                        href="/login" 
                        className={primaryCtaClass + " block text-center"}
                      >
                        Login
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
