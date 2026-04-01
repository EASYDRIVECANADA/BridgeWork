'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft,
  MapPin, 
  Calendar, 
  Clock, 
  DollarSign, 
  CheckCircle,
  Loader2,
  User,
  FileText,
  Send,
  Shield,
  MessageSquare
} from 'lucide-react';
import { guestQuotesAPI, settingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function GuestQuoteDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { user, profile } = useSelector((state) => state.auth);
  
  const [assignment, setAssignment] = useState(null);
  const [canSubmitQuote, setCanSubmitQuote] = useState(false);
  const [canEditQuote, setCanEditQuote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taxRate, setTaxRate] = useState(13);
  
  // Form state
  const [quotedPrice, setQuotedPrice] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [warrantyInfo, setWarrantyInfo] = useState('');
  const [notes, setNotes] = useState('');

  const quotedPriceNum = parseFloat(quotedPrice) || 0;
  const taxPreview = quotedPriceNum * (taxRate / 100);
  const totalPreview = quotedPriceNum + taxPreview;

  useEffect(() => {
    if (!user || profile?.role !== 'pro') {
      router.push('/pro-login');
      return;
    }
    fetchAssignmentDetail();
    fetchTaxRate();
  }, [user, profile, router, id]);

  const fetchTaxRate = async () => {
    try {
      const res = await settingsAPI.getTaxRate('quote');
      const rate = res.data?.data?.tax_rate;
      if (rate !== undefined) {
        setTaxRate(rate);
      }
    } catch (err) {
      // Keep default 13%
    }
  };

  const fetchAssignmentDetail = async () => {
    try {
      setLoading(true);
      const res = await guestQuotesAPI.getProAssignmentDetail(id);
      const data = res.data?.data;
      setAssignment(data?.assignment || null);
      setCanSubmitQuote(!!data?.can_submit_quote);
      setCanEditQuote(!!data?.can_edit_quote);
      
      // Pre-fill form if quote was already submitted
      if (data?.assignment) {
        const a = data.assignment;
        if (a.pro_quoted_price) setQuotedPrice(a.pro_quoted_price.toString());
        if (a.pro_quote_description) setDescription(a.pro_quote_description);
        if (a.pro_estimated_duration) setEstimatedDuration(a.pro_estimated_duration);
        if (a.pro_warranty_info) setWarrantyInfo(a.pro_warranty_info);
        if (a.pro_notes) setNotes(a.pro_notes);
      }
    } catch (err) {
      toast.error('Failed to load guest quote assignment');
      router.push('/pro-dashboard?tab=quotes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!assignment || (!canSubmitQuote && !canEditQuote)) {
      toast.error('This request is no longer accepting quotes.');
      return;
    }
    
    if (!quotedPrice || parseFloat(quotedPrice) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    try {
      setSubmitting(true);
      await guestQuotesAPI.proSubmitQuote(id, {
        quoted_price: parseFloat(quotedPrice),
        description: description || undefined,
        estimated_duration: estimatedDuration || undefined,
        warranty_info: warrantyInfo || undefined,
        notes: notes || undefined,
      });
      
      toast.success(canEditQuote ? 'Quotation updated successfully!' : 'Quotation submitted successfully! Admin will review it.');
      router.push('/pro-dashboard?tab=quotes');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  const isFormLocked = !canSubmitQuote && !canEditQuote;

  if (!user || profile?.role !== 'pro') return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Guest Quote Assignment Not Found</h3>
          <p className="text-gray-500 mb-4">This assignment may no longer be available.</p>
          <Link
            href="/pro-dashboard?tab=quotes"
            className="text-[#0E7480] hover:underline font-medium"
          >
            Back to Quote Requests
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {/* Back Button */}
        <Link
          href="/pro-dashboard?tab=quotes"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Quote Requests
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Job Details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0E7480]" />
              Job Details
            </h2>

            {/* Service Info */}
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {assignment.service_name}
              </h3>
              <span className="text-xs text-gray-400 font-mono">{assignment.request_number}</span>
            </div>

            {/* Guest Info */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <div className="w-10 h-10 bg-[#0E7480] rounded-full flex items-center justify-center text-white font-semibold">
                {assignment.guest_name?.charAt(0) || 'G'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{assignment.guest_name || 'Guest'}</p>
                <p className="text-xs text-gray-500">Guest Customer</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{assignment.address}, {assignment.city}, {assignment.state} {assignment.zip_code}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">
                  {assignment.preferred_date
                    ? new Date(assignment.preferred_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'Flexible date'}
                </span>
              </div>
              {assignment.preferred_time && (
                <div className="flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{assignment.preferred_time}</span>
                </div>
              )}
            </div>

            {/* Guest Description / Notes */}
            {assignment.description && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-sm font-medium text-yellow-800 mb-1">Guest Notes</p>
                <p className="text-sm text-yellow-700">{assignment.description}</p>
              </div>
            )}

            {/* Submitted Quote Status */}
            {assignment.pro_quoted_price && (assignment.status === 'pro_quoted' || assignment.status === 'quoted') && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-800">Quote Already Submitted</p>
                </div>
                <p className="text-sm text-green-700">
                  Your quote: <span className="font-bold">${parseFloat(assignment.pro_quoted_price).toFixed(2)}</span>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {assignment.status === 'quoted' ? 'Admin has sent your quote to the guest.' : 'Waiting for admin to review and send to guest.'}
                </p>
              </div>
            )}

            {/* Form Locked Notice */}
            {isFormLocked && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-sm font-medium text-amber-800 mb-1">Quote Submission Closed</p>
                <p className="text-sm text-amber-700">
                  This request is no longer accepting quote submissions. You can still review the job details here.
                </p>
              </div>
            )}
          </div>

          {/* Right: Quote Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#0E7480]" />
              {canEditQuote ? 'Update Your Quote' : canSubmitQuote ? 'Submit Your Quote' : 'Quote Details'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Total Quoted Price Preview */}
              <div className="p-4 bg-gradient-to-r from-[#0E7480]/10 to-[#0E7480]/5 rounded-xl border border-[#0E7480]/20">
                <label className="block text-sm font-medium text-[#0E7480] mb-1">
                  Quoted Price
                </label>
                <div className="text-3xl font-bold text-[#0E7480]">
                  ${quotedPriceNum.toFixed(2)}
                </div>
                {quotedPriceNum > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#0E7480]/20 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Subtotal:</span>
                      <span>${quotedPriceNum.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-600 mt-1">
                      <span>Tax ({taxRate}%):</span>
                      <span>${taxPreview.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-semibold text-gray-900 pt-2 border-t border-[#0E7480]/20 mt-2">
                      <span>Customer Total:</span>
                      <span>${totalPreview.toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Price (before tax) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={quotedPrice}
                    onChange={(e) => setQuotedPrice(e.target.value)}
                    placeholder="0.00"
                    disabled={isFormLocked}
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none"
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Work Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what's included in your quote..."
                  rows={3}
                  disabled={isFormLocked}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none resize-none"
                />
              </div>

              {/* Estimated Duration */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Estimated Duration
                </label>
                <input
                  type="text"
                  value={estimatedDuration}
                  onChange={(e) => setEstimatedDuration(e.target.value)}
                  placeholder="e.g., 2-3 hours"
                  disabled={isFormLocked}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none"
                />
              </div>

              {/* Warranty */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Warranty Information
                </label>
                <input
                  type="text"
                  value={warrantyInfo}
                  onChange={(e) => setWarrantyInfo(e.target.value)}
                  placeholder="e.g., 90-day workmanship warranty"
                  disabled={isFormLocked}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none"
                />
              </div>

              {/* Additional Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Any other information for the admin..."
                  rows={2}
                  disabled={isFormLocked}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !quotedPrice || isFormLocked}
                className="w-full bg-[#0E7480] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#0a5a63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {canEditQuote ? 'Updating...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {isFormLocked ? 'Quote Submission Closed' : canEditQuote ? 'Update Quote' : 'Submit Quote'}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Your quote will be reviewed by admin before being shown to the guest.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
