'use client';

import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUp } from '@/store/slices/authSlice';
import { toast } from 'react-toastify';
import { CheckCircle, Clock, Mail } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isLoading, error, isAuthenticated, profile } = useSelector((state) => state.auth);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    hearAbout: '',
    receiveNews: false,
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && profile) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, profile, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!/[A-Z]/.test(formData.password) || !/\d/.test(formData.password) || !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)) {
      toast.error('Password must contain at least one uppercase letter, one number, and one special character');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      const signupData = {
        full_name: `${formData.firstName} ${formData.lastName}`,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        role: 'user',
      };
      await dispatch(signUp(signupData)).unwrap();
      setSignupEmail(formData.email);
      setSignupSuccess(true);
    } catch (err) {
      toast.error(err || 'Signup failed');
    }
  };

  const handleChange = (e) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: value,
    });
  };

  // Show "Check your email" confirmation screen after successful signup
  if (signupSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#E7F6F7] via-white to-[#EEF2FF] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 sm:p-10 text-center">
            <div className="w-20 h-20 bg-[#0E7480]/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-[#0E7480]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3 tracking-tight">
              Check Your Email
            </h2>
            <p className="text-gray-600 mb-2">
              We've sent a confirmation link to:
            </p>
            <p className="text-[#0E7480] font-semibold text-lg mb-6">
              {signupEmail}
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Click the link in the email to activate your account. If you don't see it, check your spam folder.
            </p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full bg-[#0E7480] text-white py-3 rounded-full font-medium hover:bg-[#2570d4] transition-colors text-center"
              >
                Go to Login
              </Link>
              <button
                onClick={() => { setSignupSuccess(false); setSignupEmail(''); }}
                className="block w-full text-gray-500 hover:text-gray-700 py-2 text-sm font-medium"
              >
                Sign up with a different email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E7F6F7] via-white to-[#EEF2FF] flex">
      <div className="flex-1 flex items-center justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full flex bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Left Side - Benefits */}
          <div className="hidden lg:flex lg:w-1/3 bg-gradient-to-b from-[#0E7480]/5 to-[#0E7480]/10 p-10 flex-col justify-center border-r border-gray-100">
            <div className="space-y-10">
              {/* Benefit 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-[#0E7480] rounded-2xl flex items-center justify-center mb-3 shadow-sm">
                  <CheckCircle className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-0.5">Homeowner</h3>
                <p className="text-sm text-gray-600">Protection Promise</p>
              </div>

              {/* Benefit 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-[#0E7480] rounded-2xl flex items-center justify-center mb-3 shadow-sm">
                  <Clock className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-0.5">Get confirmed</h3>
                <p className="text-sm text-gray-600">appointments in minutes</p>
              </div>

              {/* Benefit 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-[#0E7480] rounded-2xl flex items-center justify-center mb-3 shadow-sm">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-0.5">Save $25 off every</h3>
                <p className="text-sm text-gray-600">job with BridgeWork+</p>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 p-6 sm:p-8 lg:p-12">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-2 tracking-tight">
                Sign Up
              </h2>
              <p className="text-center text-sm text-gray-600 mb-6 sm:mb-8">
                Create a free account with BridgeWork. Have an account?{' '}
                <Link href="/login" className="font-semibold text-[#0E7480] hover:underline underline-offset-4">Log in</Link>
              </p>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* First Name and Last Name */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-semibold text-gray-800 mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7480]/35 focus:border-[#0E7480] transition text-base"
                      placeholder="First Name"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-semibold text-gray-800 mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7480]/35 focus:border-[#0E7480] transition text-base"
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-semibold text-gray-800 mb-1.5">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7480]/35 focus:border-[#0E7480] transition text-base"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-semibold text-gray-800 mb-1.5">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7480]/35 focus:border-[#0E7480] transition text-base"
                      placeholder="(123) 456-7890"
                    />
                  </div>
                </div>

                {/* Password and Confirm Password */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-semibold text-gray-800 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="new-password"
                      required
                      minLength={8}
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7480]/35 focus:border-[#0E7480] transition text-base"
                      placeholder="Min 8 characters"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-800 mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7480]/35 focus:border-[#0E7480] transition text-base"
                      placeholder="Confirm Password"
                    />
                  </div>
                </div>

                {/* How did you hear about us */}
                <div>
                  <label htmlFor="hearAbout" className="block text-sm font-semibold text-gray-800 mb-1.5">
                    How did you hear about us?
                  </label>
                  <input
                    id="hearAbout"
                    name="hearAbout"
                    type="text"
                    value={formData.hearAbout}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0E7480]/35 focus:border-[#0E7480] transition text-base"
                    placeholder="e.g. friend, google, facebook, etc."
                  />
                </div>

                {/* Newsletter Checkbox */}
                <div className="flex items-start gap-3">
                  <input
                    id="receiveNews"
                    name="receiveNews"
                    type="checkbox"
                    checked={formData.receiveNews}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#0E7480] focus:ring-[#0E7480] border-gray-300 rounded mt-0.5"
                  />
                  <label htmlFor="receiveNews" className="block text-sm text-gray-700 cursor-pointer select-none">
                    Yes! I'd like to receive news and special offers from BridgeWork.
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm ring-1 ring-red-200 flex items-start gap-2">
                    <span className="text-red-500 mt-0.5 flex-shrink-0">&#9888;</span>
                    <span>{error}</span>
                  </div>
                )}

                {/* Sign Up Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-brand w-full py-3.5 rounded-2xl font-brand tracking-tight text-base disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating account...' : 'Sign Up'}
                </button>

                {/* Terms and Conditions */}
                <p className="text-xs text-center text-gray-500">
                  By signing up you're agreeing to BridgeWork's{' '}
                  <Link href="/terms" className="text-gray-700 font-semibold hover:underline underline-offset-4">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-gray-700 font-semibold hover:underline underline-offset-4">
                    Privacy Policy
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
