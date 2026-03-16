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

// Service categories mapping (same as pro-dashboard)
const SERVICE_CATEGORIES = [
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', name: 'Handyman' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12', name: 'Appliance Repair' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a13', name: 'Plumbing' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a14', name: 'Electrical' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a15', name: 'HVAC' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a16', name: 'Lawn Care' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a17', name: 'Painting' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a18', name: 'Carpentry' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a19', name: 'Cleaning' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a20', name: 'Moving' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a21', name: 'Gas Services' },
  { id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', name: 'Emergency' },
];

export default function ProProfilePage() {
  const params = useParams();
  const { user, profile } = useSelector((state) => state.auth);
  const [pro, setPro] = useState(null);
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

        // Reviews temporarily disabled
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
        <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
      </div>
    );
  }

  if (!pro) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-500 text-lg">Pro profile not found</p>
          <Link href="/services" className="text-[#0E7480] text-sm mt-2 hover:underline">
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
  const proTotalReviews = pro.total_reviews || 0;
  const proTotalJobs = pro.total_jobs || 0;
  const proMemberSince = pro.created_at ? new Date(pro.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : '';
  const proBio = pro.bio || pro.description || '';
  // Map service_categories UUIDs to display names
  const proServices = (pro.service_categories || pro.services_offered || []).map((cat) => {
    if (typeof cat === 'string') {
      const found = SERVICE_CATEGORIES.find((s) => s.id === cat);
      return found ? found.name : cat;
    }
    return cat?.name || cat;
  });
  const proHourlyRate = pro.hourly_rate;

  // Build badges dynamically
  const badges = [];
  if (pro.is_verified) badges.push({ name: 'BridgeWork Certified', icon: 'shield' });
  if (proRating >= 4.5 && proTotalReviews >= 5) badges.push({ name: 'Top Rated', icon: 'star' });
  if (proTotalJobs >= 100) badges.push({ name: '100+ Jobs', icon: 'award' });
  if (proTotalJobs >= 10) badges.push({ name: 'Experienced', icon: 'award' });
  if (badges.length === 0) badges.push({ name: 'New Pro', icon: 'clock' });


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
                      className="bg-[#0E7480] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#1e5bb8] transition-colors text-sm"
                    >
                      Request This Pro
                    </Link>
                  )}
                </div>

                {/* Stats Row */}
                <div className="flex items-center gap-6 mt-4 flex-wrap">
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
                      {badge.icon === 'shield' && <Shield className="w-4.5 h-4.5 text-[#0E7480]" />}
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
