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
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
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

  const handleServiceTypeSelect = (type) => {
    setShowServiceTypeModal(false);
    if (type === 'residential') {
      router.push('/services?type=residential');
    } else {
      router.push('/services?type=commercial');
    }
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
                    <Link href="/pro-dashboard/quote-requests" className={navLinkClass}>
                      Quote Requests
                    </Link>
                    <Link href="/pro-dashboard/quotes" className={navLinkClass}>
                      Quotes
                    </Link>
                  </>
                ) : (
                  <>
                    <button onClick={() => setShowServiceTypeModal(true)} className={navLinkClass}>
                      Explore Services
                    </button>
                    {isAuthenticated && (
                      <Link href="/dashboard/invoices" className={navLinkClass}>
                        Invoices
                      </Link>
                    )}
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
                      Dashboard
                    </Link>
                    <Link href="/admin/services" className={navLinkClass}>
                      Services
                    </Link>
                    <Link href="/admin/categories" className={navLinkClass}>
                      Categories
                    </Link>
                    <Link href="/admin/pro-applications" className={navLinkClass}>
                      Pro Applications
                    </Link>
                    <Link href="/admin/quote-assignments" className={navLinkClass}>
                      Assign Quotes
                    </Link>
                    <Link href="/admin/quotations" className={navLinkClass}>
                      Quotations
                    </Link>
                    <Link href="/admin/invitations" className={navLinkClass}>
                      Admins
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
                    Dashboard
                  </Link>
                  <Link href="/admin/services" className={navMobileLinkClass}>
                    Services
                  </Link>
                  <Link href="/admin/categories" className={navMobileLinkClass}>
                    Categories
                  </Link>
                  <Link href="/admin/invitations" className={navMobileLinkClass}>
                    Admins
                  </Link>
                  <Link href="/admin/pro-applications" className={navMobileLinkClass}>
                    Pro Applications
                  </Link>
                  <Link href="/admin/quote-assignments" className={navMobileLinkClass}>
                    Assign Quotes
                  </Link>
                  <Link href="/admin/quotations" className={navMobileLinkClass}>
                    Quotations
                  </Link>
                  <Link href="/admin/support-chat" className={navMobileLinkClass}>
                    Support Chat
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
                  <Link href="/pro-dashboard/quote-requests" className={navMobileLinkClass}>
                    Quote Requests
                  </Link>
                  <Link href="/pro-dashboard/quotes" className={navMobileLinkClass}>
                    Quotes & Invoices
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
                  <button onClick={() => setShowServiceTypeModal(true)} className={navMobileLinkClass}>
                    Explore Services
                  </button>
                  {isAuthenticated && (
                    <Link href="/dashboard/invoices" className={navMobileLinkClass}>
                      Invoices
                    </Link>
                  )}
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

      {/* Service Type Selection Modal */}
      {showServiceTypeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowServiceTypeModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Choose Service Type</h2>
            <p className="text-gray-600 text-center mb-6">Select the type of service you need</p>
            
            <div className="space-y-3">
              <button
                onClick={() => handleServiceTypeSelect('residential')}
                className="w-full bg-[#0E7480] hover:bg-[#0d6670] text-white font-semibold py-4 px-6 rounded-xl transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                🏠 Residential Services
              </button>
              
              <button
                onClick={() => handleServiceTypeSelect('commercial')}
                className="w-full bg-white hover:bg-gray-50 text-gray-900 font-semibold py-4 px-6 rounded-xl border-2 border-gray-300 hover:border-[#0E7480] transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                🏢 Commercial Services
              </button>
            </div>
            
            <button
              onClick={() => setShowServiceTypeModal(false)}
              className="w-full mt-4 text-gray-500 hover:text-gray-700 text-sm font-medium py-2 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
