'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import Image from 'next/image';
import Link from 'next/link';
import { MapPin, CheckCircle, Calendar, Clock, Loader2 } from 'lucide-react';
import { servicesAPI, bookingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);
  const serviceId = params.id;
  const initialServiceType = searchParams.get('type') || 'rate'; // 'rate' or 'emergency'
  
  const [serviceType, setServiceType] = useState(initialServiceType);
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

  // Pricing data for each service
  const servicePricing = {
    'Mulch Area': { model: 'per project', range: '$150 – $500' },
    'Electrical': { model: 'hourly', range: '$100 – $150 / hr' },
    'Decks & Fences': { model: 'project', range: '$500 – $3,500' },
    'Junk Removal': { model: 'volume', range: '$150 – $700' },
    'Seasonal Lawn Maintenance': { model: 'seasonal package', range: '$200 – $600' },
    'Plumbing': { model: 'hourly', range: '$100 – $160 / hr' },
    'Tile & Grout Cleaning': { model: 'per room', range: '$120 – $300' },
    'Appliance Repair': { model: 'diagnostic + labor', range: '$120 – $350' },
    'Carpet & Upholstery Cleaning': { model: 'per room/item', range: '$80 – $250' },
    'Window & Eaves Cleaning': { model: 'per house', range: '$120 – $350' },
    'Dryer Vent Cleaning': { model: 'per vent', range: '$90 – $180' },
    'Handyman Services': { model: 'hourly', range: '$80 – $120 / hr' },
    'Dishwasher Installation': { model: 'per install', range: '$120 – $250' },
    'Pest Control': { model: 'per treatment', range: '$150 – $400' },
    'Sod Installation': { model: 'per sq ft', range: '$1,000 – $3,500' },
    'Heating & Cooling': { model: 'hourly', range: '$120 – $180 / hr' },
    'Sprinkler Winterization': { model: 'per system', range: '$90 – $180' },
    'Water & Sewage Damage': { model: 'project', range: '$1,500 – $5,000' },
    'Stone and Interlock': { model: 'per project', range: '$2,000 – $8,000' },
    'Duct Cleaning': { model: 'per home', range: '$300 – $600' },
    'Exterior Caulking': { model: 'project', range: '$200 – $600' },
    'Painting': { model: 'per room', range: '$250 – $800' },
    'Flooring': { model: 'per sq ft', range: '$1,500 – $6,000' },
    'Roofing': { model: 'project', range: '$2,500 – $12,000' },
    'Garage Door Repair': { model: 'per repair', range: '$150 – $400' },
    'Deep Cleaning': { model: 'per house', range: '$200 – $500' },
    'Locksmith': { model: 'per service', range: '$120 – $300' },
    'Moving & Delivery': { model: 'hourly', range: '$120 – $180 / hr' },
    'Drywall Repair': { model: 'per repair', range: '$150 – $500' },
    'Gas Services': { model: 'hourly', range: '$120 – $180 / hr' },
    'TV Mounting': { model: 'per TV', range: '$100 – $250' },
    'Wasp Treatment': { model: 'per nest', range: '$120 – $250' },
    'Organizing, Decluttering & Packing': { model: 'hourly', range: '$70 – $120 / hr' },
    'Furniture Assembly': { model: 'per item', range: '$80 – $200' },
    'BBQ Cleaning & Repair': { model: 'per BBQ', range: '$120 – $250' },
    'Smart Home Install': { model: 'per device', range: '$80 – $200' },
    'Yard Clean Up': { model: 'project', range: '$120 – $400' },
    'Appliance Install': { model: 'per appliance', range: '$120 – $300' },
    'Artificial Turf': { model: 'per project', range: '$2,000 – $6,000' },
    'Tree Services': { model: 'per job', range: '$250 – $1,200' },
    'Eavestrough Repair': { model: 'repair', range: '$150 – $450' },
    'Powerwash, Stain & Seal': { model: 'project', range: '$200 – $800' },
    'Furnace Tune-Up': { model: 'service', range: '$120 – $220' },
    'Pest Control Annual Check-Up': { model: 'yearly', range: '$200 – $400' },
    'Gas Fireplace Tune-Up': { model: 'service', range: '$120 – $200' },
    'AC Tune-Up': { model: 'service', range: '$120 – $220' },
    'Lawn Maintenance': { model: 'per visit', range: '$40 – $120' },
    'Bathtub & Shower Caulking': { model: 'per job', range: '$120 – $250' },
  };

  // All services data - includes rate property for residential services
  // Rate: 'yes' = shows price range, 'quote' = shows Free Quote
  const allServices = [
    // Residential General Services (IDs 1-11 from services page)
    { id: 1, name: 'Electrical', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400', category: 'General Services', pricing: servicePricing['Electrical'], rate: 'yes' },
    { id: 2, name: 'Plumbing', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400', category: 'General Services', pricing: servicePricing['Plumbing'], rate: 'yes' },
    { id: 3, name: 'Painting', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=400', category: 'General Services', pricing: servicePricing['Painting'], rate: 'quote' },
    { id: 4, name: 'Drywall & Mudding', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400', category: 'General Services', pricing: servicePricing['Drywall Repair'], rate: 'quote' },
    { id: 5, name: 'HVAC (Heating & Cooling)', image: 'https://images.unsplash.com/photo-1635274531661-1c5a5e9b0d3d?q=80&w=400', category: 'General Services', pricing: servicePricing['Heating & Cooling'], rate: 'yes' },
    { id: 6, name: 'Roofing', image: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?q=80&w=400', category: 'General Services', pricing: servicePricing['Roofing'], rate: 'yes' },
    { id: 7, name: 'Eavestroughs', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'General Services', pricing: servicePricing['Eavestrough Repair'], rate: 'quote' },
    { id: 8, name: 'Windows & Doors', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'General Services', pricing: servicePricing['Window & Eaves Cleaning'], rate: 'quote' },
    { id: 9, name: 'Decks & Fences', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400', category: 'General Services', pricing: servicePricing['Decks & Fences'], rate: 'quote' },
    { id: 10, name: 'Windows', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'General Services', pricing: servicePricing['Window & Eaves Cleaning'], rate: 'quote' },
    { id: 11, name: 'Landscaping', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', category: 'General Services', pricing: servicePricing['Lawn Maintenance'], rate: 'quote' },
    // Residential Repairs & Service (IDs 12-16 from services page)
    { id: 12, name: 'Appliance Repair & Install', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400', category: 'Repairs & Service', pricing: servicePricing['Appliance Repair'], rate: 'yes', emergency: 'no' },
    { id: 13, name: 'Handyman', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Repairs & Service', pricing: servicePricing['Handyman Services'], rate: 'yes', emergency: 'yes' },
    { id: 14, name: 'Locksmith', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=400', category: 'Repairs & Service', pricing: servicePricing['Locksmith'], rate: 'yes', emergency: 'yes' },
    { id: 15, name: 'Smart Home Install', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=400', category: 'Repairs & Service', pricing: servicePricing['Smart Home Install'], rate: 'quote', emergency: 'no' },
    { id: 16, name: 'House Cleaning', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Repairs & Service', pricing: servicePricing['Deep Cleaning'], rate: 'yes', emergency: 'no' },
    // Commercial Services (IDs 101-109)
    { id: 101, name: 'Concrete', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400', category: 'Commercial Services', pricing: servicePricing['Drywall Repair'], rate: 'quote', emergency: 'no' },
    { id: 102, name: 'Electrical', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400', category: 'Commercial Services', pricing: servicePricing['Electrical'], rate: 'quote', emergency: 'no' },
    { id: 103, name: 'Plumbing', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400', category: 'Commercial Services', pricing: servicePricing['Plumbing'], rate: 'quote', emergency: 'no' },
    { id: 104, name: 'Painting', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=400', category: 'Commercial Services', pricing: servicePricing['Painting'], rate: 'quote', emergency: 'no' },
    { id: 105, name: 'Drywall & Mudding', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400', category: 'Commercial Services', pricing: servicePricing['Drywall Repair'], rate: 'quote', emergency: 'no' },
    { id: 106, name: 'HVAC (Heating & Cooling)', image: 'https://images.unsplash.com/photo-1635274531661-1c5a5e9b0d3d?q=80&w=400', category: 'Commercial Services', pricing: servicePricing['Heating & Cooling'], rate: 'quote', emergency: 'no' },
    { id: 107, name: 'Roofing', image: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?q=80&w=400', category: 'Commercial Services', pricing: servicePricing['Roofing'], rate: 'quote', emergency: 'no' },
    { id: 108, name: 'Windows & Doors', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Commercial Services', pricing: servicePricing['Window & Eaves Cleaning'], rate: 'quote', emergency: 'no' },
    { id: 109, name: 'Landscaping', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', category: 'Commercial Services', pricing: servicePricing['Lawn Maintenance'], rate: 'quote', emergency: 'no' },
    // Legacy services for backward compatibility
    { id: 17, name: 'Appliance Install', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400', category: 'Install', pricing: servicePricing['Appliance Install'] },
    { id: 18, name: 'Electrical', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400', category: 'Install', pricing: servicePricing['Electrical'] },
    { id: 19, name: 'Furniture Assembly', image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=400', category: 'Install', pricing: servicePricing['Furniture Assembly'] },
    { id: 20, name: 'Gas Services', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400', category: 'Install', pricing: servicePricing['Gas Services'] },
    { id: 21, name: 'Handyman Services', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Install', pricing: servicePricing['Handyman Services'] },
    { id: 22, name: 'Heating & Cooling', image: 'https://images.unsplash.com/photo-1635274531661-1c5a5e9b0d3d?q=80&w=400', category: 'Install', pricing: servicePricing['Heating & Cooling'] },
    { id: 23, name: 'Locksmith', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?q=80&w=400', category: 'Install', pricing: servicePricing['Locksmith'] },
    { id: 24, name: 'Dishwasher Installation', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400', category: 'Install', pricing: servicePricing['Dishwasher Installation'] },
    { id: 25, name: 'TV Mounting', image: 'https://images.unsplash.com/photo-1593359677879-a4bb92f829d1?q=80&w=400', category: 'Install', pricing: servicePricing['TV Mounting'] },
    { id: 26, name: 'Smart Home Install', image: 'https://images.unsplash.com/photo-1558002038-1055907df827?q=80&w=400', category: 'Install', pricing: servicePricing['Smart Home Install'] },
    { id: 27, name: 'Decks & Fences', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400', category: 'Outdoors', pricing: servicePricing['Decks & Fences'] },
    { id: 28, name: 'Lawn Maintenance', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', category: 'Outdoors', pricing: servicePricing['Lawn Maintenance'] },
    { id: 29, name: 'Seasonal Lawn Maintenance', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', category: 'Outdoors', pricing: servicePricing['Seasonal Lawn Maintenance'] },
    { id: 30, name: 'Sod Installation', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', category: 'Outdoors', pricing: servicePricing['Sod Installation'] },
    { id: 31, name: 'Mulch Area', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', category: 'Outdoors', pricing: servicePricing['Mulch Area'] },
    { id: 32, name: 'Yard Clean Up', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', category: 'Outdoors', pricing: servicePricing['Yard Clean Up'] },
    { id: 33, name: 'Tree Services', image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?q=80&w=400', category: 'Outdoors', pricing: servicePricing['Tree Services'] },
    { id: 34, name: 'Stone and Interlock', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400', category: 'Outdoors', pricing: servicePricing['Stone and Interlock'] },
    { id: 35, name: 'Artificial Turf', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=400', category: 'Outdoors', pricing: servicePricing['Artificial Turf'] },
    { id: 36, name: 'Exterior Caulking', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400', category: 'Outdoors', pricing: servicePricing['Exterior Caulking'] },
    { id: 37, name: 'Appliance Repair', image: 'https://images.unsplash.com/photo-1585659722983-3a675dabf23d?q=80&w=400', category: 'Repair', pricing: servicePricing['Appliance Repair'] },
    { id: 38, name: 'Drywall Repair', image: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?q=80&w=400', category: 'Repair', pricing: servicePricing['Drywall Repair'] },
    { id: 39, name: 'Electrical', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=400', category: 'Repair', pricing: servicePricing['Electrical'] },
    { id: 40, name: 'Plumbing', image: 'https://images.unsplash.com/photo-1607472586893-edb57bdc0e39?q=80&w=400', category: 'Repair', pricing: servicePricing['Plumbing'] },
    { id: 41, name: 'Roofing', image: 'https://images.unsplash.com/photo-1632778149955-e80f8ceca2e8?q=80&w=400', category: 'Repair', pricing: servicePricing['Roofing'] },
    { id: 42, name: 'Garage Door Repair', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=400', category: 'Repair', pricing: servicePricing['Garage Door Repair'] },
    { id: 43, name: 'Eavestrough Repair', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Repair', pricing: servicePricing['Eavestrough Repair'] },
    { id: 44, name: 'Sprinkler Winterization', image: 'https://images.unsplash.com/photo-1483664852095-d6cc6870702d?q=80&w=400', category: 'Seasonal', pricing: servicePricing['Sprinkler Winterization'] },
    { id: 45, name: 'Furnace Tune-Up', image: 'https://images.unsplash.com/photo-1635274531661-1c5a5e9b0d3d?q=80&w=400', category: 'Seasonal', pricing: servicePricing['Furnace Tune-Up'] },
    { id: 46, name: 'AC Tune-Up', image: 'https://images.unsplash.com/photo-1635274531661-1c5a5e9b0d3d?q=80&w=400', category: 'Seasonal', pricing: servicePricing['AC Tune-Up'] },
    { id: 47, name: 'Gas Fireplace Tune-Up', image: 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?q=80&w=400', category: 'Seasonal', pricing: servicePricing['Gas Fireplace Tune-Up'] },
    { id: 48, name: 'Pest Control Annual Check-Up', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Seasonal', pricing: servicePricing['Pest Control Annual Check-Up'] },
    { id: 49, name: 'Water & Sewage Damage', image: 'https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?q=80&w=400', category: 'Emergency', pricing: servicePricing['Water & Sewage Damage'] },
    { id: 50, name: 'Pest Control', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Emergency', pricing: servicePricing['Pest Control'] },
    { id: 51, name: 'Wasp Treatment', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'Emergency', pricing: servicePricing['Wasp Treatment'] },
    { id: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380f01', name: 'QA Test Service ($1)', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400', category: 'QA Testing' },
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

  // Set default service type based on service settings when loaded
  useEffect(() => {
    if (apiService) {
      const hasFreeQuote = apiService.rate === 'quote' || apiService.pricing_type === 'custom';
      const hasRate = apiService.rate === 'yes';
      const hasEmergency = apiService.emergency === 'yes';
      
      // Set default based on URL param first, then service settings
      if (initialServiceType === 'emergency' && hasEmergency) {
        setServiceType('emergency');
      } else if (hasFreeQuote) {
        setServiceType('quote');
      } else if (hasRate) {
        setServiceType('rate');
      } else if (hasEmergency) {
        setServiceType('emergency');
      }
    }
  }, [apiService, initialServiceType]);

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
      
      // Check if this is a Free Quote booking (status will be 'quote_pending')
      const isFreeQuote = newBooking.status === 'quote_pending' || newBooking.is_free_quote;
      
      if (isFreeQuote) {
        // Free Quote: redirect to dashboard with success message
        toast.success('Quote request submitted! Our team will review and provide a quote shortly.');
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push('/dashboard');
      } else {
        // Regular booking: redirect to checkout for payment
        toast.success('Booking created! Proceed to payment.');
        await new Promise(resolve => setTimeout(resolve, 500));
        router.push(`/checkout/${newBooking.id}`);
      }
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

  // Build display data: prefer mock service name for display, use apiService for booking
  // Use mock service name to avoid database names that might include "Emergency" prefix
  const baseServiceName = service?.name || apiService?.name || 'Service';
  // Remove any existing "Emergency" prefix from the name to avoid duplication
  const displayName = baseServiceName.replace(/^Emergency\s+/i, '');
  const displayImage = service?.image || apiService?.image_url || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400';
  const displayDescription = apiService?.description || '';
  const displayPricing = service?.pricing || null;

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
        <div className={`bg-white rounded-lg shadow-xl p-6 ${serviceType === 'emergency' ? 'border-2 border-red-500' : ''}`}>
                  {/* Emergency Banner */}
                  {serviceType === 'emergency' && (
                    <div className="bg-red-100 text-red-700 text-sm font-semibold px-4 py-2 rounded-lg text-center mb-4">
                      🚨 EMERGENCY SERVICE REQUEST
                    </div>
                  )}
                  
                  {/* Service Title and Rating */}
                  <h1 className={`text-2xl font-bold mb-3 ${serviceType === 'emergency' ? 'text-red-600' : 'text-gray-900'}`}>
                    {serviceType === 'emergency' ? `Emergency ${displayName}` : displayName} Service
                  </h1>

                  {/* Service Description */}
                  {displayDescription && (
                    <div className="mb-4">
                      <h3 className="text-base font-bold text-gray-900 mb-2">About this service</h3>
                      <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{displayDescription}</p>
                    </div>
                  )}

                  {/* Get a confirmed job section */}
                  <div className="mb-4">
                    {serviceType === 'emergency' ? (
                      <>
                        <h2 className="text-base font-bold text-red-600 mb-2">
                          🚨 Urgent {displayName} Assistance
                        </h2>
                        <p className="text-xs text-gray-700 mb-2 leading-relaxed">
                          Our emergency {displayName?.toLowerCase()} team is available 24/7 for urgent issues. We prioritize emergency calls and dispatch certified professionals immediately to address your critical {displayName?.toLowerCase()} needs.
                        </p>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
                          <p className="text-xs text-red-700 font-medium">⚡ What to expect:</p>
                          <ul className="text-xs text-red-600 mt-1 list-disc list-inside">
                            <li>Priority dispatch within 30-60 minutes</li>
                            <li>After-hours and weekend availability</li>
                            <li>Emergency rates apply</li>
                          </ul>
                        </div>
                      </>
                    ) : (
                      <>
                        <h2 className="text-base font-bold text-gray-900 mb-2">
                          Get a confirmed job in minutes
                        </h2>
                        <p className="text-xs text-gray-700 mb-2 leading-relaxed">
                          Our certified {displayName?.toLowerCase()} professionals are ready to help with all your {displayName?.toLowerCase()} needs. Book now and get matched with a qualified pro in your area.
                        </p>
                      </>
                    )}
                    <p className="text-xs text-gray-600">
                      Not sure if this is the right service for you? <Link href="/chat" className="text-[#0E7480] hover:underline">Chat with us</Link>.
                    </p>
                  </div>

                  {/* Customers use this service for */}
                  {(apiService?.use_cases && apiService.use_cases.length > 0) && (
                    <div className="mb-6">
                      <h3 className="text-base font-bold text-gray-900 mb-3">
                        Customers use this service for
                      </h3>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                        {apiService.use_cases.map((useCase, idx) => (
                          <div key={idx} className="flex items-center gap-2">
                            <span className="text-green-600 text-sm">✓</span>
                            <span className="text-sm text-gray-700">{useCase}</span>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-600 mt-3">
                        Not sure if this is the right service for you? <Link href="/chat" className="text-[#0E7480] hover:underline">Chat with us</Link>.
                      </p>
                    </div>
                  )}

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
                  <h3 className="text-base font-bold text-gray-900 mb-4 text-center">Book {displayName}</h3>
                  
                  {/* Service Type Selection Cards - Dynamic based on admin settings */}
                  {(() => {
                    // Determine available options from service settings
                    const hasFreeQuote = apiService?.rate === 'quote' || apiService?.pricing_type === 'custom';
                    const hasRate = apiService?.rate === 'yes';
                    const hasEmergency = apiService?.emergency === 'yes';
                    
                    // Count how many options are available
                    const optionCount = [hasFreeQuote, hasRate, hasEmergency].filter(Boolean).length;
                    
                    // Only show selection cards if there are multiple options
                    if (optionCount <= 1) return null;
                    
                    // Determine grid columns based on option count
                    const gridCols = optionCount === 3 ? 'grid-cols-3' : 'grid-cols-2';
                    
                    return (
                      <div className={`grid ${gridCols} gap-3 mb-4`}>
                        {/* Free Quote Card */}
                        {hasFreeQuote && (
                          <button
                            type="button"
                            onClick={() => setServiceType('quote')}
                            className={`relative p-4 rounded-xl text-left transition-all duration-200 ${
                              serviceType === 'quote'
                                ? 'bg-gradient-to-br from-[#0E7480] to-[#0d6670] text-white ring-2 ring-[#0E7480] ring-offset-2'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <div className="text-lg mb-1">💎</div>
                            <div className="font-bold text-sm">Free Quote</div>
                            <div className="text-xs opacity-80 mt-1">Get a Quote</div>
                            <div className="text-xl font-bold mt-1">Free</div>
                            <div className="text-xs opacity-70 mt-1">No upfront cost</div>
                          </button>
                        )}

                        {/* Rate-based Card */}
                        {hasRate && (
                          <button
                            type="button"
                            onClick={() => setServiceType('rate')}
                            className={`relative p-4 rounded-xl text-left transition-all duration-200 ${
                              serviceType === 'rate'
                                ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-500 ring-offset-2'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <div className="text-lg mb-1">💰</div>
                            <div className="font-bold text-sm">Rate</div>
                            <div className="text-xs opacity-80 mt-1">Fixed Price</div>
                            <div className="text-xl font-bold mt-1">${apiService?.base_price || '120'}</div>
                            <div className="text-xs opacity-70 mt-1">{apiService?.pricing_type === 'hourly' ? 'per hour' : 'per job'}</div>
                          </button>
                        )}

                        {/* Emergency Service Card */}
                        {hasEmergency && (
                          <button
                            type="button"
                            onClick={() => setServiceType('emergency')}
                            className={`relative p-4 rounded-xl text-left transition-all duration-200 ${
                              serviceType === 'emergency'
                                ? 'bg-gradient-to-br from-red-500 to-red-600 text-white ring-2 ring-red-500 ring-offset-2'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                          >
                            <div className="text-lg mb-1">🚨</div>
                            <div className="font-bold text-sm">Emergency</div>
                            <div className="text-xs opacity-80 mt-1">Emergency Rate</div>
                            <div className="text-xl font-bold mt-1">
                              ${apiService?.emergency_base_price || '150'}
                            </div>
                            <div className="text-xs opacity-70 mt-1">
                              {apiService?.emergency_pricing_type === 'hourly' ? 'per hour' : apiService?.emergency_pricing_type === 'per_job' ? 'per job' : 'fixed'}
                            </div>
                          </button>
                        )}
                      </div>
                    );
                  })()}

                  {/* Selected Service Type Info */}
                  {serviceType === 'emergency' ? (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
                      <p className="text-xs text-red-700 font-medium">⚡ Fast Response Guaranteed</p>
                      <p className="text-xs text-red-600 mt-1">24/7 availability • Priority response time</p>
                    </div>
                  ) : serviceType === 'rate' && apiService?.additional_hourly_rate ? (
                    <div className="bg-[#0E7480]/10 border border-[#0E7480]/20 rounded-lg p-3 mb-3">
                      <p className="text-xs text-[#0E7480] font-medium">💰 Additional Charge Per Hour (CAD)</p>
                      <p className="text-xs text-gray-600 mt-1">${parseFloat(apiService.additional_hourly_rate).toFixed(2)}/hr for additional hours beyond base service</p>
                    </div>
                  ) : serviceType === 'quote' ? (
                    <div className="text-center mb-3">
                      <div className="bg-[#0E7480]/10 border border-[#0E7480]/20 rounded-lg p-3">
                        <p className="text-xs text-[#0E7480] font-medium">✓ Custom pricing for your project</p>
                        <p className="text-xs text-gray-600 mt-1">Get a personalized quote based on your needs</p>
                      </div>
                    </div>
                  ) : null}

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
