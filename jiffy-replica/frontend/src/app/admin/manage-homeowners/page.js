'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import {
  Users,
  Search,
  Loader2,
  ToggleLeft,
  ToggleRight,
  KeyRound,
  Mail,
  X,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { adminManageAPI } from '@/lib/api';

export default function ManageHomeownersPage() {
  const router = useRouter();
  const { profile, authInitialized } = useSelector((state) => state.auth);

  const [homeowners, setHomeowners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toggling, setToggling] = useState(null);
  const [resetting, setResetting] = useState(null);
  const [editEmail, setEditEmail] = useState(null);
  const [newEmail, setNewEmail] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  useEffect(() => {
    if (!authInitialized) return;
    if (!profile || profile.role !== 'admin') {
      router.push('/');
      return;
    }
    if (!profile.is_superadmin) {
      toast.error('SuperAdmin access required.');
      router.push('/admin/revenue');
      return;
    }
    fetchHomeowners();
  }, [authInitialized, profile]);

  const fetchHomeowners = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminManageAPI.listHomeowners();
      setHomeowners(res.data?.data?.homeowners || []);
    } catch (err) {
      toast.error('Failed to load homeowners');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggleActive = async (id) => {
    setToggling(id);
    try {
      const res = await adminManageAPI.toggleUserActive(id);
      toast.success(res.data?.message || 'Status updated');
      fetchHomeowners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    } finally {
      setToggling(null);
    }
  };

  const handleSendPasswordReset = async (id, email) => {
    setResetting(id);
    try {
      await adminManageAPI.sendUserPasswordReset(id);
      toast.success(`Password reset email sent to ${email}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send reset email');
    } finally {
      setResetting(null);
    }
  };

  const handleUpdateEmail = async () => {
    if (!editEmail || !newEmail) return;
    setEmailSaving(true);
    try {
      await adminManageAPI.updateUserEmail(editEmail, newEmail);
      toast.success('Email updated successfully');
      setEditEmail(null);
      setNewEmail('');
      fetchHomeowners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update email');
    } finally {
      setEmailSaving(false);
    }
  };

  const filtered = homeowners.filter(
    (h) =>
      (h.full_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (h.phone || '').includes(searchQuery)
  );

  if (!authInitialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#0E7480]/10 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-[#0E7480]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Homeowners</h1>
            <p className="text-sm text-gray-500">{homeowners.length} homeowner accounts</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Name</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Email</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Phone</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">City</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Joined</th>
              <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                  {searchQuery ? 'No homeowners match your search.' : 'No homeowner accounts found.'}
                </td>
              </tr>
            ) : (
              filtered.map((h) => (
                <tr key={h.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 text-sm font-medium text-gray-900">{h.full_name || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{h.email}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{h.phone || '—'}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{h.city || '—'}</td>
                  <td className="px-5 py-3">
                    {h.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {h.created_at ? new Date(h.created_at).toLocaleDateString('en-CA') : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleActive(h.id)}
                        disabled={toggling === h.id}
                        title={h.is_active ? 'Deactivate' : 'Activate'}
                        className={`p-1.5 rounded-lg transition-colors ${h.is_active ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'}`}
                      >
                        {toggling === h.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : h.is_active ? (
                          <ToggleRight className="w-4 h-4" />
                        ) : (
                          <ToggleLeft className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => handleSendPasswordReset(h.id, h.email)}
                        disabled={resetting === h.id}
                        title="Send Password Reset"
                        className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"
                      >
                        {resetting === h.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <KeyRound className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={() => { setEditEmail(h.id); setNewEmail(h.email || ''); }}
                        title="Change Email"
                        className="p-1.5 rounded-lg text-[#0E7480] hover:bg-[#0E7480]/10 transition-colors"
                      >
                        <Mail className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Email Change Modal */}
      {editEmail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Change Email Address</h3>
              <button onClick={() => { setEditEmail(null); setNewEmail(''); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              This will update the user's email in both the authentication system and their profile.
            </p>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email address"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={() => { setEditEmail(null); setNewEmail(''); }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateEmail}
                disabled={emailSaving || !newEmail}
                className="flex-1 px-4 py-2.5 bg-[#0E7480] text-white rounded-lg text-sm font-semibold hover:bg-[#0a5a63] transition-colors disabled:opacity-50"
              >
                {emailSaving ? 'Updating...' : 'Update Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
