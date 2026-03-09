'use client';

import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Facebook, Twitter, Linkedin, Instagram } from 'lucide-react';
import { signUp } from '@/store/slices/authSlice';
import { toast } from 'react-toastify';

export default function BecomeProPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { isLoading } = useSelector((state) => state.auth);
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

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
        role: 'pro',
      };
      await dispatch(signUp(signupData)).unwrap();
      toast.success('Pro account created successfully!');
      router.push('/pro-dashboard');
    } catch (err) {
      toast.error(err || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section with Signup Form Overlay */}
      <div className="relative h-[500px] w-full">
        <Image
          src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?q=80&w=2000"
          alt="Living Room Background"
          fill
          className="object-cover"
          priority
        />
        
        {/* Hero Content - Left Side */}
        <div className="absolute inset-0 flex items-center">
          <div className="max-w-7xl mx-auto px-6 w-full">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left: Text Content */}
              <div className="text-white">
                <h1 className="text-4xl md:text-5xl font-bold mb-4">
                  The App for your home
                </h1>
                <p className="text-base leading-relaxed">
                  BridgeWork your days! Homeowners with top quality home service professionals in real time. Gain access to our large network of customers for no upfront fee. BridgeWork's app and customer service team handles all the minor details of each job so you can spend your time doing what you do best.
                </p>
              </div>

              {/* Right: Signup Form Card */}
              <div className="bg-white rounded-lg shadow-2xl p-8">
                <h2 className="text-[#0E7480] text-xl font-semibold mb-2">
                  It's free to join the BridgeWork platform
                </h2>
                <p className="text-[#0E7480] text-sm mb-6">
                  Become a BridgeWork Professional
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Email Address <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Cell Phone Number <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-700 mb-1">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-600">
                    By signing up with BridgeWork, you are agreeing to BridgeWork's{' '}
                    <Link href="/terms" className="text-[#0E7480] hover:underline">
                      Terms and Conditions
                    </Link>
                    .
                  </p>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Creating account...' : 'Sign Me Up!'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* The BridgeWork Advantage Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#0E7480] text-center mb-12">
            The BridgeWork Advantage. Here's why you should sign up:
          </h2>

          <div className="grid md:grid-cols-4 gap-8">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-20 h-20 text-[#0E7480]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <circle cx="12" cy="12" r="3" fill="currentColor"/>
                  <line x1="12" y1="2" x2="12" y2="6" strokeWidth="2"/>
                  <line x1="12" y1="18" x2="12" y2="22" strokeWidth="2"/>
                  <line x1="4.93" y1="4.93" x2="7.76" y2="7.76" strokeWidth="2"/>
                  <line x1="16.24" y1="16.24" x2="19.07" y2="19.07" strokeWidth="2"/>
                </svg>
              </div>
              <h3 className="text-[#0E7480] font-bold mb-2">ACCESS OUR NETWORK</h3>
              <p className="text-sm text-gray-700">
                With 24 job categories, BridgeWork acts as a one stop shop for all our clients' home maintenance needs. Our promise to deliver quality professionals from around the globe companies keep them coming back!
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-20 h-20 text-[#0E7480]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <rect x="5" y="2" width="14" height="20" rx="2" strokeWidth="2"/>
                  <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="text-[#0E7480] font-bold mb-2">JOB ALERTS TO YOUR PHONE</h3>
              <p className="text-sm text-gray-700">
                Instead of sending leads, BridgeWork sends you or firm the clients in need of your services. Each customer already has their credit card information on file and you'll never have to compete with multiple quotes as all BridgeWork jobs follow a straightforward rate card.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-20 h-20 text-[#0E7480]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" strokeWidth="2"/>
                  <polyline points="14 2 14 8 20 8" strokeWidth="2"/>
                  <line x1="16" y1="13" x2="8" y2="13" strokeWidth="2"/>
                  <line x1="16" y1="17" x2="8" y2="17" strokeWidth="2"/>
                  <polyline points="10 9 9 9 8 9" strokeWidth="2"/>
                </svg>
              </div>
              <h3 className="text-[#0E7480] font-bold mb-2">EFFORTLESS INVOICING</h3>
              <p className="text-sm text-gray-700">
                After the job is complete, simply enter the job details in the app, and an invoice is automatically generated with their payment deposited to your account 4 days later.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <svg className="w-20 h-20 text-[#0E7480]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                  <path d="M12 6v6l4 2" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="text-[#0E7480] font-bold mb-2">NO UPFRONT FEES</h3>
              <p className="text-sm text-gray-700">
                It's absolutely free to join the platform - BridgeWork only takes a nominal percentage of each job you bill through, so you only pay for jobs you choose to take on.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* How it works Section */}
      <div className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Left: Phone Mockup */}
            <div className="flex justify-center">
              <div className="relative w-64 h-[500px]">
                <Image
                  src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?q=80&w=400"
                  alt="App Screenshot"
                  fill
                  className="object-cover rounded-3xl"
                />
              </div>
            </div>

            {/* Right: Steps */}
            <div>
              <h2 className="text-3xl font-bold text-[#0E7480] mb-8">How it works</h2>

              <div className="space-y-6">
                <div>
                  <h3 className="text-[#00bfff] font-bold mb-2 uppercase">Jobs get sent directly to your phone</h3>
                  <p className="text-sm text-gray-700">
                    View job description, location & date/time requested. If you are able to do the job at the customer's requested time, accept with your 1-hour ETA.
                  </p>
                </div>

                <div>
                  <h3 className="text-[#00bfff] font-bold mb-2 uppercase">Accept job</h3>
                  <p className="text-sm text-gray-700">
                    Once accepted, the client's address and phone number will be displayed. Call (or email/text) the client ASAP to introduce yourself, go over the job details, and confirm your ETA.
                  </p>
                </div>

                <div>
                  <h3 className="text-[#00bfff] font-bold mb-2 uppercase">Bill it out</h3>
                  <p className="text-sm text-gray-700">
                    Once you complete a job, bill it out on the app. For charges above the minimum, make sure the client knows about them before proceeding with the work.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Application Requirements Section */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-[#0E7480] text-center mb-4">
            What You&apos;ll Need to Apply
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            BridgeWork is a platform for established companies with a proven track record. All companies will need the following while applying:
          </p>

          <div className="grid md:grid-cols-5 gap-6">
            <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#0E7480]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#0E7480]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Tax ID Number</h3>
              <p className="text-xs text-gray-600">Valid business tax identification number</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#0E7480]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#0E7480]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Licenses & Certifications</h3>
              <p className="text-xs text-gray-600">Valid licenses and certifications within your field</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#0E7480]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#0E7480]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">$2M Liability Insurance</h3>
              <p className="text-xs text-gray-600">At least $2 million in liability insurance coverage</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#0E7480]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#0E7480]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">WSIB Coverage</h3>
              <p className="text-xs text-gray-600">Required if company has employees beyond owners</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6 text-center border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-16 h-16 bg-[#0E7480]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-[#0E7480]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
              </div>
              <h3 className="font-bold text-gray-900 mb-2">Strong References</h3>
              <p className="text-xs text-gray-600">Proven track record with strong references and reviews</p>
            </div>
          </div>

          <div className="mt-10 bg-blue-50 border border-blue-200 rounded-xl p-6 max-w-3xl mx-auto">
            <p className="text-sm text-gray-700 text-center">
              It may take up to <span className="font-bold">2 weeks</span> for our team to review your application.
              We&apos;ll update you on openings within your category and upcoming onboarding meetings.
              Feel free to <Link href="/help" className="text-[#0E7480] hover:underline">contact us</Link> if you have any questions.
            </p>
          </div>
        </div>
      </div>

      {/* Dark Benefits Section */}
      <div className="bg-[#0a2540] py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Benefit 1 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-[#1a3a5a] flex items-center justify-center">
                  <svg className="w-12 h-12 text-[#00bfff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-white font-bold mb-1">INCREASED</h3>
              <h3 className="text-[#00bfff] font-bold">BUSINESS</h3>
            </div>

            {/* Benefit 2 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-[#1a3a5a] flex items-center justify-center">
                  <svg className="w-12 h-12 text-[#00bfff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" strokeWidth="2"/>
                    <polyline points="12 6 12 12 16 14" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-white font-bold mb-1">MAXIMIZE FREE</h3>
              <h3 className="text-[#00bfff] font-bold">TIME</h3>
            </div>

            {/* Benefit 3 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-[#1a3a5a] flex items-center justify-center">
                  <svg className="w-12 h-12 text-[#00bfff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <line x1="12" y1="1" x2="12" y2="23" strokeWidth="2"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-white font-bold mb-1">NO UPFRONT</h3>
              <h3 className="text-[#00bfff] font-bold">FEES</h3>
            </div>

            {/* Benefit 4 */}
            <div className="text-center">
              <div className="flex justify-center mb-4">
                <div className="w-24 h-24 rounded-full bg-[#1a3a5a] flex items-center justify-center">
                  <svg className="w-12 h-12 text-[#00bfff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="1" y="4" width="22" height="16" rx="2" ry="2" strokeWidth="2"/>
                    <line x1="1" y1="10" x2="23" y2="10" strokeWidth="2"/>
                  </svg>
                </div>
              </div>
              <h3 className="text-white font-bold mb-1">QUICK & EASY</h3>
              <h3 className="text-[#00bfff] font-bold">PAYMENTS</h3>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Signup Form Section */}
      <div className="bg-[#0a2540] py-16">
        <div className="max-w-4xl mx-auto px-6">
          <h2 className="text-3xl font-bold text-white text-center mb-8">
            Create your account to get started!
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="firstName"
                  className="w-full px-4 py-3 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                  required
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="lastName"
                  className="w-full px-4 py-3 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm mb-2">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  className="w-full px-4 py-3 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                  required
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">
                  Cell Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  className="w-full px-4 py-3 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                  required
                />
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white text-sm mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="password"
                  className="w-full px-4 py-3 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                  required
                />
              </div>
              <div>
                <label className="block text-white text-sm mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  name="confirmPassword"
                  className="w-full px-4 py-3 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Referral Code (Optional)"
                className="w-full md:w-1/2 px-4 py-3 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0E7480]"
              />
            </div>

            <p className="text-white text-sm">
              By signing up with BridgeWork, you are agreeing to BridgeWork's{' '}
              <Link href="/terms" className="text-[#00bfff] hover:underline">
                Terms and Conditions
              </Link>
              .
            </p>

            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#ff9800] hover:bg-[#f57c00] text-white font-bold px-16 py-3 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating account...' : 'Sign Me Up!'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gray-100 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left: Links */}
            <div>
              <h3 className="text-[#ff9800] font-bold mb-4">BECOME A BRIDGEWORK PRO</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li><Link href="/homeowner-protection" className="hover:text-[#0E7480]">Homeowner Protection Promise</Link></li>
                <li><Link href="/terms" className="hover:text-[#0E7480]">Terms and Conditions</Link></li>
                <li><Link href="/privacy" className="hover:text-[#0E7480]">Privacy Policy</Link></li>
                <li><Link href="/help" className="hover:text-[#0E7480]">Help Centre</Link></li>
                <li><Link href="/careers" className="hover:text-[#0E7480]">Careers</Link></li>
              </ul>
            </div>

            {/* Right: Social Icons */}
            <div className="flex justify-end gap-4">
              <Link href="#" className="text-gray-500 hover:text-gray-700">
                <Facebook className="w-8 h-8" />
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gray-700">
                <Twitter className="w-8 h-8" />
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gray-700">
                <Linkedin className="w-8 h-8" />
              </Link>
              <Link href="#" className="text-gray-500 hover:text-gray-700">
                <Instagram className="w-8 h-8" />
              </Link>
            </div>
          </div>

          {/* Service Links */}
          <div className="mt-8 text-xs text-gray-600">
            <p className="mb-2">
              <Link href="/services/furniture-assembly" className="hover:text-[#0E7480] mr-2">Furniture Assembly</Link>
              <Link href="/services/junk-removal" className="hover:text-[#0E7480] mr-2">Junk Removal</Link>
              <Link href="/services/tv-mounting" className="hover:text-[#0E7480] mr-2">TV Mounting</Link>
              {/* Add more service links as needed */}
            </p>
          </div>

          {/* Copyright */}
          <div className="mt-8 text-center text-xs text-gray-500">
            © 2026 BridgeWork Services on Demand
          </div>
        </div>
      </div>
    </div>
  );
}
