'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import api from '@/lib/api';

function ServicesPageContent() {
  const searchParams = useSearchParams();
  const serviceType = searchParams.get('type') || 'residential';
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
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
        console.error('Failed to fetch services:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [serviceType]);

  // Filter services by selected category (residential) or show all (commercial)
  const filteredServices = (() => {
    let list = services;

    // Residential: filter by selected category
    if (serviceType === 'residential' && selectedCategoryId) {
      list = list.filter(s => s.category_id === selectedCategoryId);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
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
    // Always navigate directly to the service booking page
    // The service type selection (Free Quote vs Emergency) will be shown on that page
    window.location.href = `/services/${service.id}`;
  };

  const handleModalSelection = (type) => {
    setShowServiceModal(false);
    if (selectedService) {
      if (type === 'rate' || type === 'quote') {
        // For rate-based or quote services (non-emergency)
        if (selectedService.rate === 'quote') {
          window.location.href = `/services/${selectedService.id}`;
        } else {
          window.location.href = `/services/${selectedService.id}?type=rate`;
        }
      } else if (type === 'emergency') {
        window.location.href = `/services/${selectedService.id}?type=emergency`;
      }
    }
  };

  // Default placeholder image for services without an image
  const fallbackImage = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=400';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Header Section */}
      <div className="bg-gradient-to-b from-blue-50 to-blue-100 py-6 sm:py-8 lg:py-12">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-4 sm:mb-6 lg:mb-8">
            {serviceType === 'commercial'
              ? 'Professional commercial services for your business.'
              : 'BridgeWork keeps your home in great shape, inside and out.'}
          </h1>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto mb-4 sm:mb-6 lg:mb-8">
            <div className="relative">
              <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 sm:w-6 h-5 sm:h-6" />
              <input
                type="text"
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 sm:pl-14 pr-4 py-3 sm:py-4 text-base sm:text-lg border-b-2 border-gray-300 bg-transparent focus:outline-none focus:border-[#0E7480] transition-colors"
              />
            </div>
          </div>

          {/* Category Pills (Residential only) - Scrollable on mobile */}
          {serviceType === 'residential' && categories.length > 0 && (
            <div className="flex overflow-x-auto pb-2 sm:flex-wrap sm:justify-center gap-2 sm:gap-3 mb-4 sm:mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`flex-shrink-0 px-4 sm:px-6 py-2 sm:py-3 rounded-full text-sm sm:text-base font-medium transition-all ${
                    selectedCategoryId === category.id
                      ? 'bg-black text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                  }`}
                >
                  <span className="mr-1 sm:mr-2">{category.icon_url || '📁'}</span>
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
      <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 lg:py-12">
        {loading ? (
          <div className="flex items-center justify-center py-12 sm:py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 sm:h-10 w-8 sm:w-10 border-b-2 border-[#0E7480] mx-auto"></div>
              <p className="mt-3 sm:mt-4 text-gray-500 text-sm sm:text-base">Loading services...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {filteredServices.map((service) => (
                <div
                  key={service.id}
                  onClick={(e) => handleServiceClick(e, service)}
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-shadow overflow-hidden group cursor-pointer"
                >
                  <div className="flex items-center gap-4 p-4">
                    <div className="relative w-16 h-16 flex-shrink-0">
                      <Image
                        src={service.image_url || fallbackImage}
                        alt={service.name}
                        fill
                        className="object-cover rounded-lg"
                      />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-[#0E7480] transition-colors">
                      {service.name}
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            {filteredServices.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No services found{searchQuery ? ' matching your search' : ' in this category'}.</p>
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
