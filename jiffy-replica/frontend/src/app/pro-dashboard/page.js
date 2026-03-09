'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  MapPin, Star, Clock, DollarSign, Briefcase, Bell, MessageSquare,
  ChevronRight, CheckCircle, XCircle, Phone, Mail, Calendar,
  TrendingUp, Users, Award, Settings, Edit, LogOut, FileText, Loader2
} from 'lucide-react';
import { signOut } from '@/store/slices/authSlice';
import { fetchProJobs, acceptJob, declineJob, fetchProStatistics, updateProProfile } from '@/store/slices/prosSlice';
import { fetchConversations, fetchMessages, sendMessage } from '@/store/slices/messagesSlice';
import { paymentsAPI, prosAPI, reviewsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

// Helper: format a booking from the API into a display-friendly job object
function formatJob(booking) {
  return {
    id: booking.id,
    service: booking.service_name || booking.services?.name || 'Service',
    customer: booking.profiles?.full_name || 'Customer',
    customerPhone: booking.profiles?.phone || '',
    customerEmail: booking.profiles?.email || '',
    address: `${booking.address || ''}, ${booking.city || ''} ${booking.state || ''}`.trim(),
    date: booking.scheduled_date ? new Date(booking.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '',
    time: booking.scheduled_time || '',
    estimatedPay: booking.total_price || booking.base_price || 0,
    billedAmount: booking.total_price || 0,
    status: booking.status,
    description: booking.special_instructions || booking.service_description || '',
    image: booking.services?.image_url || 'https://images.unsplash.com/photo-1585128792020-803d29415281?q=80&w=300',
    rating: booking.reviews?.[0]?.rating || null,
    booking_number: booking.booking_number,
    proofSubmitted: !!booking.proof_submitted_at,
  };
}

export default function ProDashboardPage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user, profile } = useSelector((state) => state.auth);
  const { jobAlerts: rawAlerts, activeJobs: rawActive, jobHistory: rawHistory, statistics, loading: prosLoading } = useSelector((state) => state.pros);
  const { conversations, loading: msgsLoading } = useSelector((state) => state.messages);
  const [activeTab, setActiveTab] = useState('alerts');
  const [expandedAlert, setExpandedAlert] = useState(null);
  const [connectStatus, setConnectStatus] = useState(null);
  const [earnings, setEarnings] = useState(null);
  const [connectLoading, setConnectLoading] = useState(false);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [proReviews, setProReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [respondingTo, setRespondingTo] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [respondLoading, setRespondLoading] = useState(false);

  // Format API data into display-friendly objects
  const jobAlerts = rawAlerts.map(formatJob);
  const activeJobs = rawActive.map(formatJob);
  const pastJobs = rawHistory.map(formatJob);

  useEffect(() => {
    if (!user) {
      router.push('/pro-login');
      return;
    }
    // Fetch jobs by status category
    dispatch(fetchProJobs({ status: 'pending' }));       // Job alerts (unassigned)
    dispatch(fetchProJobs({ status: 'accepted' }));      // Active jobs
    dispatch(fetchProJobs({ status: 'completed' }));     // Job history
    dispatch(fetchProStatistics());
    dispatch(fetchConversations());

    // Fetch reviews for this pro
    const fetchReviews = async () => {
      try {
        setReviewsLoading(true);
        // Get pro profile to get pro_id
        const proRes = await prosAPI.getMyProfile();
        const proId = proRes.data?.data?.proProfile?.id || proRes.data?.data?.id;
        if (proId) {
          const revRes = await reviewsAPI.getByProId(proId);
          setProReviews(revRes.data?.data?.reviews || []);
        }
      } catch (err) {
        console.log('[PRO-DASH] Could not fetch reviews:', err?.response?.status);
      }
      setReviewsLoading(false);
    };
    fetchReviews();

    // Fetch Stripe Connect status and earnings
    const fetchConnectData = async () => {
      try {
        const statusRes = await paymentsAPI.connectStatus();
        setConnectStatus(statusRes.data?.data || null);
      } catch (err) {
        console.log('[PRO-DASH] Connect status not available:', err?.response?.status);
      }
      try {
        setEarningsLoading(true);
        const earningsRes = await paymentsAPI.connectEarnings();
        setEarnings(earningsRes.data?.data || null);
      } catch (err) {
        console.log('[PRO-DASH] Earnings not available:', err?.response?.status);
      }
      setEarningsLoading(false);
    };
    fetchConnectData();
  }, [user, router, dispatch]);

  const handleAcceptJob = async (jobId) => {
    try {
      const result = await dispatch(acceptJob(jobId)).unwrap();
      const customerName = result?.profiles?.full_name || 'the customer';
      toast.success(`Job accepted! Contact ${customerName} to confirm details.`);
    } catch (err) {
      toast.error(err || 'Failed to accept job');
    }
  };

  const handleDeclineJob = async (jobId) => {
    try {
      await dispatch(declineJob({ jobId, reason: '' })).unwrap();
      toast.info('Job declined.');
    } catch (err) {
      toast.error(err || 'Failed to decline job');
    }
  };

  const [proofPhotos, setProofPhotos] = useState([]);
  const [proofNotes, setProofNotes] = useState('');
  const [proofJobId, setProofJobId] = useState(null);
  const [proofLoading, setProofLoading] = useState(false);
  const [proofMode, setProofMode] = useState('upload'); // 'upload' or 'url'
  const [proofFiles, setProofFiles] = useState([]);

  const handleSubmitProof = async () => {
    if (!proofJobId) return;

    // Validate based on mode
    if (proofMode === 'url' && proofPhotos.filter(u => u.trim()).length === 0) {
      toast.error('Please add at least one proof photo URL.');
      return;
    }
    if (proofMode === 'upload' && proofFiles.length === 0) {
      toast.error('Please select at least one file to upload.');
      return;
    }

    setProofLoading(true);
    try {
      let photos = proofPhotos;

      // If file upload mode, upload files first to get URLs
      if (proofMode === 'upload') {
        const uploadRes = await prosAPI.uploadProofFiles(proofJobId, proofFiles);
        photos = uploadRes.data?.data?.urls || [];
        if (photos.length === 0) {
          toast.error('File upload failed.');
          setProofLoading(false);
          return;
        }
      }

      const res = await prosAPI.submitProof(proofJobId, { photos, notes: proofNotes });
      toast.success(res.data?.message || 'Proof submitted! Waiting for customer confirmation.');
      setProofJobId(null);
      setProofPhotos([]);
      setProofNotes('');
      setProofFiles([]);
      setProofMode('upload');
      dispatch(fetchProJobs({ status: 'accepted' }));
      dispatch(fetchProJobs({ status: 'completed' }));
      dispatch(fetchProStatistics());
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to submit proof';
      toast.error(msg);
    } finally {
      setProofLoading(false);
    }
  };

  const handleRespondToReview = async (reviewId) => {
    if (!responseText.trim()) {
      toast.error('Please enter a response.');
      return;
    }
    setRespondLoading(true);
    try {
      await reviewsAPI.respond(reviewId, { response: responseText.trim() });
      toast.success('Response posted!');
      setRespondingTo(null);
      setResponseText('');
      // Refresh reviews
      const proRes = await prosAPI.getMyProfile();
      const proId = proRes.data?.data?.proProfile?.id;
      if (proId) {
        const revRes = await reviewsAPI.getByProId(proId);
        setProReviews(revRes.data?.data?.reviews || []);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to post response');
    } finally {
      setRespondLoading(false);
    }
  };

  const handleStripeOnboard = async () => {
    setConnectLoading(true);
    try {
      const res = await paymentsAPI.connectOnboard();
      const url = res.data?.data?.url;
      if (url) {
        window.location.href = url;
      } else {
        toast.error('Failed to get onboarding link.');
      }
    } catch (err) {
      console.error('[PRO-DASH] Stripe onboard error:', err);
      toast.error(err?.response?.data?.message || 'Failed to start Stripe onboarding.');
    }
    setConnectLoading(false);
  };

  const handleStripeDashboard = async () => {
    try {
      const res = await paymentsAPI.connectDashboard();
      const url = res.data?.data?.url;
      if (url) {
        window.open(url, '_blank');
      }
    } catch (err) {
      toast.error('Failed to open Stripe dashboard.');
    }
  };

  const handleSignOut = async () => {
    await dispatch(signOut());
    router.push('/');
  };

  // Stats from API or computed from job history
  const totalEarnings = statistics?.total_earnings || pastJobs.reduce((sum, j) => sum + (j.billedAmount || 0), 0);
  const avgRating = statistics?.rating || (pastJobs.length > 0 ? (pastJobs.reduce((sum, j) => sum + (j.rating || 0), 0) / pastJobs.filter(j => j.rating).length).toFixed(1) : '0.0');
  const completedCount = statistics?.completed_jobs || pastJobs.length;

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* ==================== LEFT SIDEBAR ==================== */}
          <div className="w-72 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm sticky top-28">
              {/* Profile Section */}
              <div className="text-center pt-6 pb-4 px-6">
                <div className="w-20 h-20 bg-[#1a4d5c] rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white text-2xl font-bold">
                    {(profile?.full_name || 'P').charAt(0).toUpperCase()}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-gray-900">{profile?.full_name || 'Pro User'}</h2>
                <div className="flex items-center justify-center gap-1 text-gray-500 text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{profile?.city || 'Toronto'}</span>
                </div>
                <div className="flex items-center justify-center gap-1 mt-1">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  <span className="text-sm font-semibold text-gray-700">{avgRating}</span>
                  <span className="text-xs text-gray-400">({completedCount} jobs)</span>
                </div>
                <span className="inline-block mt-2 px-3 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                  Active Pro
                </span>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-3 px-5 pb-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-[#0E7480]">${Number(totalEarnings).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Total Earned</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-lg font-bold text-green-600">{completedCount}</p>
                  <p className="text-xs text-gray-500">Jobs Done</p>
                </div>
              </div>

              {/* Navigation */}
              <nav>
                <button
                  onClick={() => setActiveTab('alerts')}
                  className={`w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100 ${
                    activeTab === 'alerts' ? 'bg-blue-50 border-l-4 border-l-[#0E7480]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Bell className={`w-5 h-5 ${activeTab === 'alerts' ? 'text-[#0E7480]' : 'text-gray-500'}`} />
                    <span className={`text-sm ${activeTab === 'alerts' ? 'text-[#0E7480] font-semibold' : 'text-gray-700'}`}>
                      Job Alerts
                    </span>
                  </div>
                  {jobAlerts.length > 0 && (
                    <span className="bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {jobAlerts.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('active')}
                  className={`w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100 ${
                    activeTab === 'active' ? 'bg-blue-50 border-l-4 border-l-[#0E7480]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Briefcase className={`w-5 h-5 ${activeTab === 'active' ? 'text-[#0E7480]' : 'text-gray-500'}`} />
                    <span className={`text-sm ${activeTab === 'active' ? 'text-[#0E7480] font-semibold' : 'text-gray-700'}`}>
                      Active Jobs
                    </span>
                  </div>
                  {activeJobs.length > 0 && (
                    <span className="bg-[#0E7480] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                      {activeJobs.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('history')}
                  className={`w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100 ${
                    activeTab === 'history' ? 'bg-blue-50 border-l-4 border-l-[#0E7480]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className={`w-5 h-5 ${activeTab === 'history' ? 'text-[#0E7480]' : 'text-gray-500'}`} />
                    <span className={`text-sm ${activeTab === 'history' ? 'text-[#0E7480] font-semibold' : 'text-gray-700'}`}>
                      Job History
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100 ${
                    activeTab === 'reviews' ? 'bg-blue-50 border-l-4 border-l-[#0E7480]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Star className={`w-5 h-5 ${activeTab === 'reviews' ? 'text-[#0E7480]' : 'text-gray-500'}`} />
                    <span className={`text-sm ${activeTab === 'reviews' ? 'text-[#0E7480] font-semibold' : 'text-gray-700'}`}>
                      Reviews
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('earnings')}
                  className={`w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100 ${
                    activeTab === 'earnings' ? 'bg-blue-50 border-l-4 border-l-[#0E7480]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className={`w-5 h-5 ${activeTab === 'earnings' ? 'text-[#0E7480]' : 'text-gray-500'}`} />
                    <span className={`text-sm ${activeTab === 'earnings' ? 'text-[#0E7480] font-semibold' : 'text-gray-700'}`}>
                      Earnings
                    </span>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('messages')}
                  className={`w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100 ${
                    activeTab === 'messages' ? 'bg-blue-50 border-l-4 border-l-[#0E7480]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MessageSquare className={`w-5 h-5 ${activeTab === 'messages' ? 'text-[#0E7480]' : 'text-gray-500'}`} />
                    <span className={`text-sm ${activeTab === 'messages' ? 'text-[#0E7480] font-semibold' : 'text-gray-700'}`}>
                      Messages
                    </span>
                  </div>
                </button>

                <Link href={`/pro-profile/${profile?.id || 'me'}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-gray-500" />
                    <span className="text-sm text-gray-700">My Pro Profile</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </Link>

                <button
                  onClick={() => setActiveTab('settings')}
                  className={`w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors group border-t border-gray-100 ${
                    activeTab === 'settings' ? 'bg-blue-50 border-l-4 border-l-[#0E7480]' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className={`w-5 h-5 ${activeTab === 'settings' ? 'text-[#0E7480]' : 'text-gray-500'}`} />
                    <span className={`text-sm ${activeTab === 'settings' ? 'text-[#0E7480] font-semibold' : 'text-gray-700'}`}>
                      Settings
                    </span>
                  </div>
                </button>
              </nav>

              {/* Sign Out */}
              <div className="border-t border-gray-100">
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center justify-center gap-2 px-5 py-4 text-red-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Sign Out</span>
                </button>
              </div>
            </div>
          </div>

          {/* ==================== MAIN CONTENT ==================== */}
          <div className="flex-1">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-1">Pro Dashboard</h1>
              <p className="text-gray-500 text-sm">Welcome back, {profile?.full_name?.split(' ')[0] || 'Pro'}!</p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-[#0E7480]" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{jobAlerts.length}</p>
                    <p className="text-xs text-gray-500">New Alerts</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <Briefcase className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{activeJobs.length}</p>
                    <p className="text-xs text-gray-500">Active Jobs</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-yellow-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">${Number(totalEarnings).toFixed(2)}</p>
                    <p className="text-xs text-gray-500">This Month</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Star className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{avgRating}</p>
                    <p className="text-xs text-gray-500">Avg Rating</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================== JOB ALERTS TAB ==================== */}
            {activeTab === 'alerts' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Job Alerts
                  {jobAlerts.length > 0 && (
                    <span className="ml-2 text-sm font-normal text-gray-500">
                      ({jobAlerts.length} new)
                    </span>
                  )}
                </h2>

                {jobAlerts.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No new job alerts</h3>
                    <p className="text-sm text-gray-500">New jobs matching your services will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobAlerts.map((job) => (
                      <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="flex">
                          {/* Job Image */}
                          <div className="w-32 h-32 relative flex-shrink-0">
                            <Image
                              src={job.image}
                              alt={job.service}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>

                          {/* Job Details */}
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-bold text-gray-900">{job.service}</h3>
                                <p className="text-sm text-gray-500 mt-0.5">{job.customer}</p>
                              </div>
                              <span className="text-lg font-bold text-green-600">${job.estimatedPay}</span>
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{job.address}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{job.date}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{job.time}</span>
                              </div>
                            </div>

                            {expandedAlert === job.id && (
                              <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                                <p className="font-medium mb-1">Job Description:</p>
                                <p>{job.description}</p>
                              </div>
                            )}
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col justify-center gap-2 p-4 border-l border-gray-100">
                            <button
                              onClick={() => handleAcceptJob(job.id)}
                              className="flex items-center gap-1.5 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Accept
                            </button>
                            <button
                              onClick={() => handleDeclineJob(job.id)}
                              className="flex items-center gap-1.5 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors"
                            >
                              <XCircle className="w-4 h-4" />
                              Decline
                            </button>
                            <button
                              onClick={() => setExpandedAlert(expandedAlert === job.id ? null : job.id)}
                              className="text-[#0E7480] text-xs hover:underline mt-1"
                            >
                              {expandedAlert === job.id ? 'Less info' : 'More info'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== ACTIVE JOBS TAB ==================== */}
            {activeTab === 'active' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Active Jobs</h2>

                {activeJobs.length === 0 ? (
                  <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
                    <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">No active jobs</h3>
                    <p className="text-sm text-gray-500">Accept a job alert to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeJobs.map((job) => (
                      <div key={job.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-20 h-20 relative rounded-lg overflow-hidden flex-shrink-0">
                            <Image
                              src={job.image}
                              alt={job.service}
                              fill
                              className="object-cover"
                              unoptimized
                            />
                          </div>

                          <div className="flex-1">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-bold text-gray-900">{job.service}</h3>
                                <p className="text-sm text-gray-600 mt-0.5">{job.customer}</p>
                              </div>
                              <span className="px-3 py-1 bg-blue-100 text-[#0E7480] text-xs font-semibold rounded-full">
                                Accepted
                              </span>
                            </div>

                            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{job.address}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                <span>{job.date}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{job.time}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <DollarSign className="w-3.5 h-3.5" />
                                <span className="font-semibold text-green-600">${job.estimatedPay}</span>
                              </div>
                            </div>

                            {/* Contact Info */}
                            <div className="mt-3 flex items-center gap-4">
                              <a
                                href={`tel:${job.customerPhone}`}
                                className="flex items-center gap-1.5 text-sm text-[#0E7480] hover:underline"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                {job.customerPhone}
                              </a>
                              <a
                                href={`mailto:${job.customerEmail}`}
                                className="flex items-center gap-1.5 text-sm text-[#0E7480] hover:underline"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                {job.customerEmail}
                              </a>
                            </div>
                          </div>

                          {/* Submit Proof / Status */}
                          <div className="flex flex-col gap-2">
                            {job.proofSubmitted ? (
                              <span className="flex items-center gap-1.5 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-semibold">
                                <CheckCircle className="w-4 h-4" />
                                Proof Sent
                              </span>
                            ) : (
                              <button
                                onClick={() => { setProofJobId(job.id); setProofPhotos([]); setProofNotes(''); }}
                                className="flex items-center gap-1.5 bg-[#ff9800] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#f57c00] transition-colors"
                              >
                                <FileText className="w-4 h-4" />
                                Submit Proof
                              </button>
                            )}
                            <Link
                              href={`/messages/${job.id}`}
                              className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Message
                            </Link>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ==================== JOB HISTORY TAB ==================== */}
            {activeTab === 'history' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Job History</h2>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Service</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Rating</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pastJobs.map((job) => (
                        <tr key={job.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 relative rounded-lg overflow-hidden flex-shrink-0">
                                <Image
                                  src={job.image}
                                  alt={job.service}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              <span className="text-sm font-medium text-gray-900">{job.service}</span>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-sm text-gray-600">{job.customer}</td>
                          <td className="px-5 py-4 text-sm text-gray-600">{job.date}</td>
                          <td className="px-5 py-4 text-sm font-semibold text-gray-900">${job.billedAmount}</td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <Star
                                  key={i}
                                  className={`w-3.5 h-3.5 ${
                                    i < job.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2.5 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                              Completed
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ==================== REVIEWS TAB ==================== */}
            {activeTab === 'reviews' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">
                  Customer Reviews
                  <span className="ml-2 text-sm font-normal text-gray-500">({proReviews.length})</span>
                </h2>

                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-[#0E7480]" />
                  </div>
                ) : proReviews.length === 0 ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                    <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No reviews yet</p>
                    <p className="text-gray-400 text-sm mt-1">Reviews from customers will appear here after completed jobs.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {proReviews.map((review) => {
                      const reviewerName = review.profiles?.full_name || 'Customer';
                      const reviewDate = review.created_at
                        ? new Date(review.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '';
                      const serviceName = review.bookings?.service_name || '';

                      return (
                        <div key={review.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                <span className="text-sm font-bold text-gray-600">{reviewerName.charAt(0)}</span>
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-gray-900">{reviewerName}</p>
                                {serviceName && <p className="text-xs text-gray-500">{serviceName}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                                  />
                                ))}
                              </div>
                              <p className="text-xs text-gray-400 mt-1">{reviewDate}</p>
                            </div>
                          </div>

                          {review.comment && (
                            <p className="text-sm text-gray-700 leading-relaxed mb-3">{review.comment}</p>
                          )}

                          {/* Existing response */}
                          {review.response ? (
                            <div className="ml-4 pl-4 border-l-2 border-blue-200 bg-blue-50/50 rounded-r-lg p-3">
                              <p className="text-xs font-semibold text-gray-700 mb-1">Your Response:</p>
                              <p className="text-sm text-gray-600">{review.response}</p>
                            </div>
                          ) : respondingTo === review.id ? (
                            /* Response form */
                            <div className="mt-3 bg-gray-50 rounded-lg p-4">
                              <label className="text-xs font-semibold text-gray-700 mb-2 block">Write your response:</label>
                              <textarea
                                value={responseText}
                                onChange={(e) => setResponseText(e.target.value)}
                                placeholder="Thank the customer, address feedback, or share additional context..."
                                className="w-full border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent resize-none"
                                rows={3}
                              />
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => handleRespondToReview(review.id)}
                                  disabled={respondLoading}
                                  className="bg-[#0E7480] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1e5bb8] transition-colors disabled:opacity-50 flex items-center gap-2"
                                >
                                  {respondLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                                  Post Response
                                </button>
                                <button
                                  onClick={() => { setRespondingTo(null); setResponseText(''); }}
                                  className="text-gray-500 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            /* Respond button */
                            <button
                              onClick={() => { setRespondingTo(review.id); setResponseText(''); }}
                              className="mt-2 flex items-center gap-1.5 text-[#0E7480] text-sm font-medium hover:underline"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Respond to Review
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ==================== EARNINGS TAB ==================== */}
            {activeTab === 'earnings' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Earnings & Payouts</h2>

                {/* Stripe Connect Onboarding Banner */}
                {connectStatus && !connectStatus.charges_enabled && (
                  <div className="mb-6 bg-gradient-to-r from-[#635bff] to-[#7c3aed] rounded-xl p-6 text-white">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                        <DollarSign className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold mb-1">Set Up Your Payouts</h3>
                        <p className="text-sm text-white/80 mb-4">
                          Connect your bank account through Stripe to receive automatic payouts when customers pay for your services.
                          {earnings?.commission_rate && (
                            <span> You earn {((1 - earnings.commission_rate) * 100).toFixed(0)}% of each job&apos;s base price.</span>
                          )}
                        </p>
                        <button
                          onClick={handleStripeOnboard}
                          disabled={connectLoading}
                          className="bg-white text-[#635bff] px-6 py-2.5 rounded-lg font-semibold text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                          {connectLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" /> Setting up...</>
                          ) : connectStatus?.connected ? (
                            'Complete Setup'
                          ) : (
                            'Connect Bank Account'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Connected Badge + Dashboard Link */}
                {connectStatus?.charges_enabled && (
                  <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">Stripe Payouts Active</p>
                        <p className="text-xs text-green-600">Your bank account is connected. Payouts are automatic.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleStripeDashboard}
                      className="px-4 py-2 bg-white border border-green-300 rounded-lg text-sm font-medium text-green-700 hover:bg-green-50 transition-colors"
                    >
                      Stripe Dashboard →
                    </button>
                  </div>
                )}

                {/* Earnings Summary Cards */}
                {earningsLoading ? (
                  <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center mb-8">
                    <Loader2 className="w-6 h-6 text-[#0E7480] mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-gray-500">Loading earnings...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-sm text-gray-500">Total Earned</p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">
                        ${earnings?.total_earnings?.toFixed(2) || Number(totalEarnings).toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {earnings?.total_jobs_paid || completedCount} paid jobs
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                          <Clock className="w-5 h-5 text-yellow-600" />
                        </div>
                        <p className="text-sm text-gray-500">Pending</p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">
                        ${earnings?.pending_earnings?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {earnings?.pending_jobs || 0} pending jobs
                      </p>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <TrendingUp className="w-5 h-5 text-[#0E7480]" />
                        </div>
                        <p className="text-sm text-gray-500">Your Rate</p>
                      </div>
                      <p className="text-3xl font-bold text-gray-900">
                        {earnings?.commission_rate ? `${((1 - earnings.commission_rate) * 100).toFixed(0)}%` : '85%'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        of base service price
                      </p>
                    </div>
                  </div>
                )}

                {/* Recent Transactions */}
                <h3 className="text-lg font-bold text-gray-900 mb-3">Recent Transactions</h3>
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {(earnings?.transactions || pastJobs).length > 0 ? (
                    (earnings?.transactions || pastJobs).map((item, index) => {
                      const isTransaction = !!item.stripe_payment_intent_id;
                      const serviceName = isTransaction ? (item.bookings?.service_name || item.description) : item.service;
                      const date = isTransaction
                        ? new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : item.date;
                      const amount = isTransaction
                        ? parseFloat(item.bookings?.base_price || item.amount || 0) * (1 - (earnings?.commission_rate || 0.15))
                        : item.billedAmount;
                      const status = isTransaction ? item.status : 'succeeded';
                      const arr = earnings?.transactions || pastJobs;

                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between px-5 py-4 ${
                            index < arr.length - 1 ? 'border-b border-gray-100' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              status === 'succeeded' ? 'bg-green-100' : status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                            }`}>
                              <DollarSign className={`w-5 h-5 ${
                                status === 'succeeded' ? 'text-green-600' : status === 'pending' ? 'text-yellow-600' : 'text-red-600'
                              }`} />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">{serviceName}</p>
                              <p className="text-xs text-gray-500">
                                {isTransaction ? (item.bookings?.booking_number || '') : item.booking_number} &middot; {date}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-sm font-bold ${
                              status === 'succeeded' ? 'text-green-600' : status === 'pending' ? 'text-yellow-600' : 'text-red-500'
                            }`}>
                              {status === 'succeeded' ? '+' : ''}${parseFloat(amount || 0).toFixed(2)}
                            </p>
                            <p className="text-xs text-gray-400">
                              {status === 'succeeded' ? 'Deposited' : status === 'pending' ? 'Pending' : 'Failed'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-5 py-8 text-center">
                      <p className="text-sm text-gray-500">No transactions yet. Complete jobs to start earning!</p>
                    </div>
                  )}
                </div>

                {/* Payment Info */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-5">
                  <div className="flex items-start gap-3">
                    <Award className="w-5 h-5 text-[#0E7480] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">How Payouts Work</p>
                      <p className="text-sm text-gray-600 mt-1">
                        When a customer pays for your service, the payment is automatically split.
                        You receive {earnings?.commission_rate ? `${((1 - earnings.commission_rate) * 100).toFixed(0)}%` : '85%'} of the base service price, deposited directly to your bank account via Stripe.
                        BridgeWork retains {earnings?.commission_rate ? `${(earnings.commission_rate * 100).toFixed(0)}%` : '15%'} as a platform fee.
                        Payouts typically arrive within 2-4 business days.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== MESSAGES TAB ==================== */}
            {activeTab === 'messages' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Messages</h2>

                {msgsLoading.conversations ? (
                  <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
                    <Loader2 className="w-8 h-8 text-[#0E7480] mx-auto mb-3 animate-spin" />
                    <p className="text-sm text-gray-500">Loading conversations...</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {conversations.length > 0 ? (
                      conversations.map((convo, index) => (
                        <Link
                          key={convo.booking_id}
                          href={`/messages/${convo.booking_id}`}
                          className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                            index < conversations.length - 1 ? 'border-b border-gray-100' : ''
                          }`}
                        >
                          <div className="w-10 h-10 bg-[#1a4d5c] rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-sm font-bold">
                              {convo.other_party?.full_name?.charAt(0) || '?'}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <p className={`text-sm ${convo.unread_count > 0 ? 'font-bold' : 'font-semibold'} text-gray-900`}>
                                {convo.other_party?.full_name || 'Unknown'}
                              </p>
                              <span className="text-xs text-gray-400">
                                {convo.latest_message?.created_at
                                  ? new Date(convo.latest_message.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                  : convo.scheduled_date
                                    ? new Date(convo.scheduled_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    : ''}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">
                              {convo.latest_message?.message || `Re: ${convo.service_name}`}
                            </p>
                          </div>
                          {convo.unread_count > 0 && (
                            <span className="bg-[#0E7480] text-white text-xs w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                              {convo.unread_count}
                            </span>
                          )}
                        </Link>
                      ))
                    ) : (
                      <div className="p-12 text-center">
                        <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">No messages yet</h3>
                        <p className="text-sm text-gray-500">Messages with clients will appear here after you accept a job.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ==================== SETTINGS TAB ==================== */}
            {activeTab === 'settings' && (
              <div>
                <h2 className="text-xl font-bold text-gray-900 mb-4">Pro Account Settings</h2>

                <div className="space-y-6">
                  {/* Business Information */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Business Information</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                        <input
                          type="text"
                          defaultValue={profile?.full_name || ''}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          defaultValue={user?.email || ''}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                        <input
                          type="tel"
                          defaultValue={profile?.phone || ''}
                          placeholder="(416) 555-0000"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          defaultValue={profile?.city || ''}
                          placeholder="Toronto"
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Services */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Services Offered</h3>
                    <p className="text-sm text-gray-500 mb-4">Select the services your business provides.</p>
                    <div className="grid grid-cols-3 gap-3">
                      {['Furnace Tune-Up', 'AC Tune-Up', 'Duct Cleaning', 'Heating & Cooling', 'Plumbing', 'Electrical', 'Handyman Services', 'Painting', 'Lawn Maintenance'].map((service) => (
                        <label key={service} className="flex items-center gap-2 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 rounded text-[#0E7480] focus:ring-[#0E7480]" />
                          <span className="text-sm text-gray-700">{service}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">Documents & Credentials</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">Liability Insurance</span>
                        </div>
                        <span className="text-xs text-green-600 font-medium">Verified</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <span className="text-sm text-gray-700">Business License</span>
                        </div>
                        <span className="text-xs text-green-600 font-medium">Verified</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm text-gray-700">WSIB Certificate</span>
                        </div>
                        <span className="text-xs text-yellow-600 font-medium">Expires Mar 2026</span>
                      </div>
                    </div>
                    <button className="mt-4 text-[#0E7480] text-sm font-semibold hover:underline">
                      Upload new document
                    </button>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => toast.success('Settings saved!')}
                      className="bg-[#0E7480] text-white px-8 py-2.5 rounded-lg font-semibold hover:bg-[#1e5bb8] transition-colors text-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Proof Submission Modal */}
      {proofJobId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setProofJobId(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Submit Proof of Work</h3>
              <button onClick={() => setProofJobId(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">
              Upload proof showing the completed work. The customer will review these before releasing payment.
            </p>

            {/* Mode Toggle */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
              <button
                onClick={() => setProofMode('upload')}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
                  proofMode === 'upload' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Upload Files
              </button>
              <button
                onClick={() => setProofMode('url')}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors ${
                  proofMode === 'url' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Photo URL
              </button>
            </div>

            {/* File Upload Mode */}
            {proofMode === 'upload' && (
              <div className="mb-4">
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-[#0E7480] hover:bg-blue-50/50 transition-colors">
                  <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16v-8m0 0l-3 3m3-3l3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" />
                  </svg>
                  <span className="text-sm text-gray-600 font-medium">Click to select files</span>
                  <span className="text-xs text-gray-400 mt-0.5">JPG, PNG, or PDF (max 10MB each)</span>
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf"
                    className="hidden"
                    onChange={(e) => {
                      const newFiles = Array.from(e.target.files || []);
                      setProofFiles(prev => [...prev, ...newFiles]);
                      e.target.value = '';
                    }}
                  />
                </label>
                {proofFiles.length > 0 && (
                  <div className="mt-2 space-y-1.5">
                    {proofFiles.map((file, i) => (
                      <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                            file.name.toLowerCase().endsWith('.pdf') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                          }`}>
                            {file.name.split('.').pop().toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-700 truncate">{file.name}</span>
                          <span className="text-xs text-gray-400 shrink-0">{(file.size / 1024).toFixed(0)}KB</span>
                        </div>
                        <button
                          onClick={() => setProofFiles(proofFiles.filter((_, idx) => idx !== i))}
                          className="text-red-400 hover:text-red-600 shrink-0 ml-2"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* URL Mode */}
            {proofMode === 'url' && (
              <div className="space-y-2 mb-4">
                {proofPhotos.map((url, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={url}
                      onChange={(e) => {
                        const updated = [...proofPhotos];
                        updated[i] = e.target.value;
                        setProofPhotos(updated);
                      }}
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 outline-none"
                      placeholder="https://example.com/photo.jpg"
                    />
                    <button
                      onClick={() => setProofPhotos(proofPhotos.filter((_, idx) => idx !== i))}
                      className="text-red-400 hover:text-red-600"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => setProofPhotos([...proofPhotos, ''])}
                  className="text-sm text-[#0E7480] font-medium hover:underline"
                >
                  + Add photo URL
                </button>
              </div>
            )}

            {/* Notes */}
            <textarea
              value={proofNotes}
              onChange={(e) => setProofNotes(e.target.value)}
              placeholder="Optional notes about the work completed..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-20 focus:ring-2 focus:ring-blue-300 outline-none mb-4"
            />

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setProofJobId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitProof}
                disabled={proofLoading || (proofMode === 'url' && proofPhotos.filter(u => u.trim()).length === 0) || (proofMode === 'upload' && proofFiles.length === 0)}
                className="px-4 py-2 text-sm font-semibold bg-[#ff9800] text-white rounded-lg hover:bg-[#f57c00] disabled:opacity-50"
              >
                {proofLoading ? 'Submitting...' : 'Submit Proof'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
