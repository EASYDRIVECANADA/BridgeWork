'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, User, Lock } from 'lucide-react';
import { signIn } from '@/store/slices/authSlice';
import { toast } from 'react-toastify';

export default function ProLoginPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isLoading, error, isAuthenticated, profile } = useSelector((state) => state.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Redirect when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (profile && profile.role !== 'pro') {
        toast.error('This account is not a Pro account. Please use the regular login.');
        router.push('/dashboard');
        return;
      }
      toast.success('Welcome back, Pro!');
      router.push('/pro-dashboard');
    }
  }, [isAuthenticated, profile, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(signIn({ email, password })).unwrap();
    } catch (err) {
      toast.error(err || 'Login failed');
    }
  };

  return (
    <div className="min-h-screen relative">
      {/* Background Image */}
      <div className="absolute inset-0">
        <Image
          src="https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=2000"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/35" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(14,116,128,0.22)_0%,rgba(2,75,90,0.18)_30%,rgba(20,40,65,0.26)_60%)] mix-blend-multiply" />
      </div>

      {/* Content */}
      <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Top bar (replaces navbar for /pro-login) */}
          <div className="flex items-center justify-between mb-6">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 text-sm font-semibold text-white/90 hover:text-white rounded-lg px-2 py-1 hover:bg-white/10 transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to home
            </button>

            <Link
              href="/login"
              className="text-sm font-semibold text-white/90 rounded-full px-4 py-2 ring-1 ring-white/25 hover:bg-white/10 transition"
            >
              User Login
            </Link>
          </div>

          {/* Pro Login Card (original structure, brand styling) */}
          <div className="rounded-2xl p-[1px] bg-[linear-gradient(90deg,rgba(14,116,128,1)_0%,rgba(2,75,90,1)_30%,rgba(20,40,65,1)_60%)] shadow-2xl shadow-black/30">
            <div className="bg-[#071a22]/90 backdrop-blur rounded-2xl p-8 ring-1 ring-white/10">
              {/* Logo Circle */}
              <div className="flex justify-center mb-6">
                <div className="w-44 h-44 bg-white rounded-full flex items-center justify-center p-4 shadow-xl shadow-black/20 ring-1 ring-black/5">
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

              {/* Title */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold tracking-wide text-white/90 ring-1 ring-white/15 mb-4">
                  Pro account
                </div>
                <h1 className="font-brand text-center text-2xl font-extrabold text-white tracking-tight">
                  Login to your Pro Account
                </h1>
                <p className="text-center text-sm text-white/70 mt-2">
                  Accept jobs, message customers, and track your earnings.
                </p>
              </div>

              {/* Login Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email Input */}
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#0E7480] w-5 h-5" />
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/45 focus:border-transparent transition"
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Password Input */}
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[#0E7480] w-5 h-5" />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/15 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-[#0E7480]/45 focus:border-transparent transition"
                    required
                    autoComplete="current-password"
                  />
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between">
                  <label htmlFor="rememberMe" className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      id="rememberMe"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-white/30 bg-white/10 text-[#0E7480] focus:ring-[#0E7480] focus:ring-offset-0"
                    />
                    Remember me
                  </label>

                  <Link href="/forgot-password" className="text-sm font-semibold text-white/80 hover:text-white hover:underline underline-offset-4">
                    Forgot password?
                  </Link>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/15 border border-red-400/30 text-red-100 px-4 py-3 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-brand w-full py-3 rounded-2xl font-brand tracking-tight disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Logging in...' : 'Continue'}
                </button>
              </form>
            </div>
          </div>

          {/* New to BridgeWork Button */}
          <div className="mt-4">
            <Link
              href="/become-pro"
              className="block w-full bg-white/10 hover:bg-white/15 text-white font-bold py-3 rounded-xl text-center transition ring-1 ring-white/20"
            >
              New to BridgeWork?
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
