'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { Plus, Mail, X, Clock, CheckCircle, XCircle, RefreshCw, UserPlus } from 'lucide-react';
import api from '@/lib/api';

export default function AdminInvitationsPage() {
  const router = useRouter();
  const { profile } = useSelector((state) => state.auth);
  useAdminPermission('invitations');
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDirectCreateModal, setShowDirectCreateModal] = useState(false);
  const ALL_PERMISSIONS = [
    { key: 'revenue', label: 'Revenue Dashboard' },
    { key: 'services', label: 'Services Management' },
    { key: 'categories', label: 'Categories Management' },
    { key: 'pro_applications', label: 'Pro Applications' },
    { key: 'profile_updates', label: 'Profile Update Requests' },
    { key: 'invitations', label: 'Admin Invitations' },
    { key: 'payouts', label: 'Payouts Management' },
    { key: 'quotations', label: 'Quotations' },
    { key: 'quote_assignments', label: 'Quote Assignments' },
    { key: 'quote_requests', label: 'Quote Requests' },
    { key: 'proofs', label: 'Job Proofs' },
    { key: 'support_chat', label: 'Support Chat' },
    { key: 'disputes', label: 'Disputes' },
  ];

  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    admin_permissions: {}
  });
  const [directFormData, setDirectFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    password: '',
    confirmPassword: '',
    admin_permissions: {}
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (profile?.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchInvitations();
  }, [profile, router]);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/invitations');
      if (response.data.success) {
        setInvitations(response.data.data.invitations);
      }
    } catch (err) {
      console.error('Failed to fetch invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const response = await api.post('/admin/invitations', formData);
      if (response.data.success) {
        setSuccess('Invitation sent successfully!');
        setFormData({ email: '', full_name: '', phone: '', admin_permissions: {} });
        setShowCreateModal(false);
        fetchInvitations();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;

    try {
      await api.delete(`/admin/invitations/${id}`);
      fetchInvitations();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
    }
  };

  const handleResend = async (id) => {
    try {
      const response = await api.post(`/admin/invitations/${id}/resend`);
      if (response.data.success) {
        alert('Invitation resent successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to resend invitation');
    }
  };

  const handleDirectCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (directFormData.password !== directFormData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (directFormData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    try {
      const response = await api.post('/admin/invitations/direct-create', {
        email: directFormData.email,
        full_name: directFormData.full_name,
        phone: directFormData.phone,
        password: directFormData.password,
        admin_permissions: directFormData.admin_permissions
      });
      if (response.data.success) {
        setSuccess('Admin account created successfully!');
        setDirectFormData({ email: '', full_name: '', phone: '', password: '', confirmPassword: '', admin_permissions: {} });
        setShowDirectCreateModal(false);
        alert('Admin account created successfully! They can now log in.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create admin account');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      accepted: 'bg-green-100 text-green-800',
      expired: 'bg-red-100 text-red-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };

    const icons = {
      pending: <Clock className="w-4 h-4" />,
      accepted: <CheckCircle className="w-4 h-4" />,
      expired: <XCircle className="w-4 h-4" />,
      cancelled: <X className="w-4 h-4" />
    };

    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {icons[status]}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E7480] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading invitations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Invitations</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Invite new admins to join the BridgeWork team</p>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                onClick={() => { setError(''); setSuccess(''); setShowDirectCreateModal(true); }}
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#142841] text-white rounded-lg hover:bg-[#0e1e30] transition-colors font-medium text-sm sm:text-base"
              >
                <UserPlus className="w-4 sm:w-5 h-4 sm:h-5" />
                Add Admin
              </button>
              <button
                onClick={() => { setError(''); setSuccess(''); setShowCreateModal(true); }}
                className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#0E7480] text-white rounded-lg hover:bg-[#0a5a63] transition-colors font-medium text-sm sm:text-base"
              >
                <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
                Send Invitation
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-600">Total Invitations</div>
            <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-gray-900">{invitations.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-600">Pending</div>
            <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-yellow-600">
              {invitations.filter(i => i.status === 'pending').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-600">Accepted</div>
            <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-green-600">
              {invitations.filter(i => i.status === 'accepted').length}
            </div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 sm:p-6">
            <div className="text-xs sm:text-sm font-medium text-gray-600">Expired</div>
            <div className="mt-1 sm:mt-2 text-2xl sm:text-3xl font-bold text-red-600">
              {invitations.filter(i => i.status === 'expired').length}
            </div>
          </div>
        </div>

        {/* Invitations Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invitee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invited By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invitations.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No invitations yet</p>
                      <p className="text-sm">Send your first admin invitation to get started</p>
                    </td>
                  </tr>
                ) : (
                  invitations.map((invitation) => (
                    <tr key={invitation.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{invitation.full_name}</div>
                        {invitation.phone && (
                          <div className="text-sm text-gray-500">{invitation.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{invitation.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {invitation.invited_by_profile?.full_name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(invitation.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(invitation.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {invitation.status === 'pending' && (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleResend(invitation.id)}
                              className="text-[#0E7480] hover:text-[#0a5a63] inline-flex items-center gap-1"
                            >
                              <RefreshCw className="w-4 h-4" />
                              Resend
                            </button>
                            <button
                              onClick={() => handleCancel(invitation.id)}
                              className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                            >
                              <X className="w-4 h-4" />
                              Cancel
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create Invitation Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Send Admin Invitation</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
                {success}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Permissions
                </label>
                <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {ALL_PERMISSIONS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!formData.admin_permissions[key]}
                        onChange={(e) => setFormData({
                          ...formData,
                          admin_permissions: { ...formData.admin_permissions, [key]: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-[#0E7480] focus:ring-[#0E7480]"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, admin_permissions: Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, true])) })}
                    className="text-xs text-[#0E7480] hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-xs text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, admin_permissions: {} })}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[#0E7480] text-white rounded-lg hover:bg-[#0a5a63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Direct Create Admin Modal */}
      {showDirectCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Add Admin Directly</h2>
              <button
                onClick={() => setShowDirectCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <p className="text-sm text-gray-500 mb-4">
              Create an admin account directly — no email invitation needed. The admin can log in immediately with the credentials you set.
            </p>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleDirectCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={directFormData.full_name}
                  onChange={(e) => setDirectFormData({ ...directFormData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={directFormData.email}
                  onChange={(e) => setDirectFormData({ ...directFormData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  value={directFormData.phone}
                  onChange={(e) => setDirectFormData({ ...directFormData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={directFormData.password}
                  onChange={(e) => setDirectFormData({ ...directFormData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                  placeholder="Min 6 characters"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={directFormData.confirmPassword}
                  onChange={(e) => setDirectFormData({ ...directFormData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                  placeholder="Confirm password"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Permissions
                </label>
                <div className="border border-gray-200 rounded-lg p-3 space-y-2 max-h-48 overflow-y-auto">
                  {ALL_PERMISSIONS.map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!directFormData.admin_permissions[key]}
                        onChange={(e) => setDirectFormData({
                          ...directFormData,
                          admin_permissions: { ...directFormData.admin_permissions, [key]: e.target.checked }
                        })}
                        className="rounded border-gray-300 text-[#0E7480] focus:ring-[#0E7480]"
                      />
                      <span className="text-sm text-gray-700">{label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setDirectFormData({ ...directFormData, admin_permissions: Object.fromEntries(ALL_PERMISSIONS.map(p => [p.key, true])) })}
                    className="text-xs text-[#0E7480] hover:underline"
                  >
                    Select All
                  </button>
                  <span className="text-xs text-gray-400">|</span>
                  <button
                    type="button"
                    onClick={() => setDirectFormData({ ...directFormData, admin_permissions: {} })}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    Clear All
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowDirectCreateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[#142841] text-white rounded-lg hover:bg-[#0e1e30] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
