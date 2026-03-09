'use client';

import { useState } from 'react';
import { Send, Loader2, CheckCircle, MapPin, Clock } from 'lucide-react';
import api from '@/lib/api';

export default function ContactPage() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await api.post('/api/contact', form);
      if (res.data.success) {
        setSubmitted(true);
      } else {
        setError(res.data.message || 'Something went wrong.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Message Sent!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for reaching out. We&apos;ll get back to you as soon as possible.
          </p>
          <a
            href="/"
            className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(90deg, #0E7480 0%, #142841 52%, #024B5A 100%)' }}
          >
            Back to Home
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div
        className="py-16 text-center text-white"
        style={{ background: 'linear-gradient(90deg, #0E7480 0%, #142841 52%, #024B5A 100%)' }}
      >
        <h1 className="text-3xl md:text-4xl font-bold mb-2">Contact Us</h1>
        <p className="text-white/80 text-lg max-w-xl mx-auto">
          Have a question or need help? Fill out the form below and we&apos;ll get back to you shortly.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Contact Form */}
          <div className="md:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Send us a message</h2>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      value={form.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      value={form.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+1 (613) 000-0000"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Subject <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="subject"
                      required
                      value={form.subject}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent text-sm"
                    >
                      <option value="">Select a topic</option>
                      <option value="General Inquiry">General Inquiry</option>
                      <option value="Service Question">Service Question</option>
                      <option value="Booking Issue">Booking Issue</option>
                      <option value="Become a Pro">Become a Pro</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Feedback">Feedback</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={handleChange}
                    placeholder="Tell us how we can help..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent text-sm resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(90deg, #0E7480 0%, #142841 52%, #024B5A 100%)' }}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Info</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-[#0E7480] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Service Area</p>
                    <p className="text-sm text-gray-600">Greater Toronto &amp; Ottawa Area</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-[#0E7480] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Response Time</p>
                    <p className="text-sm text-gray-600">We typically respond within 24 hours</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-[#0E7480]/10 to-[#142841]/10 rounded-xl p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Need urgent help?</h3>
              <p className="text-sm text-gray-600 mb-4">
                For emergency services, book directly through our platform for the fastest response.
              </p>
              <a
                href="/services?emergency=true"
                className="inline-block px-5 py-2.5 rounded-lg font-semibold text-white text-sm transition-all"
                style={{ background: 'linear-gradient(90deg, #0E7480 0%, #142841 52%, #024B5A 100%)' }}
              >
                Emergency Services
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
