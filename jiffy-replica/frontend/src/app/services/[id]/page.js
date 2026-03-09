'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Image from 'next/image';
import Link from 'next/link';
import { Star, MapPin, CheckCircle, Calendar, Clock, Loader2 } from 'lucide-react';
import { servicesAPI, bookingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);
  const serviceId = params.id;

  const [apiService, setApiService] = useState(null);
  const [loadingService, setLoadingService] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    address: '',
    city: '',
    state: '',
    zip_code: '',
    scheduled_date: '',
    scheduled_time: '09:00',
    special_instructions: '',
    promo_code: '',
  });

  // All services data - SAME as ServicesPage to recycle images
  const allServices = [
    { id: 1, name: 'BBQ Cleaning & Repair', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=400', category: 'Cleaning' },
    { id: 2, name: 'Carpet & Upholstery Cleaning', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=400', category: 'Cleaning' },
    { id: 3, name: 'Dryer Vent Cleaning', image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?q=80&w=400', category: 'Cleaning' },
    { id: 4, name: 'Duct Cleaning', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Cleaning' },
    { id: 5, name: 'Junk Removal', image: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?q=80&w=400', category: 'Cleaning' },
    { id: 6, name: 'Mold Remediation', image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?q=80&w=400', category: 'Cleaning' },
    { id: 7, name: 'Powerwash, Stain & Seal', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400', category: 'Cleaning' },
    { id: 8, name: 'Tile & Grout Cleaning', image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?q=80&w=400', category: 'Cleaning' },
    { id: 9, name: 'Appliance Repair', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400', category: 'Indoors' },
    { id: 10, name: 'Drywall Repair', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400', category: 'Indoors' },
    { id: 11, name: 'Flooring', image: 'https://images.unsplash.com/photo-1615875474908-f403116f5287?q=80&w=400', category: 'Indoors' },
    { id: 12, name: 'Interior Painting', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=400', category: 'Indoors' },
    { id: 13, name: 'Plumbing', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400', category: 'Indoors' },
    { id: 14, name: 'Tile Installation', image: 'https://images.unsplash.com/photo-1585421514738-01798e348b17?q=80&w=400', category: 'Indoors' },
    { id: 15, name: 'Appliance Install', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400', category: 'Install' },
    { id: 16, name: 'Electrical', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400', category: 'Install' },
    { id: 17, name: 'Flooring', image: 'https://images.unsplash.com/photo-1615875474908-f403116f5287?q=80&w=400', category: 'Install' },
    { id: 18, name: 'Furniture Assembly', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=400', category: 'Install' },
    { id: 19, name: 'Gas Services', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400', category: 'Install' },
    { id: 20, name: 'Handyman Services', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Install' },
    { id: 21, name: 'Heating & Cooling', image: 'https://images.unsplash.com/photo-1635274531661-1c5a5e9b0d3d?q=80&w=400', category: 'Install' },
    { id: 22, name: 'Locksmith', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=400', category: 'Install' },
    { id: 23, name: 'Plumbing', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400', category: 'Install' },
    { id: 24, name: 'Home Essentials', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=400', category: 'BridgeWork Shop' },
    { id: 25, name: 'Tools & Equipment', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400', category: 'BridgeWork Shop' },
    { id: 26, name: 'Smart Home Devices', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=400', category: 'BridgeWork Shop' },
    { id: 27, name: 'Deck & Fence Repair', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400', category: 'Outdoors' },
    { id: 28, name: 'Exterior Painting', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400', category: 'Outdoors' },
    { id: 29, name: 'Gutter Cleaning', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Outdoors' },
    { id: 30, name: 'Landscaping', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', category: 'Outdoors' },
    { id: 31, name: 'Lawn Mowing', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', category: 'Outdoors' },
    { id: 32, name: 'Pressure Washing', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400', category: 'Outdoors' },
    { id: 33, name: 'Appliance Repair', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400', category: 'Repair' },
    { id: 34, name: 'Drywall Repair', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400', category: 'Repair' },
    { id: 35, name: 'Electrical Repair', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400', category: 'Repair' },
    { id: 36, name: 'Plumbing Repair', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400', category: 'Repair' },
    { id: 37, name: 'Roof Repair', image: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?q=80&w=400', category: 'Repair' },
    { id: 38, name: 'Snow Removal', image: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?q=80&w=400', category: 'Seasonal' },
    { id: 39, name: 'Holiday Decorating', image: 'https://images.unsplash.com/photo-1512389142860-9c449e58a543?q=80&w=400', category: 'Seasonal' },
    { id: 40, name: 'Spring Cleaning', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Seasonal' },
    { id: 41, name: 'Winterization', image: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?q=80&w=400', category: 'Seasonal' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380e01', name: 'Emergency HVAC', image: 'https://images.unsplash.com/photo-1635274531661-1c5a5e9b0d3d?q=80&w=400', category: 'Emergency' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380e02', name: 'Emergency Plumbing', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400', category: 'Emergency' },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380e03', name: 'Emergency Electrical', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400', category: 'Emergency' },
  ];

  // Fetch real service data from API
  useEffect(() => {
    const fetchService = async () => {
      try {
        // First try direct ID lookup (works if serviceId is a UUID)
        const res = await servicesAPI.getById(serviceId);
        setApiService(res.data.data.service);
        console.log('[SERVICE] Found service by ID:', res.data.data.service?.name);
      } catch (err) {
        console.log('[SERVICE] Service not found by ID, trying name match...');
        // If numeric ID (mock), find the mock service name and match to a real DB service
        try {
          const allRes = await servicesAPI.getAll();
          const dbServices = allRes.data?.data?.services || [];
          if (dbServices.length > 0) {
            // Find the mock service by numeric ID to get its name
            const mockService = allServices.find(s => s.id === parseInt(serviceId));
            if (mockService) {
              // Try exact name match first
              const matched = dbServices.find(
                (s) => s.name.toLowerCase() === mockService.name.toLowerCase()
              );
              if (matched) {
                setApiService(matched);
                console.log('[SERVICE] Matched DB service by name:', matched.name);
              } else {
                // Try partial/fuzzy match (e.g. "Plumbing" matches "Plumbing Repair")
                const partial = dbServices.find(
                  (s) =>
                    s.name.toLowerCase().includes(mockService.name.toLowerCase()) ||
                    mockService.name.toLowerCase().includes(s.name.toLowerCase())
                );
                if (partial) {
                  setApiService(partial);
                  console.log('[SERVICE] Partial matched DB service:', partial.name);
                } else {
                  // No exact/partial match — use first DB service as fallback so booking works
                  // The correct mock service name will be sent via service_name override
                  setApiService({ ...dbServices[0], _fallbackName: mockService.name });
                  console.log('[SERVICE] No DB name match for:', mockService.name, '- using fallback service ID for booking');
                }
              }
            } else {
              console.log('[SERVICE] Mock service not found for ID:', serviceId);
            }
          }
        } catch (e) {
          console.log('[SERVICE] Could not fetch services list, using mock data only');
        }
      }
      setLoadingService(false);
    };
    fetchService();
  }, [serviceId]);

  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    console.log('[BOOKING] handleBookingSubmit called', { user: !!user, apiService: !!apiService, serviceId });
    if (!user) {
      toast.info('Please log in to book a service.');
      router.push('/login');
      return;
    }
    if (!apiService) {
      toast.error('This service is not available for booking yet. Please try another service.');
      return;
    }
    if (!bookingForm.address || !bookingForm.city || !bookingForm.state || !bookingForm.zip_code || !bookingForm.scheduled_date) {
      toast.error('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    const payload = {
      service_id: apiService?.id || serviceId,
      scheduled_date: bookingForm.scheduled_date,
      scheduled_time: bookingForm.scheduled_time,
      address: bookingForm.address,
      city: bookingForm.city,
      state: bookingForm.state,
      zip_code: bookingForm.zip_code,
      special_instructions: bookingForm.special_instructions,
      promo_code: bookingForm.promo_code || undefined,
      // If we used a fallback service, override the name with the correct mock service name
      ...(apiService?._fallbackName ? { service_name_override: apiService._fallbackName } : {}),
    };
    console.log('[BOOKING] Sending payload:', payload);
    try {
      const res = await bookingsAPI.create(payload);
      console.log('[BOOKING] Success:', res.data);
      const newBooking = res.data.data.booking;
      toast.success('Booking created! Proceed to payment.');
      router.push(`/checkout/${newBooking.id}`);
    } catch (err) {
      console.error('[BOOKING] Error:', err.response?.status, err.response?.data || err.message);
      toast.error(err.response?.data?.message || 'Failed to create booking. Please try again.');
    }
    setSubmitting(false);
  };

  // Find the specific service - RECYCLING THE IMAGE
  // Compare as strings to support both numeric IDs and UUIDs
  const service = allServices.find(s => String(s.id) === String(serviceId));

  if (!service && loadingService) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
      </div>
    );
  }

  if (!service && !apiService && !loadingService) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Service not found</p>
      </div>
    );
  }

  // Build display data: prefer mock for image, use apiService for real data
  const displayName = apiService?.name || service?.name || 'Service';
  const displayImage = service?.image || apiService?.image_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400';
  const displayDescription = apiService?.description || '';

  return (
    <div className="min-h-screen bg-gray-50">
  {/* Hero Image Section */}
  <div className="relative h-[400px] w-full">
    <Image
      src={displayImage}
      alt={displayName}
      fill
      className="object-cover"
      priority
    />
  </div>

  {/* Content Boxes - Now in normal flow */}
  <div className="max-w-7xl mx-auto px-4 -mt-32 pb-8 relative z-10">
    <div className="grid lg:grid-cols-3 gap-6 w-full">
      {/* Left Box - Service Details */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-xl p-6">
                  {/* Service Title and Rating */}
                  <h1 className="text-2xl font-bold text-gray-900 mb-3">
                    {displayName} in Boston
                  </h1>
                  <div className="flex items-center gap-3 text-xs mb-4">
                    <div className="flex items-center gap-1">
                      <div className="flex">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                      <span className="text-gray-600 ml-1">4.9 (2,854 reviews)</span>
                    </div>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-600">837 jobs booked this week</span>
                  </div>

                  {/* Get a confirmed job section */}
                  <div className="mb-4">
                    <h2 className="text-base font-bold text-gray-900 mb-2">
                      Get a confirmed job in minutes
                    </h2>
                    <p className="text-xs text-gray-700 mb-2 leading-relaxed">
                      Technicians are mobile or centrally arrived at trades and medics of appliances. For gas stovetops/ovens, please request in the Gas Services category.
                    </p>
                    <p className="text-xs text-gray-600">
                      Not sure if this is the right service for you? <Link href="/chat" className="text-[#0E7480] hover:underline">Chat with us</Link>.
                    </p>
                  </div>

                  {/* Customers use this service for */}
                  <div className="mb-6">
                    <h3 className="text-base font-bold text-gray-900 mb-3">
                      Customers use this service for
                    </h3>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="text-sm text-gray-700">Dishwasher Install</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="text-sm text-gray-700">Washer Install</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="text-sm text-gray-700">Dryer Install</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="text-sm text-gray-700">Range Install</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="text-sm text-gray-700">Garbage Disposal Install</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="text-sm text-gray-700">Fridge Install</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="text-sm text-gray-700">Hood Fan Install</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="text-sm text-gray-700">Appliance Uninstallation</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-green-600 text-sm">✓</span>
                        <span className="text-sm text-gray-700">And much more!</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mt-3">
                      Not sure if this is the right service for you? <Link href="/chat" className="text-[#0E7480] hover:underline">Chat with us</Link>.
                    </p>
                  </div>

                  {/* How it works */}
                  <div className="mb-6 bg-gray-50 rounded-lg p-4">
                    <h3 className="text-base font-bold text-gray-900 mb-4">How it works</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="flex flex-col items-start">
                        <div className="flex-shrink-0 w-7 h-7 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm mb-2">
                          1
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          Tell us what you need done and select a date and time that works for you.
                        </p>
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="flex-shrink-0 w-7 h-7 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm mb-2">
                          2
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          Submit your job request and get matched with a Certified BridgeWork Pro in minutes!
                        </p>
                      </div>
                      <div className="flex flex-col items-start">
                        <div className="flex-shrink-0 w-7 h-7 bg-black text-white rounded-full flex items-center justify-center font-bold text-sm mb-2">
                          3
                        </div>
                        <p className="text-xs text-gray-700 leading-relaxed">
                          Chat with your Pro to discuss any further details before the job is set to begin.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Certified BridgeWork Pros */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-base font-bold text-gray-900 mb-2">
                      Certified BridgeWork Pros
                    </h3>
                    <p className="text-sm text-gray-700">
                      All BridgeWork Pros are insured, qualified and background-checked. Pros are highly rated by our customers and they must maintain a minimum <strong>90% approval rating</strong>.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Box - Booking Card */}
      <div className="lg:col-span-1">
        <div className="bg-white rounded-lg shadow-xl p-6 sticky top-28">
                  <h3 className="text-base font-bold text-gray-900 mb-3 text-center">Book Job</h3>
                  
                  <div className="text-center mb-3">
                    <p className="text-xs text-gray-600 mb-1">Starting from</p>
                    <div className="text-3xl font-bold text-gray-900">
                      ${apiService?.base_price || '180'}
                    </div>
                    <div className="text-xs text-gray-600 mt-1">
                      {apiService?.pricing_type === 'hourly' ? 'per hour' : 'flat fee'}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 my-3"></div>

                  <form onSubmit={handleBookingSubmit} className="space-y-3">
                    {/* Date & Time */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Preferred Date *
                      </label>
                      <input
                        type="date"
                        required
                        min={new Date().toISOString().split('T')[0]}
                        value={bookingForm.scheduled_date}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, scheduled_date: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E7480] text-xs"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        <Clock className="w-3 h-3 inline mr-1" />
                        Preferred Time *
                      </label>
                      <select
                        value={bookingForm.scheduled_time}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, scheduled_time: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E7480] text-xs"
                      >
                        <option value="08:00">8:00 AM</option>
                        <option value="09:00">9:00 AM</option>
                        <option value="10:00">10:00 AM</option>
                        <option value="11:00">11:00 AM</option>
                        <option value="12:00">12:00 PM</option>
                        <option value="13:00">1:00 PM</option>
                        <option value="14:00">2:00 PM</option>
                        <option value="15:00">3:00 PM</option>
                        <option value="16:00">4:00 PM</option>
                        <option value="17:00">5:00 PM</option>
                      </select>
                    </div>

                    <div className="border-t border-gray-200 my-2"></div>

                    {/* Address */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        Street Address *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 36 Treyon Street"
                        value={bookingForm.address}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, address: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E7480] text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">City *</label>
                        <input
                          type="text"
                          required
                          placeholder="Toronto"
                          value={bookingForm.city}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, city: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E7480] text-xs"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Province *</label>
                        <input
                          type="text"
                          required
                          placeholder="ON"
                          value={bookingForm.state}
                          onChange={(e) => setBookingForm(prev => ({ ...prev, state: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E7480] text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Postal Code *</label>
                      <input
                        type="text"
                        required
                        placeholder="M5V 2T6"
                        value={bookingForm.zip_code}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, zip_code: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E7480] text-xs"
                      />
                    </div>

                    {/* Special Instructions */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Special Instructions</label>
                      <textarea
                        rows={2}
                        placeholder="Any details the pro should know..."
                        value={bookingForm.special_instructions}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, special_instructions: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E7480] text-xs resize-none"
                      />
                    </div>

                    {/* Promo Code */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Promo Code</label>
                      <input
                        type="text"
                        placeholder="Enter promo code"
                        value={bookingForm.promo_code}
                        onChange={(e) => setBookingForm(prev => ({ ...prev, promo_code: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E7480] text-xs"
                      />
                    </div>

                    {/* Submit */}
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-[#0E7480] text-white py-2.5 rounded font-semibold hover:bg-[#2570d4] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Booking...
                        </>
                      ) : (
                        'Book Now'
                      )}
                    </button>

                    <p className="text-xs text-center text-gray-600">
                      You won&apos;t be charged until the job is complete
                    </p>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
  );
}
