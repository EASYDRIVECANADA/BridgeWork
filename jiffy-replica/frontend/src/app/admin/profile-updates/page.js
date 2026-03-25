'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import {
  CheckCircle, XCircle, Clock, User, ArrowRight, Loader2,
  FileText, ExternalLink, X, Shield, Building2
} from 'lucide-react';
import { proProfileUpdatesAPI } from '@/lib/api';
import { toast } from 'react-toastify';

// Human-readable field labels
const FIELD_LABELS = {
  business_name: 'Business Name',
  business_address: 'Business Address',
  business_unit: 'Unit / Suite',
  gst_number: 'GST/HST Number',
  website: 'Website',
  insurance_provider: 'Insurance Provider',
  insurance_policy_number: 'Policy Number',
  insurance_expiry: 'Insurance Expiry',
  insurance_document_url: 'Insurance Document',
};

export default function AdminProfileUpdatesPage() {
  const router = useRouter();
  const { user, profile } = useSelector((state) => state.auth);
  useAdminPermission('profile_updates');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadRequests();
  }, [user, profile, router, filter]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const res = await proProfileUpdatesAPI.getRequests({ status: filter });
      setRequests(res.data?.data?.requests || []);
    } catch (err) {
      toast.error('Failed to load profile update requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    if (!confirm('Approve this profile update? Changes will be applied immediately.')) return;
    setActionLoading(id);
    try {
      await proProfileUpdatesAPI.approve(id);
      toast.success('Profile update approved and applied!');
      loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || rejectReason.trim().length < 3) {
      toast.error('Please provide a reason (min 3 characters)');
      return;
    }
    setActionLoading(rejectModal);
    try {
      await proProfileUpdatesAPI.reject(rejectModal, { reason: rejectReason.trim() });
      toast.success('Profile update rejected');
      setRejectModal(null);
      setRejectReason('');
      loadRequests();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  const renderFieldValue = (field, value) => {
    if (!value && value !== 0) return <span className="text-gray-400 italic">Empty</span>;
    if (field === 'insurance_document_url') {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#0E7480] hover:underline text-sm inline-flex items-center gap-1">
          View Document <ExternalLink className="w-3 h-3" />
        </a>
      );
    }
    if (field === 'insurance_expiry') {
      return <span>{new Date(value).toLocaleDateString()}</span>;
    }
    return <span>{value}</span>;
  };

  if (!user || profile?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Pro Profile Updates</h1>
          <p className="text-gray-500 text-sm">Review and approve changes made by Pros to their business info and insurance</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {[
            { key: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
            { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
            { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                filter === tab.key
                  ? tab.color
                  : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No {filter} requests</h3>
            <p className="text-sm text-gray-500">
              {filter === 'pending'
                ? 'No Pro profile updates waiting for review.'
                : `No ${filter} profile update requests found.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const proName = req.pro_profile?.profiles?.full_name || req.pro_profile?.business_name || 'Unknown Pro';
              const proEmail = req.pro_profile?.profiles?.email || '';
              const proAvatar = req.pro_profile?.profiles?.avatar_url;
              const isExpanded = expandedId === req.id;
              const changedFields = Object.keys(req.requested_changes || {});

              return (
                <div key={req.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                  {/* Header */}
                  <div
                    className="flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedId(isExpanded ? null : req.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
                        {proAvatar ? (
                          <img src={proAvatar} alt={proName} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{proName}</p>
                        <p className="text-xs text-gray-500">{proEmail}</p>
                      </div>
                      <span className="text-xs text-gray-400 ml-4">
                        {changedFields.length} field{changedFields.length !== 1 ? 's' : ''} changed
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-400">
                        {new Date(req.created_at).toLocaleDateString()}
                      </span>
                      {req.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      ) : req.status === 'approved' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                          <CheckCircle className="w-3 h-3" /> Approved
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                          <XCircle className="w-3 h-3" /> Rejected
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 px-6 py-5">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">Requested Changes</h4>
                      <div className="space-y-3">
                        {changedFields.map((field) => {
                          const oldVal = req.previous_values?.[field];
                          const newVal = req.requested_changes?.[field];
                          const hasChanged = oldVal !== newVal;
                          return (
                            <div key={field} className={`p-3 rounded-lg border ${hasChanged ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-gray-50'}`}>
                              <p className="text-xs font-medium text-gray-500 mb-1.5">{FIELD_LABELS[field] || field}</p>
                              <div className="flex items-center gap-3">
                                <div className="flex-1">
                                  <p className="text-xs text-gray-400 mb-0.5">Current</p>
                                  <p className="text-sm text-gray-600">{renderFieldValue(field, oldVal)}</p>
                                </div>
                                {hasChanged && <ArrowRight className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                                <div className="flex-1">
                                  <p className="text-xs text-gray-400 mb-0.5">Requested</p>
                                  <p className="text-sm text-gray-900 font-medium">{renderFieldValue(field, newVal)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Reviewer info for non-pending */}
                      {req.status !== 'pending' && req.reviewer && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <p className="text-xs text-gray-500">
                            {req.status === 'approved' ? 'Approved' : 'Rejected'} by{' '}
                            <span className="font-medium text-gray-700">{req.reviewer.full_name}</span>{' '}
                            on {new Date(req.reviewed_at).toLocaleDateString()}
                          </p>
                          {req.rejection_reason && (
                            <p className="text-sm text-red-700 mt-1">Reason: {req.rejection_reason}</p>
                          )}
                        </div>
                      )}

                      {/* Action Buttons (pending only) */}
                      {req.status === 'pending' && (
                        <div className="mt-5 flex items-center gap-3 justify-end">
                          <button
                            onClick={() => { setRejectModal(req.id); setRejectReason(''); }}
                            disabled={actionLoading === req.id}
                            className="px-5 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(req.id)}
                            disabled={actionLoading === req.id}
                            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {actionLoading === req.id ? 'Processing...' : 'Approve & Apply'}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Reject Profile Update</h3>
              <button onClick={() => setRejectModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this update. The Pro will see this reason.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setRejectModal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === rejectModal}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading === rejectModal ? 'Rejecting...' : 'Reject Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
