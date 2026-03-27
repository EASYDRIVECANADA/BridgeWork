'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, ChevronDown, LayoutDashboard, Briefcase, Users, FileText, Settings, LogOut, User, MessageSquare, ClipboardList, UserCheck, Shield, Receipt, Bell, DollarSign, Crown } from 'lucide-react';
import { signOut } from '@/store/slices/authSlice';
import { proProfileUpdatesAPI } from '@/lib/api';
import NotificationBell from '@/components/NotificationBell';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showServiceTypeModal, setShowServiceTypeModal] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const dropdownRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);
  const unreadCount = useSelector((state) => state.messages.unreadCount);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown when route changes
  useEffect(() => {
    setActiveDropdown(null);
    setIsMenuOpen(false);
  }, [pathname]);
  
  // Hide navigation links on login and signup pages
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/pro-login' || pathname === '/become-pro';
  const isAuthenticated = !!user;
  const isPro = profile?.role === 'pro';
  const isAdmin = profile?.role === 'admin';
  const isSuperAdmin = profile?.role === 'admin' && profile?.is_superadmin === true;
  const [pendingUpdatesCount, setPendingUpdatesCount] = useState(0);

  useEffect(() => {
    if (isAdmin && isAuthenticated) {
      proProfileUpdatesAPI.getPendingCount()
        .then(res => setPendingUpdatesCount(res.data?.data?.count || 0))
        .catch(() => {});
    }
  }, [isAdmin, isAuthenticated, pathname]);

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
    <nav className="sticky top-0 z-50 relative bg-[linear-gradient(90deg,rgba(14,116,128,1)_0%,rgba(2,75,90,1)_30%,rgba(20,40,65,1)_60%)] shadow-xl shadow-black/20 ring-1 ring-white/10">
      {/* Subtle bottom border */}
      <div aria-hidden className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-white/20" />

      {/* Full-width container so content sits closer to edges */}
      <div className="relative mx-auto w-full px-4 sm:px-6 lg:px-10 xl:px-14">
        <div className="flex items-center justify-between h-20">
          {/* Left: Logo + primary links (beside logo) */}
          <div className="flex items-center gap-4 sm:gap-8 lg:gap-[6.5625rem]">
            <Link href="/" className="flex items-center flex-shrink-0">
              <Image
                src="/images/logo/logov2.png"
                alt="Bridge Work"
                width={240}
                height={96}
                className="h-10 sm:h-12 lg:h-16 w-auto drop-shadow-[0_4px_10px_rgba(0,0,0,0.35)] pointer-events-none select-none transform-gpu origin-left scale-[1.5] sm:scale-[1.8] lg:scale-[2.10]"
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
                ) : isAdmin ? (
                  <button onClick={() => setShowServiceTypeModal(true)} className={navLinkClass}>
                    Explore Services
                  </button>
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
                  <div className="flex items-center gap-1" ref={dropdownRef}>
                    {/* Dashboard Link */}
                    <Link href="/admin/revenue" className={navLinkClass + " flex items-center gap-1.5"}>
                      <LayoutDashboard className="w-4 h-4" />
                      Dashboard
                    </Link>

                    {/* Services Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === 'services' ? null : 'services')}
                        className={navLinkClass + " flex items-center gap-1.5"}
                      >
                        <Briefcase className="w-4 h-4" />
                        Services
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'services' ? 'rotate-180' : ''}`} />
                      </button>
                      {activeDropdown === 'services' && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                          <Link href="/admin/services" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <Briefcase className="w-4 h-4" />
                            All Services
                          </Link>
                          <Link href="/admin/categories" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <ClipboardList className="w-4 h-4" />
                            Categories
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Quotes Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === 'quotes' ? null : 'quotes')}
                        className={navLinkClass + " flex items-center gap-1.5"}
                      >
                        <FileText className="w-4 h-4" />
                        Quotes
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'quotes' ? 'rotate-180' : ''}`} />
                      </button>
                      {activeDropdown === 'quotes' && (
                        <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                          <Link href="/admin/quote-assignments" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <UserCheck className="w-4 h-4" />
                            Assign Quotes
                          </Link>
                          <Link href="/admin/quotations" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <Receipt className="w-4 h-4" />
                            All Quotations
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Team Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === 'team' ? null : 'team')}
                        className={navLinkClass + " flex items-center gap-1.5 relative"}
                      >
                        <Users className="w-4 h-4" />
                        Team
                        {pendingUpdatesCount > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                            {pendingUpdatesCount > 9 ? '9+' : pendingUpdatesCount}
                          </span>
                        )}
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${activeDropdown === 'team' ? 'rotate-180' : ''}`} />
                      </button>
                      {activeDropdown === 'team' && (
                        <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                          <Link href="/admin/pro-applications" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <UserCheck className="w-4 h-4" />
                            Pro Applications
                          </Link>
                          <Link href="/admin/profile-updates" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors relative" onClick={() => setActiveDropdown(null)}>
                            <Bell className="w-4 h-4" />
                            Profile Updates
                            {pendingUpdatesCount > 0 && (
                              <span className="ml-auto bg-red-500 text-white text-[9px] font-bold rounded-full px-1.5 py-0.5">
                                {pendingUpdatesCount > 9 ? '9+' : pendingUpdatesCount}
                              </span>
                            )}
                          </Link>
                          <Link href="/admin/invitations" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <Shield className="w-4 h-4" />
                            Admin Users
                          </Link>
                          <Link href="/admin/payouts" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <DollarSign className="w-4 h-4" />
                            Pro Payouts
                          </Link>
                          {isSuperAdmin && (
                            <>
                              <div className="h-px bg-gray-100 my-1" />
                              <Link href="/admin/manage-admins" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-amber-700 hover:bg-amber-50 transition-colors" onClick={() => setActiveDropdown(null)}>
                                <Crown className="w-4 h-4" />
                                Manage Admins
                              </Link>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Divider */}
                    <div className="h-6 w-px bg-white/20 mx-2" />

                    {/* Notification Bell */}
                    <NotificationBell />

                    {/* User Menu */}
                    <div className="relative">
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === 'user' ? null : 'user')}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#0E7480] flex items-center justify-center ring-2 ring-white/30">
                          <span className="text-white text-sm font-semibold">
                            {profile?.full_name?.charAt(0) || 'A'}
                          </span>
                        </div>
                        <span className="text-white text-sm font-medium hidden lg:block">
                          {profile?.full_name || 'Admin'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${activeDropdown === 'user' ? 'rotate-180' : ''}`} />
                      </button>
                      {activeDropdown === 'user' && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                          <Link href="/admin/profile" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <User className="w-4 h-4" />
                            My Profile
                          </Link>
                          <div className="h-px bg-gray-100 my-1" />
                          <button onClick={handleSignOut} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : isPro ? (
                  <div className="flex items-center gap-2">
                    {/* Notification Bell for Pro */}
                    <NotificationBell />
                    {/* User Menu for Pro */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === 'user' ? null : 'user')}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#0E7480] flex items-center justify-center ring-2 ring-white/30">
                          <span className="text-white text-sm font-semibold">
                            {profile?.full_name?.charAt(0) || 'P'}
                          </span>
                        </div>
                        <span className="text-white text-sm font-medium hidden lg:block">
                          {profile?.full_name || 'Pro'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${activeDropdown === 'user' ? 'rotate-180' : ''}`} />
                      </button>
                      {activeDropdown === 'user' && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                          <Link href="/pro-dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <User className="w-4 h-4" />
                            My Dashboard
                          </Link>
                          <div className="h-px bg-gray-100 my-1" />
                          <button onClick={handleSignOut} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    {/* Notification Bell for Customer */}
                    <NotificationBell />
                    <Link href="/messages" className={navLinkClass + " relative flex items-center gap-1.5"}>
                      <MessageSquare className="w-4 h-4" />
                      Messages
                      {unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-bold ring-2 ring-[#142841]">
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                      )}
                    </Link>
                    {/* User Menu for Customer */}
                    <div className="relative" ref={dropdownRef}>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === 'user' ? null : 'user')}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-200"
                      >
                        <div className="w-8 h-8 rounded-full bg-[#0E7480] flex items-center justify-center ring-2 ring-white/30">
                          <span className="text-white text-sm font-semibold">
                            {profile?.full_name?.charAt(0) || 'U'}
                          </span>
                        </div>
                        <span className="text-white text-sm font-medium hidden lg:block">
                          {profile?.full_name || 'User'}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-white/70 transition-transform duration-200 ${activeDropdown === 'user' ? 'rotate-180' : ''}`} />
                      </button>
                      {activeDropdown === 'user' && (
                        <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                          <Link href="/dashboard" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <User className="w-4 h-4" />
                            My Dashboard
                          </Link>
                          <Link href="/my-jobs" className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#0E7480]/10 hover:text-[#0E7480] transition-colors" onClick={() => setActiveDropdown(null)}>
                            <Briefcase className="w-4 h-4" />
                            My Jobs
                          </Link>
                          <div className="h-px bg-gray-100 my-1" />
                          <button onClick={handleSignOut} className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left">
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              ) : (
                <div className="flex items-center gap-3">
                  <Link href="/pro-login" className={navLinkClass}>
                    Pro Login
                  </Link>
                  {!isAuthPage && (
                    <Link href="/login" className={primaryCtaClass}>
                      Login
                    </Link>
                  )}
                </div>
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
          <div className="md:hidden pb-4 pt-2 border-t border-white/10 mt-2">
            <div className="flex flex-col gap-1">
              {isAuthenticated && isAdmin ? (
                <>
                  {/* User Info Header */}
                  <div className="flex items-center gap-3 px-3 py-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#0E7480] flex items-center justify-center ring-2 ring-white/30">
                      <span className="text-white font-semibold">{profile?.full_name?.charAt(0) || 'A'}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{profile?.full_name || 'Admin'}</p>
                      <p className="text-white/60 text-xs">Administrator</p>
                    </div>
                  </div>
                  
                  {/* Dashboard */}
                  <Link href="/admin/revenue" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <LayoutDashboard className="w-5 h-5" />
                    Dashboard
                  </Link>
                  
                  {/* Services Section */}
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Services</p>
                  </div>
                  <Link href="/admin/services" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <Briefcase className="w-5 h-5" />
                    All Services
                  </Link>
                  <Link href="/admin/categories" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <ClipboardList className="w-5 h-5" />
                    Categories
                  </Link>
                  
                  {/* Quotes Section */}
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Quotes</p>
                  </div>
                  <Link href="/admin/quote-assignments" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <UserCheck className="w-5 h-5" />
                    Assign Quotes
                  </Link>
                  <Link href="/admin/quotations" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <Receipt className="w-5 h-5" />
                    All Quotations
                  </Link>
                  
                  {/* Team Section */}
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Team</p>
                  </div>
                  <Link href="/admin/pro-applications" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <UserCheck className="w-5 h-5" />
                    Pro Applications
                  </Link>
                  <Link href="/admin/profile-updates" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <Bell className="w-5 h-5" />
                    Profile Updates
                    {pendingUpdatesCount > 0 && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                        {pendingUpdatesCount > 9 ? '9+' : pendingUpdatesCount}
                      </span>
                    )}
                  </Link>
                  <Link href="/admin/invitations" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <Shield className="w-5 h-5" />
                    Admin Users
                  </Link>
                  <Link href="/admin/payouts" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <DollarSign className="w-5 h-5" />
                    Pro Payouts
                  </Link>
                  {isSuperAdmin && (
                    <Link href="/admin/manage-admins" className="flex items-center gap-3 px-4 py-2.5 text-amber-300 hover:text-amber-200 hover:bg-amber-500/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                      <Crown className="w-5 h-5" />
                      Manage Admins
                    </Link>
                  )}
                  
                  {/* Sign Out */}
                  <div className="border-t border-white/10 mt-3 pt-3">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </div>
                </>
              ) : isAuthenticated && isPro ? (
                <>
                  {/* User Info Header */}
                  <div className="flex items-center gap-3 px-3 py-3 mb-2">
                    <div className="w-10 h-10 rounded-full bg-[#0E7480] flex items-center justify-center ring-2 ring-white/30">
                      <span className="text-white font-semibold">{profile?.full_name?.charAt(0) || 'P'}</span>
                    </div>
                    <div>
                      <p className="text-white font-medium">{profile?.full_name || 'Pro'}</p>
                      <p className="text-white/60 text-xs">Professional</p>
                    </div>
                  </div>
                  
                  <Link href="/pro-dashboard" className="flex items-center gap-3 px-4 py-3 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <LayoutDashboard className="w-5 h-5" />
                    Pro Dashboard
                  </Link>
                  <Link href="/pro-dashboard/quote-requests" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <FileText className="w-5 h-5" />
                    Quote Requests
                  </Link>
                  <Link href="/pro-dashboard/quotes" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                    <Receipt className="w-5 h-5" />
                    Quotes & Invoices
                  </Link>
                  
                  {/* Sign Out */}
                  <div className="border-t border-white/10 mt-3 pt-3">
                    <button
                      onClick={handleSignOut}
                      className="flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors w-full"
                    >
                      <LogOut className="w-5 h-5" />
                      Sign Out
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <button onClick={() => { setShowServiceTypeModal(true); setIsMenuOpen(false); }} className="flex items-center gap-3 px-4 py-3 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors w-full text-left">
                    <Briefcase className="w-5 h-5" />
                    Explore Services
                  </button>
                  {isAuthenticated && (
                    <Link href="/dashboard/invoices" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                      <Receipt className="w-5 h-5" />
                      Invoices
                    </Link>
                  )}
                  {isAuthenticated ? (
                    <>
                      {/* User Info Header */}
                      <div className="flex items-center gap-3 px-3 py-3 mt-2 border-t border-white/10">
                        <div className="w-10 h-10 rounded-full bg-[#0E7480] flex items-center justify-center ring-2 ring-white/30">
                          <span className="text-white font-semibold">{profile?.full_name?.charAt(0) || 'U'}</span>
                        </div>
                        <div>
                          <p className="text-white font-medium">{profile?.full_name || 'User'}</p>
                          <p className="text-white/60 text-xs">Customer</p>
                        </div>
                      </div>
                      
                      <Link href="/messages" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <MessageSquare className="w-5 h-5" />
                        Messages
                        {unreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold ml-auto">
                            {unreadCount > 9 ? '9+' : unreadCount}
                          </span>
                        )}
                      </Link>
                      <Link href="/dashboard" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <User className="w-5 h-5" />
                        My Dashboard
                      </Link>
                      <Link href="/my-jobs" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <Briefcase className="w-5 h-5" />
                        My Jobs
                      </Link>
                      
                      {/* Sign Out */}
                      <div className="border-t border-white/10 mt-3 pt-3">
                        <button
                          onClick={handleSignOut}
                          className="flex items-center gap-3 px-4 py-2.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors w-full"
                        >
                          <LogOut className="w-5 h-5" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col gap-2 mt-2 pt-3 border-t border-white/10">
                      <Link href="/pro-login" className="flex items-center gap-3 px-4 py-2.5 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors" onClick={() => setIsMenuOpen(false)}>
                        <User className="w-5 h-5" />
                        Pro Login
                      </Link>
                      <Link 
                        href="/login" 
                        className={primaryCtaClass + " block text-center mx-3"}
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Login
                      </Link>
                    </div>
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
