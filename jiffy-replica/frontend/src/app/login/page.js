'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn } from '@/store/slices/authSlice';
import { toast } from 'react-toastify';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isLoading, error, isAuthenticated, profile } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [showPassword, setShowPassword] = useState(false);

  // Redirect when authenticated
  useEffect(() => {
    console.log('[LOGIN PAGE] useEffect check:', { isAuthenticated, hasProfile: !!profile, isLoading });
    if (isAuthenticated) {
      toast.success('Login successful!');
      // If profile is already loaded, route by role; otherwise default to /dashboard
      const dest = profile?.role === 'pro' ? '/pro-dashboard' : '/dashboard';
      console.log('[LOGIN PAGE] Redirecting to:', dest);
      router.push(dest);
    }
  }, [isAuthenticated, profile, router, isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[LOGIN PAGE] handleSubmit called');
    try {
      const result = await dispatch(signIn({ email: formData.email, password: formData.password })).unwrap();
      console.log('[LOGIN PAGE] signIn thunk resolved:', result);
    } catch (err) {
      console.error('[LOGIN PAGE] signIn thunk rejected:', err);
      toast.error(err || 'Login failed');
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
    });
  };

  return (
    <div className="min-h-screen px-4 sm:px-6 py-10 sm:py-14 bg-gradient-to-br from-[#E7F6F7] via-white to-[#EEF2FF] relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-[#0E7480]/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-100/60 rounded-full blur-3xl" />
      </div>
      <div className="max-w-md w-full mx-auto">
        {/* Top bar (replaces navbar for /login) */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-800 hover:text-gray-900 rounded-lg px-2 py-1 hover:bg-black/5 transition"
          >
            <ArrowLeft className="w-4 h-4" />
            Go back
          </button>

          <Link
            href="/pro-login"
            className="text-sm font-semibold text-[#0E7480] rounded-full px-4 py-2 ring-1 ring-[#0E7480]/25 hover:bg-[#0E7480]/10 transition"
          >
            Pro Login
          </Link>
        </div>

        <div className="relative rounded-2xl sm:rounded-3xl p-[2px] bg-gradient-to-br from-[#0E7480] via-[#024B5A] to-[#142841] shadow-2xl shadow-[#0E7480]/20">
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl sm:rounded-3xl p-6 sm:p-10">
            {/* Heading */}
            <div className="text-center mb-5 sm:mb-7">
              <div className="inline-flex items-center justify-center mb-2 sm:mb-3">
                <div className="w-28 h-28 sm:w-40 sm:h-40 bg-white rounded-full flex items-center justify-center p-3 sm:p-4 shadow-xl shadow-black/10 ring-1 ring-black/5">
                  <Image
                    src="/images/logo/logov2.png"
                    alt="BridgeWork Logo"
                    width={120}
                    height={120}
                    className="w-full h-full object-contain"
                    unoptimized
                  />
                </div>
              </div>
              <h2 className="font-brand text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight">
                Welcome back
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-1">
                Log in to manage bookings, messages, and receipts.
              </p>
            </div>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-gray-600 mb-7">
              New to BridgeWork?{' '}
              <Link href="/signup" className="font-semibold text-[#0E7480] hover:underline underline-offset-4">
                Create an account
              </Link>
            </p>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0E7480]" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full pl-11 pr-4 py-4 border-0 rounded-xl bg-gray-50/80 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:bg-white transition-all duration-200 text-base"
                    placeholder="Email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-800">
                    Password
                  </label>
                  <Link href="/forgot-password" className="text-xs font-semibold text-[#0E7480] hover:underline underline-offset-4">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#0E7480]" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full pl-11 pr-12 py-4 border-0 rounded-xl bg-gray-50/80 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:bg-white transition-all duration-200 text-base"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition rounded-md"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 text-sm text-gray-700 cursor-pointer select-none">
                  <input
                    id="rememberMe"
                    name="rememberMe"
                    type="checkbox"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#0E7480] focus:ring-[#0E7480] border-gray-300 rounded"
                  />
                  Remember me
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm ring-1 ring-red-200 flex items-start gap-2">
                  <span className="text-red-500 mt-0.5 flex-shrink-0">&#9888;</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-brand w-full py-4 rounded-xl font-brand tracking-tight text-base shadow-lg shadow-[#0E7480]/25 hover:shadow-xl hover:shadow-[#0E7480]/30 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200"
              >
                {isLoading ? 'Logging in...' : 'Continue'}
              </button>

              <p className="text-xs text-gray-500 text-center pt-2">
                By continuing, you agree to our{' '}
                <Link href="/terms" className="text-gray-700 font-semibold hover:underline underline-offset-4">
                  Terms
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-gray-700 font-semibold hover:underline underline-offset-4">
                  Privacy Policy
                </Link>
                .
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
