'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useSelector } from 'react-redux';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin, Star, Clock, Phone, Mail, Shield, Award, CheckCircle,
  ChevronLeft, Calendar, ThumbsUp, Edit, Loader2
} from 'lucide-react';
import { prosAPI, reviewsAPI } from '@/lib/api';

function RatingStars({ rating, size = 'sm' }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${sizeClass} ${
            i < Math.floor(rating) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
}

export default function ProProfilePage() {
  const params = useParams();
  const { user, profile } = useSelector((state) => state.auth);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [pro, setPro] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Check if the logged-in user is viewing their own pro profile
  const isOwnProfile = user && (params.id === user.id || params.id === 'me');
  const isPro = profile?.role === 'pro';

  useEffect(() => {
    const fetchProData = async () => {
      setLoading(true);
      try {
        const proRes = await prosAPI.getById(params.id);
        const proData = proRes.data?.data?.proProfile || proRes.data?.data?.pro || proRes.data?.data;
        setPro(proData);

        // Fetch reviews for this pro
        if (proData?.id) {
          try {
            const revRes = await reviewsAPI.getByProId(proData.id);
            setReviews(revRes.data?.data?.reviews || []);
          } catch (e) {
            console.log('[PRO-PROFILE] Could not fetch reviews:', e.message);
          }
        }
      } catch (err) {
        console.error('[PRO-PROFILE] Error fetching pro:', err);
      }
      setLoading(false);
    };
    fetchProData();
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#2D7FE6]" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Pro profile not found</p>
          <Link href="/services" className="text-[#2D7FE6] text-sm mt-2 hover:underline">
            Browse Services
          </Link>
        </div>
      </div>
    );
  }

  // Normalize pro data from API
  const proName = pro.business_name || pro.profiles?.full_name || 'Pro';
  const ownerName = pro.profiles?.full_name || '';
  const proAvatar = pro.profiles?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200';
  const proCover = 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?q=80&w=1200';
  const proLocation = pro.service_area || pro.profiles?.city || 'Toronto, ON';
  const proRating = pro.rating || 0;
  const proTotalReviews = pro.total_reviews || reviews.length;
  const proTotalJobs = pro.total_jobs || 0;
  const proMemberSince = pro.created_at ? new Date(pro.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  const proBio = pro.bio || pro.description || '';
  const proServices = pro.services_offered || [];
  const proHourlyRate = pro.hourly_rate;

  // Build badges dynamically
  const badges = [];
  if (pro.is_verified) badges.push({ name: 'BridgeWork Certified', icon: 'shield' });
  if (proRating >= 4.5 && proTotalReviews >= 5) badges.push({ name: 'Top Rated', icon: 'star' });
  if (proTotalJobs >= 100) badges.push({ name: '100+ Jobs', icon: 'award' });
  if (proTotalJobs >= 10) badges.push({ name: 'Experienced', icon: 'award' });
  if (badges.length === 0) badges.push({ name: 'New Pro', icon: 'clock' });

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: reviews.filter((r) => r.rating === stars).length,
    percentage: reviews.length > 0 ? (reviews.filter((r) => r.rating === stars).length / reviews.length) * 100 : 0,
  }));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="relative h-56 bg-gray-200">
        <Image
          src={proCover}
          alt={proName}
          fill
          className="object-cover"
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="max-w-5xl mx-auto px-6">
        {/* Profile Header */}
        <div className="relative -mt-16 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="w-28 h-28 rounded-xl overflow-hidden border-4 border-white shadow-lg flex-shrink-0 -mt-16">
                <Image
                  src={proAvatar}
                  alt={ownerName}
                  width={112}
                  height={112}
                  className="object-cover w-full h-full"
                  unoptimized
                />
              </div>

              {/* Info */}
              <div className="flex-1 pt-1">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{proName}</h1>
                    {ownerName && ownerName !== proName && (
                      <p className="text-gray-600 text-sm mt-0.5">{ownerName}</p>
                    )}
                    <div className="flex items-center gap-1 text-gray-500 text-sm mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{proLocation}</span>
                    </div>
                  </div>
                  {isOwnProfile ? (
                    <Link
                      href="/pro-dashboard"
                      className="flex items-center gap-2 bg-gray-100 text-gray-700 px-5 py-2.5 rounded-lg font-semibold hover:bg-gray-200 transition-colors text-sm"
                    >
                      <Edit className="w-4 h-4" />
                      Edit Profile
                    </Link>
                  ) : (
                    <Link
                      href="/services"
                      className="bg-[#2D7FE6] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#1e5bb8] transition-colors text-sm"
                    >
                      Request This Pro
                    </Link>
                  )}
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-6 mt-4 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <RatingStars rating={proRating} size="md" />
                    <span className="font-bold text-gray-900">{proRating > 0 ? proRating.toFixed(1) : 'New'}</span>
                    <span className="text-sm text-gray-500">({proTotalReviews} reviews)</span>
                  </div>
                  {proTotalJobs > 0 && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>{proTotalJobs} jobs completed</span>
                    </div>
                  )}
                  {proHourlyRate && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <span className="font-semibold text-green-600">${proHourlyRate}/hr</span>
                    </div>
                  )}
                  {proMemberSince && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-600">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>Member since {proMemberSince}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-8 pb-12">
          {/* ==================== LEFT COLUMN ==================== */}
          <div className="flex-1">
            {/* About */}
            {proBio && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-3">About</h2>
                <p className="text-sm text-gray-700 leading-relaxed">{proBio}</p>
              </div>
            )}

            {/* Reviews */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-gray-900">
                  Reviews
                  <span className="ml-2 text-sm font-normal text-gray-500">({reviews.length})</span>
                </h2>
              </div>

              {reviews.length > 0 ? (
                <>
                  {/* Rating Distribution */}
                  <div className="mb-6 pb-6 border-b border-gray-100">
                    <div className="flex items-start gap-8">
                      <div className="text-center">
                        <p className="text-4xl font-bold text-gray-900">{proRating > 0 ? proRating.toFixed(1) : '—'}</p>
                        <RatingStars rating={proRating} />
                        <p className="text-xs text-gray-500 mt-1">{proTotalReviews} reviews</p>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        {ratingDistribution.map((item) => (
                          <div key={item.stars} className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 w-3">{item.stars}</span>
                            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-yellow-400 rounded-full"
                                style={{ width: `${item.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-6">{item.count}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Review List */}
                  <div className="space-y-5">
                    {displayedReviews.map((review) => {
                      const reviewerName = review.profiles?.full_name || review.user_name || 'Customer';
                      const reviewDate = review.created_at
                        ? new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '';
                      const serviceName = review.bookings?.service_name || review.service_name || '';

                      return (
                        <div key={review.id} className="pb-5 border-b border-gray-100 last:border-0 last:pb-0">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                                  <span className="text-xs font-bold text-gray-600">
                                    {reviewerName.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <p className="text-sm font-semibold text-gray-900">{reviewerName}</p>
                                  {serviceName && <p className="text-xs text-gray-500">{serviceName}</p>}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs text-gray-400">{reviewDate}</span>
                          </div>
                          <div className="ml-10">
                            <RatingStars rating={review.rating} />
                            {review.comment && (
                              <p className="text-sm text-gray-700 mt-2 leading-relaxed">{review.comment}</p>
                            )}
                            {review.response && (
                              <div className="mt-3 ml-4 pl-4 border-l-2 border-blue-200 bg-blue-50/50 rounded-r-lg p-3">
                                <p className="text-xs font-semibold text-gray-700 mb-1">Pro Response:</p>
                                <p className="text-sm text-gray-600">{review.response}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {reviews.length > 3 && (
                    <button
                      onClick={() => setShowAllReviews(!showAllReviews)}
                      className="w-full mt-4 text-[#2D7FE6] text-sm font-semibold hover:underline"
                    >
                      {showAllReviews ? 'Show less' : `Show all ${reviews.length} reviews`}
                    </button>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <Star className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">No reviews yet</p>
                  <p className="text-gray-400 text-xs mt-1">Be the first to review this pro!</p>
                </div>
              )}
            </div>
          </div>

          {/* ==================== RIGHT SIDEBAR ==================== */}
          <div className="w-72 flex-shrink-0">
            {/* Badges */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Badges & Achievements</h3>
              <div className="space-y-3">
                {badges.map((badge) => (
                  <div key={badge.name} className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      {badge.icon === 'shield' && <Shield className="w-4.5 h-4.5 text-[#2D7FE6]" />}
                      {badge.icon === 'star' && <Star className="w-4.5 h-4.5 text-yellow-500 fill-yellow-500" />}
                      {badge.icon === 'award' && <Award className="w-4.5 h-4.5 text-green-600" />}
                      {badge.icon === 'clock' && <Clock className="w-4.5 h-4.5 text-purple-600" />}
                    </div>
                    <span className="text-sm text-gray-700">{badge.name}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Services Offered */}
            {proServices.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
                <h3 className="text-sm font-bold text-gray-900 mb-3">Services Offered</h3>
                <div className="flex flex-wrap gap-2">
                  {proServices.map((service, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full text-xs text-gray-700"
                    >
                      {typeof service === 'string' ? service : service.name || service}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Credentials */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-3">Credentials</h3>
              <div className="space-y-3">
                {pro.is_verified && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">Verified Pro</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Licensed & Certified</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Insured</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700">Background Checked</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
