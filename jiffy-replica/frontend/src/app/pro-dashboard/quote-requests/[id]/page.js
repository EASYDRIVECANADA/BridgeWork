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
  Package,
  Shield,
  MessageSquare,
  Plus,
  Trash2
} from 'lucide-react';
import { bookingsAPI, settingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function SubmitQuotePage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { user, profile } = useSelector((state) => state.auth);
  
  const [booking, setBooking] = useState(null);
  const [myQuotation, setMyQuotation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [taxRate, setTaxRate] = useState(13); // Default 13%, will be fetched from API
  
  // Form state
  const [yourPrice, setYourPrice] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedDuration, setEstimatedDuration] = useState('');
  const [durationUnit, setDurationUnit] = useState('minutes'); // 'minutes' or 'hours'
  const [materialsIncluded, setMaterialsIncluded] = useState(false);
  const [materials, setMaterials] = useState([]); // Array of { name, price }
  const [warrantyInfo, setWarrantyInfo] = useState('');
  const [notes, setNotes] = useState('');

  // Calculate total quoted price (your_price + materials)
  const yourPriceNum = parseFloat(yourPrice) || 0;
  const materialsTotalNum = materials.reduce((sum, m) => sum + (parseFloat(m.price) || 0), 0);
  const quotedPriceNum = yourPriceNum + materialsTotalNum;

  // Add a new material row
  const addMaterial = () => {
    setMaterials([...materials, { name: '', price: '' }]);
  };

  // Update a material
  const updateMaterial = (index, field, value) => {
    const updated = [...materials];
    updated[index][field] = value;
    setMaterials(updated);
  };

  // Remove a material
  const removeMaterial = (index) => {
    setMaterials(materials.filter((_, i) => i !== index));
  };

  useEffect(() => {
    if (!user || profile?.role !== 'pro') {
      router.push('/pro-login');
      return;
    }
    fetchQuoteRequest();
    fetchTaxRate();
  }, [user, profile, router, id]);

  // Fetch tax rate from API (for 'quote' service type since this is free quote flow)
  const fetchTaxRate = async () => {
    try {
      const res = await settingsAPI.getTaxRate('quote');
      const rate = res.data?.data?.tax_rate;
      if (rate !== undefined) {
        setTaxRate(rate);
      }
    } catch (err) {
      console.error('Failed to fetch tax rate:', err);
      // Keep default 13%
    }
  };

  const fetchQuoteRequest = async () => {
    try {
      setLoading(true);
      const res = await bookingsAPI.getQuoteRequestDetail(id);
      const data = res.data?.data;
      setBooking(data?.booking || null);
      setMyQuotation(data?.my_quotation || null);
      
      // Pre-fill form if quote exists
      if (data?.my_quotation) {
        setYourPrice(data.my_quotation.your_price?.toString() || data.my_quotation.quoted_price?.toString() || '');
        setDescription(data.my_quotation.description || '');
        // Handle duration with unit
        const duration = data.my_quotation.estimated_duration;
        const unit = data.my_quotation.duration_unit || 'minutes';
        setEstimatedDuration(duration?.toString() || '');
        setDurationUnit(unit);
        setMaterialsIncluded(data.my_quotation.materials_included || false);
        // Parse materials if stored as JSON
        if (data.my_quotation.materials_list) {
          try {
            const parsedMaterials = typeof data.my_quotation.materials_list === 'string' 
              ? JSON.parse(data.my_quotation.materials_list) 
              : data.my_quotation.materials_list;
            setMaterials(Array.isArray(parsedMaterials) ? parsedMaterials : []);
          } catch {
            setMaterials([]);
          }
        }
        setWarrantyInfo(data.my_quotation.warranty_info || '');
        setNotes(data.my_quotation.notes || '');
      }
    } catch (err) {
      console.error('Failed to fetch quote request:', err);
      toast.error('Failed to load quote request');
      router.push('/pro-dashboard/quote-requests');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!yourPrice || parseFloat(yourPrice) <= 0) {
      toast.error('Please enter a valid price for your work');
      return;
    }

    // Convert duration to minutes for storage
    let durationInMinutes = estimatedDuration ? parseInt(estimatedDuration) : null;
    if (durationInMinutes && durationUnit === 'hours') {
      durationInMinutes = durationInMinutes * 60;
    }

    try {
      setSubmitting(true);
      await bookingsAPI.submitQuotation(id, {
        quoted_price: quotedPriceNum, // Total (your_price + materials)
        your_price: parseFloat(yourPrice),
        description: description || null,
        estimated_duration: durationInMinutes,
        duration_unit: durationUnit,
        materials_included: materialsIncluded,
        materials_list: materialsIncluded && materials.length > 0 ? materials : null,
        warranty_info: warrantyInfo || null,
        notes: notes || null
      });
      
      toast.success(myQuotation ? 'Quotation updated successfully!' : 'Quotation submitted successfully!');
      router.push('/pro-dashboard/quote-requests');
    } catch (err) {
      console.error('Failed to submit quotation:', err);
      toast.error(err.response?.data?.message || 'Failed to submit quotation');
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate tax preview using dynamic tax rate from API
  const taxPreview = quotedPriceNum * (taxRate / 100);
  const totalPreview = quotedPriceNum + taxPreview;

  if (!user || profile?.role !== 'pro') return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Quote Request Not Found</h3>
          <p className="text-gray-500 mb-4">This quote request may no longer be available.</p>
          <Link
            href="/pro-dashboard/quote-requests"
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
          href="/pro-dashboard/quote-requests"
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
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {booking.service_name}
              </h3>
              {booking.services?.description && (
                <p className="text-sm text-gray-600">{booking.services.description}</p>
              )}
            </div>

            {/* Customer */}
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg mb-4">
              <div className="w-10 h-10 bg-[#0E7480] rounded-full flex items-center justify-center text-white font-semibold">
                {booking.profiles?.full_name?.charAt(0) || 'C'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{booking.profiles?.full_name || 'Customer'}</p>
                <p className="text-xs text-gray-500">Customer</p>
              </div>
            </div>

            {/* Details */}
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{booking.address}, {booking.city}, {booking.state} {booking.zip_code}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">
                  {booking.scheduled_date
                    ? new Date(booking.scheduled_date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })
                    : 'Flexible date'}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{booking.scheduled_time || 'Flexible time'}</span>
              </div>
            </div>

            {/* Special Instructions */}
            {booking.special_instructions && (
              <div className="mt-4 p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <p className="text-sm font-medium text-yellow-800 mb-1">Special Instructions</p>
                <p className="text-sm text-yellow-700">{booking.special_instructions}</p>
              </div>
            )}

            {/* Existing Quote Status */}
            {myQuotation && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <p className="text-sm font-medium text-green-800">Quote Already Submitted</p>
                </div>
                <p className="text-sm text-green-700">
                  Your quote: <span className="font-bold">${parseFloat(myQuotation.quoted_price).toFixed(2)}</span>
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Status: {myQuotation.status === 'selected' ? '🎉 Selected!' : myQuotation.status === 'rejected' ? 'Not selected' : 'Pending review'}
                </p>
              </div>
            )}
          </div>

          {/* Right: Quote Form */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#0E7480]" />
              {myQuotation ? 'Update Your Quote' : 'Submit Your Quote'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Total Quoted Price (Read-only, auto-calculated) */}
              <div className="p-4 bg-gradient-to-r from-[#0E7480]/10 to-[#0E7480]/5 rounded-xl border border-[#0E7480]/20">
                <label className="block text-sm font-medium text-[#0E7480] mb-1">
                  Total Quoted Price (auto-calculated)
                </label>
                <div className="text-3xl font-bold text-[#0E7480]">
                  ${quotedPriceNum.toFixed(2)}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  = Your Work Price + Materials
                </p>
                {quotedPriceNum > 0 && (
                  <div className="mt-3 pt-3 border-t border-[#0E7480]/20 text-sm">
                    <div className="flex justify-between text-gray-600">
                      <span>Your Work:</span>
                      <span>${yourPriceNum.toFixed(2)}</span>
                    </div>
                    {materialsTotalNum > 0 && (
                      <div className="flex justify-between text-gray-600">
                        <span>Materials:</span>
                        <span>${materialsTotalNum.toFixed(2)}</span>
                      </div>
                    )}
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

              {/* Your Price (Work Price) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Work Price (before tax) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={yourPrice}
                    onChange={(e) => setYourPrice(e.target.value)}
                    placeholder="0.00"
                    className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">Price for your labor/service only</p>
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none resize-none"
                />
              </div>

              {/* Estimated Duration with Unit Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Estimated Duration
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={estimatedDuration}
                    onChange={(e) => setEstimatedDuration(e.target.value)}
                    placeholder="e.g., 2"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none"
                  />
                  <select
                    value={durationUnit}
                    onChange={(e) => setDurationUnit(e.target.value)}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none bg-white"
                  >
                    <option value="minutes">Minutes</option>
                    <option value="hours">Hours</option>
                  </select>
                </div>
              </div>

              {/* Materials Included Checkbox */}
              <div>
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="materials"
                    checked={materialsIncluded}
                    onChange={(e) => {
                      setMaterialsIncluded(e.target.checked);
                      if (e.target.checked && materials.length === 0) {
                        setMaterials([{ name: '', price: '' }]);
                      }
                    }}
                    className="w-4 h-4 text-[#0E7480] border-gray-300 rounded focus:ring-[#0E7480]"
                  />
                  <label htmlFor="materials" className="text-sm text-gray-700 flex items-center gap-1">
                    <Package className="w-4 h-4 text-gray-400" />
                    Materials/parts included in price
                  </label>
                </div>

                {/* Materials List */}
                {materialsIncluded && (
                  <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-3">Materials List</p>
                    
                    {materials.map((material, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={material.name}
                          onChange={(e) => updateMaterial(index, 'name', e.target.value)}
                          placeholder="Material name"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none text-sm"
                        />
                        <div className="relative w-28">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={material.price}
                            onChange={(e) => updateMaterial(index, 'price', e.target.value)}
                            placeholder="0.00"
                            className="w-full pl-6 pr-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none text-sm"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => removeMaterial(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}

                    <button
                      type="button"
                      onClick={addMaterial}
                      className="flex items-center gap-1 text-sm text-[#0E7480] hover:text-[#0a5a63] font-medium mt-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Material
                    </button>

                    {materialsTotalNum > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between text-sm font-medium">
                        <span>Materials Total:</span>
                        <span className="text-[#0E7480]">${materialsTotalNum.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}
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
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none resize-none"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting || !yourPrice}
                className="w-full bg-[#0E7480] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#0a5a63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    {myQuotation ? 'Updating...' : 'Submitting...'}
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    {myQuotation ? 'Update Quote' : 'Submit Quote'}
                  </>
                )}
              </button>

              <p className="text-xs text-gray-500 text-center">
                Your quote will be reviewed by admin before being shown to the customer.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
