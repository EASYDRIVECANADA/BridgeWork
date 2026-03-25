'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import {
  Shield,
  Users,
  CheckCircle,
  XCircle,
  Save,
  Loader2,
  Crown,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { adminManageAPI } from '@/lib/api';

const ALL_PERMISSIONS = [
  { key: 'revenue', label: 'Revenue Dashboard' },
  { key: 'services', label: 'Services' },
  { key: 'categories', label: 'Categories' },
  { key: 'pro_applications', label: 'Pro Applications' },
  { key: 'profile_updates', label: 'Profile Updates' },
  { key: 'invitations', label: 'Admin Users / Invitations' },
  { key: 'payouts', label: 'Pro Payouts' },
  { key: 'quotations', label: 'Quotations' },
  { key: 'quote_assignments', label: 'Quote Assignments' },
  { key: 'quote_requests', label: 'Quote Requests' },
  { key: 'proofs', label: 'Job Proofs' },
  { key: 'support_chat', label: 'Support Chat' },
  { key: 'disputes', label: 'Disputes' },
];

const defaultPermissions = () =>
  ALL_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: false }), {});

export default function ManageAdminsPage() {
  const router = useRouter();
  const { profile, authInitialized } = useSelector((state) => state.auth);

  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [permissions, setPermissions] = useState(defaultPermissions());
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(null);

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
    fetchAdmins();
  }, [authInitialized, profile, router]);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);
      const res = await adminManageAPI.listAdmins();
      setAdmins(res.data.data.admins);
    } catch {
      toast.error('Failed to load admin accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectAdmin = (admin) => {
    if (admin.is_superadmin) return;
    setSelectedAdmin(admin);
    const existing = admin.admin_permissions || defaultPermissions();
    setPermissions({ ...defaultPermissions(), ...existing });
  };

  const handleTogglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSelectAll = () => {
    setPermissions(ALL_PERMISSIONS.reduce((acc, p) => ({ ...acc, [p.key]: true }), {}));
  };

  const handleClearAll = () => {
    setPermissions(defaultPermissions());
  };

  const handleSavePermissions = async () => {
    if (!selectedAdmin) return;
    setSaving(true);
    try {
      await adminManageAPI.updatePermissions(selectedAdmin.id, permissions);
      toast.success('Permissions saved successfully.');
      setAdmins((prev) =>
        prev.map((a) =>
          a.id === selectedAdmin.id ? { ...a, admin_permissions: permissions } : a
        )
      );
      setSelectedAdmin((prev) => ({ ...prev, admin_permissions: permissions }));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save permissions.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (admin) => {
    setToggling(admin.id);
    try {
      const res = await adminManageAPI.toggleActive(admin.id);
      const updated = res.data.data.admin;
      toast.success(res.data.message);
      setAdmins((prev) => prev.map((a) => (a.id === updated.id ? { ...a, is_active: updated.is_active } : a)));
      if (selectedAdmin?.id === updated.id) {
        setSelectedAdmin((prev) => ({ ...prev, is_active: updated.is_active }));
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update admin status.');
    } finally {
      setToggling(null);
    }
  };

  if (!authInitialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
      </div>
    );
  }

  const regularAdmins = admins.filter((a) => !a.is_superadmin);
  const superAdmins = admins.filter((a) => a.is_superadmin);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[#0E7480] flex items-center justify-center">
              <Crown className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Admins</h1>
              <p className="text-sm text-gray-500">Control access permissions for all admin accounts</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Admin List — left panel */}
          <div className="lg:col-span-2 space-y-4">
            {/* SuperAdmins */}
            {superAdmins.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-amber-50 border-b border-amber-100">
                  <h2 className="text-sm font-semibold text-amber-800 flex items-center gap-2">
                    <Crown className="w-4 h-4" />
                    SuperAdmin
                  </h2>
                </div>
                {superAdmins.map((admin) => (
                  <div key={admin.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-amber-700 font-semibold text-sm">
                        {admin.full_name?.charAt(0) || 'S'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{admin.full_name || '—'}</p>
                      <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      <Crown className="w-3 h-3" />
                      SuperAdmin
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Regular Admins */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Admin Accounts ({regularAdmins.length})
                </h2>
              </div>
              {regularAdmins.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400 text-sm">
                  No regular admin accounts yet.
                </div>
              ) : (
                regularAdmins.map((admin) => (
                  <button
                    key={admin.id}
                    onClick={() => handleSelectAdmin(admin)}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0 ${
                      selectedAdmin?.id === admin.id
                        ? 'bg-[#0E7480]/5 border-l-4 border-l-[#0E7480]'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${admin.is_active ? 'bg-[#0E7480]/10' : 'bg-gray-100'}`}>
                      <span className={`font-semibold text-sm ${admin.is_active ? 'text-[#0E7480]' : 'text-gray-400'}`}>
                        {admin.full_name?.charAt(0) || 'A'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${admin.is_active ? 'text-gray-900' : 'text-gray-400'}`}>
                        {admin.full_name || '—'}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{admin.email}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      {admin.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckCircle className="w-3 h-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                          <XCircle className="w-3 h-3" />
                          Inactive
                        </span>
                      )}
                      {admin.admin_permissions ? (
                        <span className="text-xs text-[#0E7480]">
                          {Object.values(admin.admin_permissions).filter(Boolean).length} permissions
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">No access</span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Permission Editor — right panel */}
          <div className="lg:col-span-3">
            {selectedAdmin ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Admin info header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0E7480]/10 flex items-center justify-center">
                      <span className="text-[#0E7480] font-semibold">
                        {selectedAdmin.full_name?.charAt(0) || 'A'}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{selectedAdmin.full_name || '—'}</p>
                      <p className="text-sm text-gray-500">{selectedAdmin.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleActive(selectedAdmin)}
                    disabled={toggling === selectedAdmin.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      selectedAdmin.is_active
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {toggling === selectedAdmin.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : selectedAdmin.is_active ? (
                      <ToggleRight className="w-4 h-4" />
                    ) : (
                      <ToggleLeft className="w-4 h-4" />
                    )}
                    {selectedAdmin.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>

                {/* Permissions grid */}
                <div className="px-6 py-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#0E7480]" />
                      Page Access Permissions
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSelectAll}
                        className="text-xs px-3 py-1 rounded-lg bg-[#0E7480]/10 text-[#0E7480] hover:bg-[#0E7480]/20 font-medium transition-colors"
                      >
                        Select All
                      </button>
                      <button
                        onClick={handleClearAll}
                        className="text-xs px-3 py-1 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 font-medium transition-colors"
                      >
                        Clear All
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ALL_PERMISSIONS.map((perm) => (
                      <label
                        key={perm.key}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all select-none ${
                          permissions[perm.key]
                            ? 'border-[#0E7480] bg-[#0E7480]/5'
                            : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!!permissions[perm.key]}
                          onChange={() => handleTogglePermission(perm.key)}
                          className="w-4 h-4 rounded accent-[#0E7480]"
                        />
                        <span className={`text-sm font-medium ${permissions[perm.key] ? 'text-[#0E7480]' : 'text-gray-600'}`}>
                          {perm.label}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                  <button
                    onClick={handleSavePermissions}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#0E7480] text-white rounded-lg hover:bg-[#0a5a63] transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Permissions
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 h-64 flex flex-col items-center justify-center text-center px-6">
                <Shield className="w-12 h-12 text-gray-200 mb-3" />
                <p className="text-gray-500 font-medium">Select an admin account</p>
                <p className="text-sm text-gray-400 mt-1">Click an admin from the list to edit their permissions</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
