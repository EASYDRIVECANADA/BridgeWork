'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const serviceType = searchParams.get('type') || 'residential';
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch categories and services from DB when channel changes
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (serviceType === 'residential') {
          // Residential: fetch categories + all residential services
          const [catRes, svcRes] = await Promise.all([
            api.get('/services/categories?sales_channel=residential'),
            api.get('/services?sales_channel=residential')
          ]);
          const cats = catRes.data?.data?.categories || [];
          setCategories(cats);
          setServices(svcRes.data?.data?.services || []);
          // Auto-select first category
          if (cats.length > 0 && !selectedCategoryId) {
            setSelectedCategoryId(cats[0].id);
          }
        } else {
          // Commercial: no categories, flat service list
          setCategories([]);
          const svcRes = await api.get('/services?sales_channel=commercial');
          setServices(svcRes.data?.data?.services || []);
          setSelectedCategoryId(null);
        }
      } catch (err) {
        // Failed to fetch services
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [serviceType]);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter services by selected category (residential) or show all (commercial)
  const filteredServices = (() => {
    let list = services;

    // Residential: filter by selected category
    if (serviceType === 'residential' && selectedCategoryId) {
      list = list.filter(s => s.category_id === selectedCategoryId);
    }

    // Search filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.description?.toLowerCase().includes(q) ||
        s.short_description?.toLowerCase().includes(q)
      );
    }

    return list;
  })();

  const handleServiceClick = (e, service) => {
    e.preventDefault();
    // If the service supports emergency pricing, show the rate-type selection modal
    if (service.emergency) {
      setSelectedService(service);
      setShowServiceModal(true);
      return;
    }
    // Otherwise navigate directly to the service booking page
    router.push(`/services/${service.id}`);
  };

  const handleModalSelection = (type) => {
    setShowServiceModal(false);
    if (selectedService) {
      if (type === 'rate' || type === 'quote') {
        // For rate-based or quote services (non-emergency)
        if (selectedService.rate === 'quote') {
          router.push(`/services/${selectedService.id}`);
        } else {
          router.push(`/services/${selectedService.id}?type=rate`);
        }
      } else if (type === 'emergency') {
        router.push(`/services/${selectedService.id}?type=emergency`);
      }
    }
  };

  // Default placeholder image for services without an image
  const fallbackImage = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-gray-50/50">
      {/* Header Section */}
      <div className="relative bg-gradient-to-br from-[#0E7480]/5 via-blue-50/80 to-slate-50 py-10 sm:py-12 lg:py-16 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-[#0E7480]/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-blue-100/50 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-3 sm:mb-4 tracking-tight">
            {serviceType === 'commercial'
              ? 'Professional commercial services for your business.'
              : 'BridgeWork keeps your home in great shape, inside and out.'}
          </h1>
          <p className="text-sm sm:text-base text-gray-500 mb-6 sm:mb-8">
            {serviceType === 'commercial'
              ? 'Find trusted commercial service providers for your business needs.'
              : 'Browse our services and book a certified pro in minutes.'}
          </p>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-6 sm:mb-8">
            <div className="relative group">
              <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 group-focus-within:text-[#0E7480] transition-colors" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-5 py-4 sm:py-5 text-base bg-white rounded-2xl shadow-lg shadow-gray-200/50 border-0 ring-1 ring-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0E7480] transition-all duration-200"
              />
            </div>
          </div>

          {/* Category Pills (Residential only) - Scrollable on mobile */}
          {serviceType === 'residential' && categories.length > 0 && (
            <div className="flex overflow-x-auto pb-2 sm:flex-wrap sm:justify-center gap-2.5 sm:gap-3 mb-6 sm:mb-8 -mx-4 px-4 sm:mx-0 sm:px-0 hide-scrollbar">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`flex-shrink-0 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-all duration-300 ${
                    selectedCategoryId === category.id
                      ? 'bg-gradient-to-r from-[#0E7480] to-[#0a5a63] text-white shadow-lg shadow-[#0E7480]/30 scale-[1.02]'
                      : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white shadow-sm ring-1 ring-gray-200/80 hover:ring-[#0E7480]/30 hover:shadow-md'
                  }`}
                >
                  <span className="mr-1.5 sm:mr-2">{category.icon_url || '📁'}</span>
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {/* Help Text */}
          <p className="text-xs sm:text-sm text-gray-600">
            Need help finding the right service?{' '}
            <Link href="/chat" className="text-[#0E7480] underline hover:text-[#2570d4]">
              Chat with us.
            </Link>
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-14">
        {loading ? (
          <div className="flex items-center justify-center py-20 sm:py-24">
            <div className="text-center">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute inset-0 rounded-full border-2 border-gray-100"></div>
                <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#0E7480] animate-spin"></div>
              </div>
              <p className="mt-5 text-gray-500 text-sm font-medium">Loading services...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  onClick={(e) => handleServiceClick(e, service)}
                  className="bg-white rounded-2xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-8px_rgba(14,116,128,0.18)] ring-1 ring-gray-100 hover:ring-[#0E7480]/25 transition-all duration-300 overflow-hidden group cursor-pointer hover:-translate-y-1"
                >
                  <div className="flex items-center gap-4 p-5 sm:p-6">
                    <div className="relative w-14 h-14 sm:w-16 sm:h-16 flex-shrink-0 rounded-xl overflow-hidden ring-1 ring-gray-100">
                      <Image
                        src={service.image_url || fallbackImage}
                        alt={service.name}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 group-hover:text-[#0E7480] transition-colors truncate">
                        {service.name}
                      </h3>
                      {service.short_description && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-1">{service.short_description}</p>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-full bg-gray-50 group-hover:bg-[#0E7480]/10 flex items-center justify-center transition-colors flex-shrink-0">
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-[#0E7480] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredServices.length === 0 && (
              <div className="text-center py-20">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-5">
                  <Search className="w-8 h-8 text-gray-400" />
                </div>
                <p className="text-gray-800 text-lg font-semibold">No services found</p>
                <p className="text-gray-500 text-sm mt-2 max-w-sm mx-auto">{searchQuery ? 'Try a different search term or browse all categories' : 'No services in this category yet'}</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Rate/Emergency Selection Modal */}
      {showServiceModal && selectedService && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setShowServiceModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-2xl w-full" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-3xl font-bold text-gray-900 mb-2 text-center">Choose Service Type</h2>
            <p className="text-gray-600 text-center mb-6">for {selectedService.name}</p>
            
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              {/* Rate Based Service OR Free Quote Card */}
              <button
                onClick={() => handleModalSelection(selectedService.rate === 'quote' ? 'quote' : 'rate')}
                className="group relative bg-gradient-to-br from-[#0E7480] to-[#0d6670] hover:from-[#0d6670] hover:to-[#0c5a63] text-white rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">{selectedService.rate === 'quote' ? '�' : '�💰'}</span>
                    <h3 className="text-xl font-bold">{selectedService.rate === 'quote' ? 'Free Quote' : 'Rate Based Service'}</h3>
                  </div>
                  
                  {selectedService.rate === 'quote' ? (
                    <>
                      <div className="mb-4">
                        <div className="text-sm opacity-90 mb-1">Get a Quote</div>
                        <div className="text-3xl font-bold">
                          Free
                        </div>
                        <div className="text-sm opacity-90 mt-1">
                          No upfront cost
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm opacity-90">
                        <div className="flex items-start gap-2">
                          <span className="text-green-300 mt-0.5">✓</span>
                          <span>Custom pricing for your project</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-300 mt-0.5">✓</span>
                          <span>Detailed cost breakdown</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-300 mt-0.5">✓</span>
                          <span>No obligation to book</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="text-xs opacity-75">Get a personalized quote based on your specific needs</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="mb-4">
                        <div className="text-sm opacity-90 mb-1">Estimated Rate</div>
                        <div className="text-3xl font-bold">
                          {selectedService.base_price ? `$${selectedService.base_price}` : '$100 - $150'}
                        </div>
                        <div className="text-sm opacity-90 mt-1">
                          {selectedService.pricing_type === 'hourly' ? 'per hour' : 'per job'}
                        </div>
                      </div>
                      
                      <div className="space-y-2 text-sm opacity-90">
                        <div className="flex items-start gap-2">
                          <span className="text-green-300 mt-0.5">✓</span>
                          <span>Standard scheduling</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-300 mt-0.5">✓</span>
                          <span>Flexible appointment times</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-green-300 mt-0.5">✓</span>
                          <span>Best for planned projects</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 pt-4 border-t border-white/20">
                        <div className="text-xs opacity-75">Additional charges may apply if job exceeds estimated time</div>
                      </div>
                    </>
                  )}
                </div>
              </button>

              {/* Emergency Service Card */}
              <button
                onClick={() => handleModalSelection('emergency')}
                className="group relative bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl p-6 transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] active:scale-[0.98] text-left overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
                <div className="relative">
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🚨</span>
                    <h3 className="text-xl font-bold">Emergency Service</h3>
                  </div>
                  
                  <div className="mb-4">
                    <div className="text-sm opacity-90 mb-1">Emergency Rate</div>
                    <div className="text-3xl font-bold">
                      {selectedService.emergency_rate ? `$${selectedService.emergency_rate}` : '$150 - $200'}
                    </div>
                    <div className="text-sm opacity-90 mt-1">
                      {selectedService.pricing_type === 'hourly' ? 'per hour' : 'per job'}
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm opacity-90">
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-300 mt-0.5">⚡</span>
                      <span>24/7 availability</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-300 mt-0.5">⚡</span>
                      <span>Priority response time</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-yellow-300 mt-0.5">⚡</span>
                      <span>Immediate assistance</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/20">
                    <div className="text-xs opacity-75">Premium pricing for urgent service needs</div>
                  </div>
                </div>
              </button>
            </div>
            
            <button
              onClick={() => setShowServiceModal(false)}
              className="w-full text-gray-500 hover:text-gray-700 text-sm font-medium py-3 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0E7480] mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading...</p>
        </div>
      </div>
    }>
      <ServicesPageContent />
    </Suspense>
  );
}
