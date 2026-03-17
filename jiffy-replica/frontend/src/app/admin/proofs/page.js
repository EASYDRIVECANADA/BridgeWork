'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import {
  Camera,
  User,
  Clock,
  CheckCircle,
  AlertTriangle,
  DollarSign,
  Loader2,
  Eye,
  FileText,
  Briefcase,
  ExternalLink,
} from 'lucide-react';
import { bookingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

const statusColors = {
  proof_submitted: 'bg-indigo-100 text-indigo-700',
  completed: 'bg-green-100 text-green-700',
  disputed: 'bg-red-100 text-red-700',
  accepted: 'bg-blue-100 text-blue-700',
};

const statusLabels = {
  proof_submitted: 'Awaiting Payment',
  completed: 'Completed',
  disputed: 'Disputed',
  accepted: 'In Progress',
};

export default function AdminProofsPage() {
  const router = useRouter();
  const { user, profile } = useSelector((state) => state.auth);
  const [proofs, setProofs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all', 'awaiting', 'completed'
  const [selectedProof, setSelectedProof] = useState(null);

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      router.push('/login');
      return;
    }
    fetchProofs();
  }, [user, profile, router]);

  const fetchProofs = async () => {
    try {
      const res = await bookingsAPI.getAllProofs();
      setProofs(res.data?.data?.proofs || []);
    } catch (err) {
      console.error('Failed to fetch proofs:', err);
      toast.error('Failed to load proofs');
    } finally {
      setLoading(false);
    }
  };

  const filteredProofs = proofs.filter((p) => {
    if (filter === 'awaiting') return p.bookings?.status === 'proof_submitted';
    if (filter === 'completed') return p.bookings?.status === 'completed';
    return true;
  });

  const awaitingCount = proofs.filter((p) => p.bookings?.status === 'proof_submitted').length;
  const completedCount = proofs.filter((p) => p.bookings?.status === 'completed').length;

  if (!user || profile?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Camera className="w-6 h-6 text-[#0E7480]" />
            Proof of Work Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            View all submitted proofs of work from pros
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{proofs.length}</p>
                <p className="text-xs text-gray-500">Total Proofs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{awaitingCount}</p>
                <p className="text-xs text-gray-500">Awaiting Payment</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{completedCount}</p>
                <p className="text-xs text-gray-500">Completed & Paid</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All ({proofs.length})
          </button>
          <button
            onClick={() => setFilter('awaiting')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'awaiting'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Awaiting Payment ({awaitingCount})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === 'completed'
                ? 'bg-[#0E7480] text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Completed ({completedCount})
          </button>
        </div>

        {/* Proofs List */}
        {loading ? (
          <div className="bg-white rounded-xl p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading proofs...</span>
          </div>
        ) : filteredProofs.length === 0 ? (
          <div className="bg-white rounded-xl p-10 text-center">
            <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No proofs found</p>
            <p className="text-gray-500 text-sm">Proofs will appear here when pros submit them</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProofs.map((proof) => {
              const booking = proof.bookings;
              const pro = proof.pro_profiles;
              const customer = booking?.profiles;

              return (
                <div
                  key={proof.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Proof Photos Preview */}
                  <div className="relative h-40 bg-gray-100">
                    {proof.photos && proof.photos.length > 0 ? (
                      <div className="grid grid-cols-2 h-full">
                        {proof.photos.slice(0, 4).map((photo, idx) => (
                          <div
                            key={idx}
                            className={`relative ${
                              proof.photos.length === 1 ? 'col-span-2' : ''
                            }`}
                          >
                            <img
                              src={photo}
                              alt={`Proof ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                            {idx === 3 && proof.photos.length > 4 && (
                              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                <span className="text-white font-semibold">
                                  +{proof.photos.length - 4}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Camera className="w-8 h-8 text-gray-300" />
                      </div>
                    )}
                    {/* Status Badge */}
                    <div className="absolute top-2 right-2">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          statusColors[booking?.status] || 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {statusLabels[booking?.status] || booking?.status}
                      </span>
                    </div>
                  </div>

                  {/* Proof Details */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 truncate">
                      {booking?.service_name || 'Service'}
                    </h3>

                    <div className="space-y-2 text-sm">
                      {/* Pro */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Briefcase className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{pro?.business_name || 'Pro'}</span>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <User className="w-4 h-4 text-gray-400" />
                        <span className="truncate">{customer?.full_name || 'Customer'}</span>
                      </div>

                      {/* Amount */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="w-4 h-4 text-gray-400" />
                        <span>${parseFloat(booking?.total_price || 0).toFixed(2)}</span>
                      </div>

                      {/* Submitted At */}
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>
                          {proof.submitted_at
                            ? new Date(proof.submitted_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {proof.notes && (
                      <p className="mt-3 text-sm text-gray-500 line-clamp-2">
                        {proof.notes}
                      </p>
                    )}

                    {/* View Button */}
                    <button
                      onClick={() => setSelectedProof(proof)}
                      className="mt-4 w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      View Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Proof Detail Modal */}
      {selectedProof && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Proof of Work Details
                </h3>
                <button
                  onClick={() => setSelectedProof(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Booking Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Service</p>
                    <p className="font-medium text-gray-900">
                      {selectedProof.bookings?.service_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Booking #</p>
                    <p className="font-medium text-gray-900">
                      {selectedProof.bookings?.booking_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Pro</p>
                    <p className="font-medium text-gray-900">
                      {selectedProof.pro_profiles?.business_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Customer</p>
                    <p className="font-medium text-gray-900">
                      {selectedProof.bookings?.profiles?.full_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Amount</p>
                    <p className="font-medium text-gray-900">
                      ${parseFloat(selectedProof.bookings?.total_price || 0).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Status</p>
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        statusColors[selectedProof.bookings?.status] || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {statusLabels[selectedProof.bookings?.status] || selectedProof.bookings?.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Photos */}
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Photos ({selectedProof.photos?.length || 0})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {selectedProof.photos?.map((photo, idx) => (
                    <a
                      key={idx}
                      href={photo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-square rounded-lg overflow-hidden bg-gray-100 hover:opacity-80 transition-opacity"
                    >
                      <img
                        src={photo}
                        alt={`Proof ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>

              {/* Notes */}
              {selectedProof.notes && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Notes</p>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                    {selectedProof.notes}
                  </p>
                </div>
              )}

              {/* Submitted At */}
              <div className="text-sm text-gray-500">
                Submitted:{' '}
                {selectedProof.submitted_at
                  ? new Date(selectedProof.submitted_at).toLocaleString()
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
