'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MapPin, Calendar, MessageSquare, Edit, Loader2, Clock, Briefcase, CreditCard, CheckCircle, Star, FileText } from 'lucide-react';
import { fetchBookings } from '@/store/slices/bookingsSlice';
import ReviewModal from '@/components/ReviewModal';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  accepted: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-purple-100 text-purple-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  awaiting_quotes: 'bg-orange-100 text-orange-700',
  quote_pending: 'bg-orange-100 text-orange-700',
  proof_submitted: 'bg-indigo-100 text-indigo-700',
};

const statusLabels = {
  pending: 'Pending',
  accepted: 'Accepted',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  awaiting_quotes: 'Getting Quotes',
  quote_pending: 'Quote Pending',
  proof_submitted: 'Review & Pay',
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
    if (profile?.role === 'admin') {
      router.push('/admin/revenue');
      return;
    }
    dispatch(fetchBookings());
  }, [user, profile, router, dispatch]);

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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-8">
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-8">
          {/* Left Sidebar */}
          <div className="w-full lg:w-64 lg:flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm lg:sticky lg:top-8">
              {/* Profile Section */}
              <div className="text-center pt-6 pb-4 px-6">
                <h2 className="text-xl font-bold text-gray-900 mb-1">{profile?.full_name || 'User'}</h2>
              </div>

              {/* Navigation Menu */}
              <nav>
                <Link href="/my-jobs" className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">My Jobs</span>
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
          <div className="flex-1 min-w-0">
            {/* Dashboard Header */}
            <div className="mb-4 sm:mb-6 lg:mb-8">
              <div className="flex items-center gap-4 sm:gap-8 border-b border-gray-200 overflow-x-auto">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 pb-3 sm:pb-4 border-b-2 border-[#0E7480] whitespace-nowrap">Dashboard</h1>
                <Link href="/profile/edit" className="text-sm sm:text-base text-gray-600 hover:text-gray-900 pb-3 sm:pb-4 whitespace-nowrap">Edit Profile</Link>
                <Link href="/credits" className="text-sm sm:text-base text-gray-600 hover:text-gray-900 pb-3 sm:pb-4 whitespace-nowrap">Credits</Link>
              </div>
            </div>

            {/* Hero Carousel */}
            <div className="relative mb-4 sm:mb-6 lg:mb-8 rounded-xl sm:rounded-2xl overflow-hidden shadow-lg h-48 sm:h-64 lg:h-80">
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
              <div className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 max-w-[60%] sm:max-w-none">
                <h2 className="text-white text-lg sm:text-2xl lg:text-3xl font-bold mb-2 sm:mb-4">{heroSlides[currentSlide].title}</h2>
                <button className="bg-white text-gray-900 px-4 sm:px-6 py-2 sm:py-3 rounded-lg text-sm sm:text-base font-semibold hover:bg-gray-100 transition-colors">
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
                        <>
                          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-600 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Paid
                          </span>
                          <Link
                            href="/dashboard/invoices"
                            className="px-3 py-1.5 text-xs font-semibold rounded-full border border-[#0E7480] text-[#0E7480] hover:bg-[#0E7480] hover:text-white transition-colors flex items-center gap-1"
                          >
                            <FileText className="w-3 h-3" />
                            View Invoice
                          </Link>
                        </>
                      ) : booking.transactions && booking.transactions.some(t => t.status === 'held') ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-50 text-blue-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Funds Held
                        </span>
                      ) : (booking.status === 'awaiting_quotes' || booking.status === 'quote_pending') ? (
                        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-50 text-orange-600 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Awaiting Your Approval
                        </span>
                      ) : booking.status === 'accepted' && !booking.transactions?.some(t => t.status === 'held' || t.status === 'succeeded') ? (
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
