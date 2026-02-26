'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { authAPI } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { Lock, CheckCircle, AlertTriangle, Eye, EyeOff } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Our custom token flow: ?token=xxx&email=yyy
  const customToken = searchParams.get('token');
  const email = searchParams.get('email');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');
  // 'custom' = our token flow, 'supabase' = Supabase recovery flow
  const [resetMode, setResetMode] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function detectResetMode() {
      // Check for Supabase recovery flow via URL hash fragment
      // Supabase redirects with: #access_token=xxx&type=recovery
      if (typeof window !== 'undefined') {
        const hash = window.location.hash;
        if (hash && hash.includes('type=recovery')) {
          // Let Supabase client pick up the session from the hash
          const { data, error: sessionError } = await supabase.auth.getSession();
          if (data?.session) {
            setResetMode('supabase');
            setInitializing(false);
            return;
          }
          // If session not ready yet, wait a moment and retry
          await new Promise(resolve => setTimeout(resolve, 1000));
          const { data: retryData } = await supabase.auth.getSession();
          if (retryData?.session) {
            setResetMode('supabase');
            setInitializing(false);
            return;
          }
        }
      }

      // Check for our custom token flow
      if (customToken) {
        setResetMode('custom');
        setInitializing(false);
        return;
      }

      // No valid token found
      setResetMode(null);
      setInitializing(false);
    }

    detectResetMode();
  }, [customToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      if (resetMode === 'supabase') {
        // Supabase recovery flow: user has an active session from the recovery link
        const { error: updateError } = await supabase.auth.updateUser({
          password: password
        });
        if (updateError) throw updateError;
      } else {
        // Our custom token flow: send token + new password to backend
        await authAPI.resetPassword({ token: customToken, new_password: password });
      }
      setIsSuccess(true);
      toast.success('Password reset successfully!');
      // Sign out after reset so they log in fresh
      await supabase.auth.signOut();
    } catch (err) {
      const message = err.response?.data?.message || err.message || 'Failed to reset password. The link may have expired.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  // Success state
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Password Reset Complete
            </h2>
            <p className="text-gray-600 mb-8">
              Your password has been updated successfully. You can now log in with your new password.
            </p>
            <Link
              href="/login"
              className="inline-block bg-[#2D7FE6] text-white px-8 py-3 rounded-full font-medium hover:bg-[#2570d4] transition-colors"
            >
              Go to Login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Loading state while detecting reset mode
  if (initializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Verifying reset link...</div>
      </div>
    );
  }

  // No token / invalid link state
  if (!resetMode) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Invalid Reset Link
            </h2>
            <p className="text-gray-600 mb-8">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              href="/forgot-password"
              className="inline-block bg-[#2D7FE6] text-white px-8 py-3 rounded-full font-medium hover:bg-[#2570d4] transition-colors"
            >
              Request New Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-[#2D7FE6]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Set New Password
            </h2>
            {email && (
              <p className="text-sm text-gray-600">
                Resetting password for <strong>{decodeURIComponent(email)}</strong>
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D7FE6] focus:border-transparent pr-12"
                  placeholder="Minimum 8 characters"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="mt-2">
                  <div className="flex gap-1">
                    <div className={`h-1 flex-1 rounded ${password.length >= 8 ? 'bg-green-500' : 'bg-gray-200'}`} />
                    <div className={`h-1 flex-1 rounded ${password.length >= 10 ? 'bg-green-500' : 'bg-gray-200'}`} />
                    <div className={`h-1 flex-1 rounded ${/[A-Z]/.test(password) && /[0-9]/.test(password) ? 'bg-green-500' : 'bg-gray-200'}`} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {password.length < 8 ? 'Too short' : password.length < 10 ? 'Good' : 'Strong'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2D7FE6] focus:border-transparent pr-12 ${
                    confirmPassword && confirmPassword !== password
                      ? 'border-red-300'
                      : 'border-gray-300'
                  }`}
                  placeholder="Re-enter your new password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== password && (
                <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || password.length < 8 || password !== confirmPassword}
              className="w-full bg-[#2D7FE6] text-white py-3 rounded-full font-medium hover:bg-[#2570d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Resetting Password...' : 'Reset Password'}
            </button>

            <div className="text-center">
              <Link
                href="/login"
                className="text-gray-500 hover:text-gray-700 text-sm font-medium"
              >
                Back to Login
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
