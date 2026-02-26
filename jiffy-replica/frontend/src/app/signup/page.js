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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Mail className="w-10 h-10 text-[#2D7FE6]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">
              Check Your Email
            </h2>
            <p className="text-gray-600 mb-2">
              We've sent a confirmation link to:
            </p>
            <p className="text-[#2D7FE6] font-semibold text-lg mb-6">
              {signupEmail}
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Click the link in the email to activate your account. If you don't see it, check your spam folder.
            </p>
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full bg-[#2D7FE6] text-white py-3 rounded-full font-medium hover:bg-[#2570d4] transition-colors text-center"
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
    <div className="min-h-screen bg-gray-50 flex">
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl w-full flex bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Left Side - Benefits */}
          <div className="hidden lg:flex lg:w-1/3 bg-gray-50 p-12 flex-col justify-center">
            <div className="space-y-12">
              {/* Benefit 1 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Homeowner</h3>
                <p className="text-sm text-gray-600">Protection Promise</p>
              </div>

              {/* Benefit 2 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mb-4">
                  <Clock className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Get confirmed</h3>
                <p className="text-sm text-gray-600">appointments in minutes</p>
              </div>

              {/* Benefit 3 */}
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="12" fontWeight="bold">BridgeWork+</text>
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900 mb-1">Save $25 off every</h3>
                <p className="text-sm text-gray-600">job with BridgeWork+</p>
              </div>
            </div>
          </div>

          {/* Right Side - Form */}
          <div className="flex-1 p-12">
            <div className="max-w-md mx-auto">
              <h2 className="text-3xl font-bold text-gray-900 text-center mb-2">
                Sign Up
              </h2>
              <p className="text-center text-sm text-gray-600 mb-8">
                Create a free account with BridgeWork. Have an account?
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* First Name and Last Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2D7FE6] focus:border-transparent"
                      placeholder="First Name"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2D7FE6] focus:border-transparent"
                      placeholder="Last Name"
                    />
                  </div>
                </div>

                {/* Email and Phone */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2D7FE6] focus:border-transparent"
                      placeholder="email@example.com"
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2D7FE6] focus:border-transparent"
                      placeholder="(123) 456-7890"
                    />
                  </div>
                </div>

                {/* Password and Confirm Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2D7FE6] focus:border-transparent"
                      placeholder="Password (min 8 characters)"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2D7FE6] focus:border-transparent"
                      placeholder="Confirm Password"
                    />
                  </div>
                </div>

                {/* How did you hear about us */}
                <div>
                  <label htmlFor="hearAbout" className="block text-sm font-medium text-gray-700 mb-1">
                    How did you hear about us?
                  </label>
                  <input
                    id="hearAbout"
                    name="hearAbout"
                    type="text"
                    value={formData.hearAbout}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#2D7FE6] focus:border-transparent"
                    placeholder="e.g. friend, google, facebook, etc."
                  />
                </div>

                {/* Newsletter Checkbox */}
                <div className="flex items-start">
                  <input
                    id="receiveNews"
                    name="receiveNews"
                    type="checkbox"
                    checked={formData.receiveNews}
                    onChange={handleChange}
                    className="h-4 w-4 text-[#2D7FE6] focus:ring-[#2D7FE6] border-gray-300 rounded mt-1"
                  />
                  <label htmlFor="receiveNews" className="ml-2 block text-sm text-gray-700">
                    Yes! I'd like to receive news and special offers from BridgeWork.
                  </label>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Sign Up Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-[#2D7FE6] text-white py-3 rounded-full font-medium hover:bg-[#2570d4] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating account...' : 'Sign Up'}
                </button>

                {/* Terms and Conditions */}
                <p className="text-xs text-center text-gray-600">
                  By signing up you're agreeing to BridgeWork's{' '}
                  <Link href="/terms" className="text-[#2D7FE6] hover:underline">
                    Terms
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-[#2D7FE6] hover:underline">
                    Conditions
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
