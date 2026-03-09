'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin, Link as LinkIcon, Coins, Calendar, MessageSquare, Edit, Loader2, Clock, Briefcase, CreditCard, CheckCircle, Star } from 'lucide-react';
import { fetchBookings } from '@/store/slices/bookingsSlice';
import ReviewModal from '@/components/ReviewModal';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

const statusLabels = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function DashboardPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);
  const { bookings, isLoading: bookingsLoading } = useSelector((state) => state.bookings);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [todoSlide, setTodoSlide] = useState(0);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewedBookingIds, setReviewedBookingIds] = useState(new Set());

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    dispatch(fetchBookings());
  }, [user, router, dispatch]);

  // Check which bookings already have reviews
  useEffect(() => {
    if (!bookings || !Array.isArray(bookings)) return;
    const reviewed = new Set();
    for (const b of bookings) {
      if (b.reviews && b.reviews.length > 0) {
        reviewed.add(b.id);
      }
    }
    setReviewedBookingIds(reviewed);
  }, [bookings]);

  const heroSlides = [
    {
      image: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?q=80&w=2000',
      title: 'Furnace need a tune-up?',
      cta: 'Request an HVAC Pro'
    }
  ];

  const serviceCategories = [
    { name: 'Cleaning', icon: '🧹', link: '/services/cleaning' },
    { name: 'Indoors', icon: '🪟', link: '/services/indoors' },
    { name: 'Install', icon: '📦', link: '/services/install' },
    { name: 'BridgeWork Shop', icon: '🛒', link: '/shop' },
    { name: 'Outdoors', icon: '🌲', link: '/services/outdoors' },
    { name: 'Repair', icon: '🔧', link: '/services/repair' },
    { name: 'Seasonal', icon: '❄️', link: '/services/seasonal' }
  ];

  const moreServices = [
    { name: 'Appliance Repair', image: 'https://images.unsplash.com/photo-1556911220-bff31c812dba?q=80&w=300' },
    { name: 'BBQ Cleaning & Repair', image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=300' },
    { name: 'Decks & Fences', image: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?q=80&w=300' },
    { name: 'Electrical', image: 'https://images.unsplash.com/photo-1621905251918-48416bd8575a?q=80&w=300' },
    { name: 'Handyman Services', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=300' },
    { name: 'Heating & Cooling', image: 'https://images.unsplash.com/photo-1585128792020-803d29415281?q=80&w=300' },
    { name: 'Lawn Maintenance', image: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?q=80&w=300' },
    { name: 'Painting', image: 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?q=80&w=300' }
  ];

  const [serviceScroll, setServiceScroll] = useState(0);
  const maxServiceScroll = Math.max(0, moreServices.length - 6);

  const scrollServicesLeft = () => {
    setServiceScroll((prev) => Math.max(0, prev - 1));
  };

  const scrollServicesRight = () => {
    setServiceScroll((prev) => Math.min(maxServiceScroll, prev + 1));
  };

  const todoItems = [
    { title: 'Emergency Repairs', image: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=600' },
    { title: 'HVAC Maintenance', image: 'https://images.unsplash.com/photo-1545259741-2ea3ebf61fa3?q=80&w=600' },
    { title: 'New Home', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?q=80&w=600' }
  ];

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
  };

  const nextTodoSlide = () => {
    setTodoSlide((prev) => Math.min(prev + 1, todoItems.length - 3));
  };

  const prevTodoSlide = () => {
    setTodoSlide((prev) => Math.max(prev - 1, 0));
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content with Sidebar */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left Sidebar */}
          <div className="w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm sticky top-8">
              {/* Profile Section */}
              <div className="text-center pt-6 pb-4 px-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{profile?.full_name || 'User'}</h2>
                <div className="flex items-center justify-center gap-1 text-gray-500 text-sm">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profile?.city || 'Boston'}</span>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav>
                <Link href="/insurance" className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <LinkIcon className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">Link my insurance perks</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>

                <Link href="/credits" className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <Coins className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm text-gray-700">0 credits</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>

                <Link href="/my-jobs" className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">My Jobs</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>

                <Link href="/schedule-save" className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">Schedule & Save</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>

                <Link href="/messages" className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <MessageSquare className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">Messages</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>

                <Link href="/transactions" className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">Transaction History</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>
              </nav>

              {/* Edit Profile Link */}
              <div className="border-t border-gray-100">
                <Link href="/profile/edit" className="flex items-center justify-center gap-2 px-5 py-4 text-[#0E7480] hover:text-[#1e5bb8] transition-colors">
                  <Edit className="w-4 h-4" />
                  <span className="text-sm font-medium">Edit Profile</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1">
            {/* Dashboard Header */}
            <div className="mb-8">
              <div className="flex items-center gap-8 border-b border-gray-200">
                <h1 className="text-3xl font-bold text-gray-900 pb-4 border-b-2 border-[#0E7480]">Dashboard</h1>
                <Link href="/profile/edit" className="text-gray-600 hover:text-gray-900 pb-4">Edit Profile</Link>
                <Link href="/credits" className="text-gray-600 hover:text-gray-900 pb-4">Credits</Link>
              </div>
            </div>

            {/* Hero Carousel */}
            <div className="relative mb-8 rounded-2xl overflow-hidden shadow-lg h-80">
              <Image
                src={heroSlides[currentSlide].image}
                alt="Hero"
                fill
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
              
              {/* Carousel Controls */}
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6 text-gray-800" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition-colors"
              >
                <ChevronRight className="w-6 h-6 text-gray-800" />
              </button>

              {/* CTA Content */}
              <div className="absolute right-8 top-1/2 -translate-y-1/2">
                <h2 className="text-white text-3xl font-bold mb-4">{heroSlides[currentSlide].title}</h2>
                <button className="bg-white text-gray-900 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
                  {heroSlides[currentSlide].cta}
                </button>
              </div>

              {/* Slide Indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {heroSlides.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentSlide(index)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      index === currentSlide ? 'bg-white' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* My Recent Bookings */}
            {(bookings && bookings.length > 0) && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">My Recent Bookings</h2>
                  <Link href="/my-jobs" className="text-sm text-[#0E7480] hover:underline font-medium">
                    View All
                  </Link>
                </div>
                <div className="space-y-3">
                  {(Array.isArray(bookings) ? bookings : []).slice(0, 3).map((booking) => {
                    const review = booking.reviews?.[0];
                    const proName = booking.pro_profiles?.business_name || booking.pro_profiles?.profiles?.full_name;
                    return (
                    <div key={booking.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="p-4 flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Briefcase className="w-6 h-6 text-[#0E7480]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{booking.service_name}</p>
                        <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                          {proName && (
                            <span className="text-xs text-gray-600 font-medium">by {proName}</span>
                          )}
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {booking.scheduled_time || ''}
                          </span>
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {booking.city}, {booking.state}
                          </span>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${statusColors[booking.status] || 'bg-gray-100 text-gray-600'}`}>
                        {statusLabels[booking.status] || booking.status}
                      </span>
                      {/* Payment Status */}
                      {booking.transactions && booking.transactions.some(t => t.status === 'succeeded') ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Paid
                        </span>
                      ) : booking.transactions && booking.transactions.some(t => t.status === 'held') ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Funds Held
                        </span>
                      ) : !booking.transactions?.some(t => t.status === 'held' || t.status === 'succeeded') ? (
                        <Link
                          href={`/checkout/${booking.id}`}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[#0E7480] text-white hover:bg-[#2570d4] transition-colors flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" />
                          Pay Now
                        </Link>
                      ) : null}
                      {(booking.status === 'accepted' || booking.status === 'in_progress') && (
                        <Link
                          href={`/messages/${booking.id}`}
                          className="text-xs text-[#0E7480] hover:underline font-medium flex-shrink-0"
                        >
                          Message Pro
                        </Link>
                      )}
                      {booking.status === 'completed' && !reviewedBookingIds.has(booking.id) && (
                        <button
                          onClick={() => setReviewBooking(booking)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-full bg-[#0E7480] text-white hover:bg-[#2570d4] transition-colors flex items-center gap-1 flex-shrink-0"
                        >
                          <Star className="w-3 h-3" />
                          Review
                        </button>
                      )}
                      </div>
                      {/* Inline review display */}
                      {review && (
                        <div className="px-4 pb-4 pt-0">
                          <div className="bg-gray-50 rounded-lg p-3 ml-16">
                            <div className="flex items-center gap-1 mb-1">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                />
                              ))}
                              <span className="text-xs text-gray-400 ml-2">
                                {review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}
                              </span>
                            </div>
                            {review.comment && (
                              <p className="text-xs text-gray-600 leading-relaxed">{review.comment}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Service Categories */}
            <div className="grid grid-cols-7 gap-4 mb-12">
              {serviceCategories.map((category) => (
                <Link
                  key={category.name}
                  href={category.link}
                  className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-white hover:shadow-md transition-all group"
                >
                  <div className="text-4xl">{category.icon}</div>
                  <span className="text-sm text-gray-700 text-center group-hover:text-[#0E7480] transition-colors">
                    {category.name}
                  </span>
                </Link>
              ))}
            </div>

            {/* More Services Carousel */}
            <div className="mb-12 relative">
              {/* Left Arrow */}
              {serviceScroll > 0 && (
                <button
                  onClick={scrollServicesLeft}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-6 h-6 text-gray-800" />
                </button>
              )}

              {/* Right Arrow */}
              {serviceScroll < maxServiceScroll && (
                <button
                  onClick={scrollServicesRight}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-6 h-6 text-gray-800" />
                </button>
              )}

              {/* Scrollable Container */}
              <div className="overflow-hidden">
                <div 
                  className="flex gap-4 transition-transform duration-300 ease-in-out"
                  style={{ transform: `translateX(-${serviceScroll * (100 / 6 + 2.666)}%)` }}
                >
                  {moreServices.map((service) => (
                    <Link
                      key={service.name}
                      href="/services"
                      className="group flex-shrink-0"
                      style={{ width: 'calc(16.666% - 13.33px)' }}
                    >
                      <div className="relative h-24 rounded-lg overflow-hidden mb-2">
                        <Image
                          src={service.image}
                          alt={service.name}
                          fill
                          className="object-cover group-hover:scale-110 transition-transform duration-300"
                          unoptimized
                        />
                      </div>
                      <p className="text-sm text-gray-700 text-center group-hover:text-[#0E7480] transition-colors">
                        {service.name}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* How BridgeWork Works */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">How BridgeWork Works</h2>
              <div className="bg-gradient-to-r from-[#1e5bb8] via-[#0E7480] to-[#1e5bb8] rounded-2xl p-12 flex items-center justify-center">
                <div className="relative w-full max-w-2xl aspect-video bg-white rounded-lg shadow-2xl overflow-hidden">
                  {/* Video Player */}
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/dQw4w9WgXcQ?controls=1&modestbranding=1&rel=0"
                    title="How BridgeWork Works"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                  
                  {/* Alternative: Custom Video Player UI Overlay (if using custom video) */}
                  {/* <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="mb-4">
                        <svg className="w-16 h-16 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Request Job</h3>
                      <p className="text-gray-600 mb-4">What do you need done?</p>
                      <p className="text-sm text-gray-500">My dishwasher stopped working.</p>
                      <button className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Upload Photos & Videos
                      </button>
                    </div>
                  </div> */}
                </div>
              </div>
            </div>

            {/* Info Cards Grid */}
            <div className="grid grid-cols-2 gap-6 mb-12">
              <Link href="/faq" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">❓</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Common Questions</h3>
                    <p className="text-sm text-gray-600">Learn how we make home maintenance easy.</p>
                  </div>
                </div>
              </Link>

              <Link href="/homeowner-protection" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🛡️</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Homeowner Protection Promise</h3>
                    <p className="text-sm text-gray-600">If your experience isn't perfect, we'll make it right.</p>
                  </div>
                </div>
              </Link>

              <Link href="/certified-pros" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">✓</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">BridgeWork Certified Pros</h3>
                    <p className="text-sm text-gray-600">Local Pros are certified, vetted, and highly rated.</p>
                  </div>
                </div>
              </Link>

              <Link href="/help" className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow border border-gray-100">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">💬</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Need some help from BridgeWork support?</h3>
                    <p className="text-sm text-gray-600">Chat with our friendly Help Desk.</p>
                  </div>
                </div>
              </Link>
            </div>

            {/* What's on the to-do list? */}
            <div className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">What's on the to-do list?</h2>
                <div className="flex gap-2">
                  <button
                    onClick={prevTodoSlide}
                    disabled={todoSlide === 0}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-800" />
                  </button>
                  <button
                    onClick={nextTodoSlide}
                    disabled={todoSlide >= todoItems.length - 3}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    <ChevronRight className="w-6 h-6 text-gray-800" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                {todoItems.slice(todoSlide, todoSlide + 3).map((item) => (
                  <Link
                    key={item.title}
                    href="/services"
                    className="relative h-48 rounded-xl overflow-hidden group"
                  >
                    <Image
                      src={item.image}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-110 transition-transform duration-300"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <h3 className="absolute bottom-4 left-4 text-white text-xl font-bold">{item.title}</h3>
                  </Link>
                ))}
              </div>
            </div>

            {/* Ways to Save with BridgeWork */}
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Ways to Save with BridgeWork</h2>
              <div className="grid grid-cols-2 gap-6 mb-8">
                {/* Schedule & Save Card */}
                <div className="bg-gradient-to-br from-purple-600 to-purple-400 rounded-2xl p-8 text-white">
                  <div className="flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mb-4">
                      <Calendar className="w-10 h-10" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">SCHEDULE & SAVE</h3>
                    <p className="mb-6">Schedule a reminder and save $15 on repeat jobs.</p>
                    <button className="bg-white text-purple-600 px-6 py-2 rounded-full font-semibold hover:bg-gray-100 transition-colors">
                      Learn more
                    </button>
                  </div>
                </div>

                {/* Share & Save Card */}
                <div className="bg-gradient-to-br from-orange-200 to-orange-100 rounded-2xl p-8">
                  <div className="flex flex-col items-center text-center">
                    <h3 className="text-2xl font-bold text-orange-500 mb-4">SHARE<br/>& SAVE</h3>
                    <p className="text-gray-700 mb-6">Give a friend $25 and get $25 when they finish their first job.</p>
                    <button className="bg-[#2c3e50] text-white px-8 py-2 rounded-full font-semibold hover:bg-[#1a252f] transition-colors">
                      Share
                    </button>
                  </div>
                </div>
              </div>

              {/* BridgeWork+ Spending Account Card */}
              <div className="bg-[#2c3e50] rounded-2xl p-8 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div>
                      <h3 className="text-yellow-400 text-3xl font-bold mb-2">BridgeWork+</h3>
                      <h4 className="text-white text-2xl font-bold mb-4">spending account</h4>
                    </div>
                    <div className="relative w-32 h-32">
                      <Image
                        src="https://images.unsplash.com/photo-1607863680198-23d4b2565df0?q=80&w=200"
                        alt="Gold coins"
                        fill
                        className="object-contain"
                        unoptimized
                      />
                    </div>
                  </div>
                  <div className="border-2 border-yellow-400 rounded-xl p-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-gray-400 text-sm mb-1">For</p>
                        <p className="text-white text-2xl font-bold">$75/month</p>
                        <p className="text-gray-400 text-xs mt-1">Billed monthly for 12 months<br/>$900/year</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm mb-1">You get</p>
                        <p className="text-white text-2xl font-bold">$1,200/year</p>
                        <p className="text-gray-400 text-xs mt-1">to spend on all BridgeWork<br/>services</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6 flex items-center justify-between">
                  <button className="bg-yellow-400 text-gray-900 px-8 py-3 rounded-lg font-bold hover:bg-yellow-300 transition-colors">
                    Learn More
                  </button>
                  <p className="text-orange-400 text-sm">
                    Includes BridgeWork+ Membership benefit with $25 off every job!
                  </p>
                </div>
              </div>

              {/* BridgeWork+ Member Upgrade Card */}
              <div className="bg-gradient-to-r from-[#3d5a80] to-[#2c4563] rounded-2xl p-8">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-yellow-400 text-2xl font-bold mb-6">BridgeWork+ MEMBER</h3>
                    <div className="border-2 border-orange-400 rounded-lg p-6 inline-block">
                      <p className="text-white text-3xl font-bold mb-1">Save $25</p>
                      <p className="text-white text-sm">on every BridgeWork job</p>
                      <p className="text-orange-400 text-xs mt-2">For just $10/month</p>
                    </div>
                  </div>
                  <div className="flex-1 px-8">
                    <button className="bg-[#0E7480] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#1e5bb8] transition-colors w-full mb-4">
                      Upgrade to BridgeWork+ for $10/month
                    </button>
                    <div className="flex items-center gap-4">
                      <input
                        type="text"
                        placeholder="Enter Your Membership Code"
                        className="flex-1 px-4 py-2 rounded-lg bg-white/10 text-white placeholder-gray-400 border border-gray-500"
                      />
                      <button className="bg-[#0E7480] text-white px-6 py-2 rounded-lg font-semibold hover:bg-[#1e5bb8] transition-colors">
                        Join
                      </button>
                    </div>
                    <p className="text-gray-400 text-xs mt-4">
                      The $25 discount applies once per job. BridgeWork+ Member continues for $10/month until cancelled.{' '}
                      <Link href="/bridgework-terms" className="text-[#0E7480] hover:underline">
                        See BridgeWork+ Terms & Conditions
                      </Link>
                    </p>
                  </div>
                  <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center gap-3 text-white">
                      <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">💰</span>
                      </div>
                      <span className="text-sm">Save $25 on every BridgeWork Job</span>
                    </div>
                    <div className="flex items-center gap-3 text-white">
                      <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">🛡️</span>
                      </div>
                      <span className="text-sm">Warranty Extension from 30 to 60 days</span>
                    </div>
                    <div className="flex items-center gap-3 text-white">
                      <div className="w-8 h-8 bg-orange-400 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-lg">❌</span>
                      </div>
                      <span className="text-sm">Cancel membership anytime (no fee or penalty)</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Review Modal */}
      {reviewBooking && (
        <ReviewModal
          booking={reviewBooking}
          onClose={() => setReviewBooking(null)}
          onReviewSubmitted={() => {
            setReviewedBookingIds((prev) => new Set([...prev, reviewBooking.id]));
            dispatch(fetchBookings());
          }}
        />
      )}
    </div>
  );
}
