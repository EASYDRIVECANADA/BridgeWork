'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import {
  CheckCircle, XCircle, Clock, User, Building2, Shield, Mail, Phone,
  MapPin, FileText, Star, Loader2, ChevronDown, ChevronUp, AlertTriangle,
  DollarSign, Calendar, ExternalLink, Plus, X, Eye, EyeOff
} from 'lucide-react';
import { onboardingAPI, servicesAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function AdminProApplicationsPage() {
  const router = useRouter();
  const { user, profile } = useSelector((state) => state.auth);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [expandedApp, setExpandedApp] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [commissionRate, setCommissionRate] = useState('0.15');
  const [customCommission, setCustomCommission] = useState('');
  const [useCustomRate, setUseCustomRate] = useState(false);

  // Add Pro modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [categories, setCategories] = useState([]);
  const [addForm, setAddForm] = useState({
    email: '', password: '', full_name: '', phone: '',
    address: '', city: '', state: '', zip_code: '',
    business_name: '', business_address: '', business_unit: '',
    gst_number: '', website: '',
    service_categories: [],
    insurance_policy_number: '', insurance_provider: '', insurance_expiry: '',
    reference_1_name: '', reference_1_phone: '', reference_1_email: '', reference_1_relationship: '',
    reference_2_name: '', reference_2_phone: '', reference_2_email: '', reference_2_relationship: '',
    commission_rate: '0.15', bio: '', hourly_rate: '', service_radius: '25',
  });

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      router.push('/login');
      return;
    }
    loadApplications();
    loadCategories();
  }, [user, profile, router, filter]);

  const loadCategories = async () => {
    try {
      const res = await servicesAPI.getCategories();
      setCategories(res.data?.data?.categories || []);
    } catch {}
  };

  const loadApplications = async () => {
    setLoading(true);
    try {
      const res = await onboardingAPI.getApplications({ status: filter });
      setApplications(res.data?.data?.applications || []);
    } catch (err) {
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const resetAddForm = () => {
    setAddForm({
      email: '', password: '', full_name: '', phone: '',
      address: '', city: '', state: '', zip_code: '',
      business_name: '', business_address: '', business_unit: '',
      gst_number: '', website: '',
      service_categories: [],
      insurance_policy_number: '', insurance_provider: '', insurance_expiry: '',
      reference_1_name: '', reference_1_phone: '', reference_1_email: '', reference_1_relationship: '',
      reference_2_name: '', reference_2_phone: '', reference_2_email: '', reference_2_relationship: '',
      commission_rate: '0.15', bio: '', hourly_rate: '', service_radius: '25',
    });
    setShowPassword(false);
  };

  const handleAddPro = async () => {
    if (!addForm.email || !addForm.password || !addForm.full_name) {
      toast.error('Email, password, and full name are required');
      return;
    }
    if (addForm.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setAddLoading(true);
    try {
      const payload = {
        ...addForm,
        commission_rate: parseFloat(addForm.commission_rate),
        hourly_rate: addForm.hourly_rate ? parseFloat(addForm.hourly_rate) : undefined,
        service_radius: addForm.service_radius ? parseInt(addForm.service_radius) : 25,
      };
      // Remove empty strings
      Object.keys(payload).forEach(k => {
        if (payload[k] === '') payload[k] = undefined;
      });
      const res = await onboardingAPI.adminCreatePro(payload);
      toast.success(res.data?.message || 'Pro account created!');
      setShowAddModal(false);
      resetAddForm();
      loadApplications();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create pro account');
    } finally {
      setAddLoading(false);
    }
  };

  const toggleServiceCategory = (catId) => {
    setAddForm(prev => ({
      ...prev,
      service_categories: prev.service_categories.includes(catId)
        ? prev.service_categories.filter(id => id !== catId)
        : [...prev.service_categories, catId]
    }));
  };

  const handleApprove = async (proProfileId) => {
    setActionLoading(proProfileId);
    try {
      await onboardingAPI.approveApplication(proProfileId, {
        commission_rate: parseFloat(commissionRate)
      });
      toast.success('Pro application approved!');
      loadApplications();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal || rejectReason.trim().length < 5) {
      toast.error('Please provide a reason (min 5 characters)');
      return;
    }
    setActionLoading(rejectModal);
    try {
      await onboardingAPI.rejectApplication(rejectModal, { reason: rejectReason.trim() });
      toast.success('Application rejected');
      setRejectModal(null);
      setRejectReason('');
      loadApplications();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reject');
    } finally {
      setActionLoading(null);
    }
  };

  if (!user || profile?.role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Pro Applications</h1>
            <p className="text-gray-500 text-sm">Review and manage pro onboarding applications</p>
          </div>
          <button
            onClick={() => { resetAddForm(); setShowAddModal(true); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#0E7480] text-white rounded-lg font-semibold text-sm hover:bg-[#0c6670] transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Pro
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'pending', label: 'Pending', icon: Clock, color: 'text-yellow-600 bg-yellow-50 border-yellow-200' },
            { key: 'approved', label: 'Approved', icon: CheckCircle, color: 'text-green-600 bg-green-50 border-green-200' },
            { key: 'rejected', label: 'Rejected', icon: XCircle, color: 'text-red-600 bg-red-50 border-red-200' },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                filter === tab.key ? tab.color : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Applications List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Loading applications...</span>
          </div>
        ) : applications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-400">No {filter} applications found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {applications.map((app) => {
              const isExpanded = expandedApp === app.id;
              return (
                <div key={app.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Summary Row */}
                  <div
                    className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                  >
                    <div className="w-10 h-10 bg-[#0E7480]/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <User className="w-5 h-5 text-[#0E7480]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900">{app.profiles?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-500">{app.business_name || 'No business name'} • {app.profiles?.email}</p>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {app.service_categories?.length > 0 && (
                        <span className="text-xs text-gray-400">{app.service_categories.length} services</span>
                      )}
                      <span className="text-xs text-gray-400">
                        {app.updated_at ? new Date(app.updated_at).toLocaleDateString() : ''}
                      </span>
                      {filter === 'pending' && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-700">Pending</span>
                      )}
                      {filter === 'approved' && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-700">Approved</span>
                      )}
                      {filter === 'rejected' && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-700">Rejected</span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="border-t border-gray-100 p-6 bg-gray-50/50">
                      <div className="grid md:grid-cols-2 gap-6">
                        {/* Business Info */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Building2 className="w-4 h-4" /> Business Info
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Business Name:</span> <span className="font-medium">{app.business_name || '—'}</span></p>
                            <p><span className="text-gray-500">Address:</span> <span className="font-medium">{app.business_address || '—'} {app.business_unit ? `Unit ${app.business_unit}` : ''}</span></p>
                            <p><span className="text-gray-500">GST Number:</span> <span className="font-medium">{app.gst_number || '—'}</span></p>
                            <p><span className="text-gray-500">Website:</span> <span className="font-medium">{app.website || '—'}</span></p>
                            <p><span className="text-gray-500">How heard:</span> <span className="font-medium">{app.how_heard || '—'}</span></p>
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <User className="w-4 h-4" /> Contact Info
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-gray-400" /> {app.profiles?.email || '—'}</p>
                            <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-gray-400" /> {app.profiles?.phone || '—'}</p>
                            <p className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5 text-gray-400" /> Joined: {app.profiles?.created_at ? new Date(app.profiles.created_at).toLocaleDateString() : '—'}</p>
                          </div>
                        </div>

                        {/* Insurance */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <Shield className="w-4 h-4" /> Insurance
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-gray-500">Provider:</span> <span className="font-medium">{app.insurance_provider || '—'}</span></p>
                            <p><span className="text-gray-500">Policy #:</span> <span className="font-medium">{app.insurance_policy_number || '—'}</span></p>
                            <p><span className="text-gray-500">Expiry:</span> <span className="font-medium">{app.insurance_expiry || '—'}</span></p>
                          </div>
                        </div>

                        {/* References */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Professional References
                          </h3>
                          <div className="space-y-3 text-sm">
                            <div className="bg-white rounded-lg p-3 border border-gray-200">
                              <p className="font-medium">{app.reference_1_name || '—'}</p>
                              <p className="text-gray-500 text-xs">{app.reference_1_phone || ''} {app.reference_1_email ? `• ${app.reference_1_email}` : ''}</p>
                              {app.reference_1_relationship && <p className="text-xs text-gray-400">{app.reference_1_relationship}</p>}
                            </div>
                            {app.reference_2_name && (
                              <div className="bg-white rounded-lg p-3 border border-gray-200">
                                <p className="font-medium">{app.reference_2_name}</p>
                                <p className="text-gray-500 text-xs">{app.reference_2_phone || ''} {app.reference_2_email ? `• ${app.reference_2_email}` : ''}</p>
                                {app.reference_2_relationship && <p className="text-xs text-gray-400">{app.reference_2_relationship}</p>}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Agreement & Stripe */}
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <FileText className="w-4 h-4" /> Agreement & Payment
                          </h3>
                          <div className="space-y-2 text-sm">
                            <p className="flex items-center gap-2">
                              {app.service_agreement_accepted ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
                              Service Agreement: {app.service_agreement_accepted ? `Accepted (v${app.service_agreement_version || '1.0'})` : 'Not accepted'}
                            </p>
                            {app.service_agreement_accepted_at && (
                              <p className="text-xs text-gray-400 ml-6">
                                Accepted: {new Date(app.service_agreement_accepted_at).toLocaleString()}
                                {app.service_agreement_ip ? ` from IP ${app.service_agreement_ip}` : ''}
                              </p>
                            )}
                            <p className="flex items-center gap-2">
                              {app.stripe_account_id ? <CheckCircle className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-400" />}
                              Stripe: {app.stripe_account_id || 'Not connected'}
                            </p>
                            <p className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              Current Commission: {app.commission_rate !== null && app.commission_rate !== undefined ? `${Math.round(app.commission_rate * 100)}%` : 'Platform default (15%)'}
                            </p>
                          </div>
                        </div>

                        {/* Rejection reason (if rejected) */}
                        {app.admin_rejection_reason && (
                          <div className="md:col-span-2">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                              <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason:</p>
                              <p className="text-sm text-red-600">{app.admin_rejection_reason}</p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons (only for pending) */}
                      {filter === 'pending' && (
                        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center gap-4">
                          <div className="flex items-center gap-2 flex-1">
                            <label className="text-sm font-medium text-gray-600">Commission Rate:</label>
                            <select
                              value={useCustomRate ? 'custom' : commissionRate}
                              onChange={(e) => {
                                if (e.target.value === 'custom') {
                                  setUseCustomRate(true);
                                  setCustomCommission('');
                                } else {
                                  setUseCustomRate(false);
                                  setCommissionRate(e.target.value);
                                }
                              }}
                              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] outline-none"
                            >
                              <option value="0.10">10%</option>
                              <option value="0.12">12%</option>
                              <option value="0.15">15% (default)</option>
                              <option value="0.18">18%</option>
                              <option value="0.20">20%</option>
                              <option value="custom">Custom...</option>
                            </select>
                            {useCustomRate && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  max="50"
                                  step="0.5"
                                  value={customCommission}
                                  onChange={(e) => {
                                    setCustomCommission(e.target.value);
                                    const val = parseFloat(e.target.value);
                                    if (val > 0 && val <= 50) {
                                      setCommissionRate((val / 100).toFixed(4));
                                    }
                                  }}
                                  placeholder="e.g. 17"
                                  className="w-20 px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] outline-none"
                                />
                                <span className="text-sm text-gray-500">%</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => handleApprove(app.id)}
                            disabled={actionLoading === app.id}
                            className="px-6 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            {actionLoading === app.id ? 'Approving...' : 'Approve'}
                          </button>
                          <button
                            onClick={() => { setRejectModal(app.id); setRejectReason(''); }}
                            disabled={actionLoading === app.id}
                            className="px-6 py-2 bg-red-50 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-100 border border-red-200 flex items-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject
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

        {/* Add Pro Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-[#0E7480]" />
                  Add New Pro
                </h3>
                <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body */}
              <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1">
                {/* Account Info */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><Mail className="w-4 h-4" /> Account Info <span className="text-red-500">*</span></h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-gray-500 mb-1 block">Full Name *</label>
                      <input type="text" value={addForm.full_name} onChange={e => setAddForm(p => ({ ...p, full_name: e.target.value }))} placeholder="John Smith" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-gray-500 mb-1 block">Email *</label>
                      <input type="email" value={addForm.email} onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))} placeholder="pro@email.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-gray-500 mb-1 block">Password *</label>
                      <div className="relative">
                        <input type={showPassword ? 'text' : 'password'} value={addForm.password} onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 6 characters" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none pr-10" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div className="col-span-2 sm:col-span-1">
                      <label className="text-xs text-gray-500 mb-1 block">Phone</label>
                      <input type="text" value={addForm.phone} onChange={e => setAddForm(p => ({ ...p, phone: e.target.value }))} placeholder="(416) 555-0100" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-xs text-gray-500 mb-1 block">Address</label>
                      <input type="text" value={addForm.address} onChange={e => setAddForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">City</label>
                      <input type="text" value={addForm.city} onChange={e => setAddForm(p => ({ ...p, city: e.target.value }))} placeholder="Toronto" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Province / State</label>
                      <input type="text" value={addForm.state} onChange={e => setAddForm(p => ({ ...p, state: e.target.value }))} placeholder="Ontario" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                  </div>
                </div>

                {/* Business Info */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><Building2 className="w-4 h-4" /> Business Info</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Business Name</label>
                      <input type="text" value={addForm.business_name} onChange={e => setAddForm(p => ({ ...p, business_name: e.target.value }))} placeholder="Smith Plumbing" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Business Address</label>
                      <input type="text" value={addForm.business_address} onChange={e => setAddForm(p => ({ ...p, business_address: e.target.value }))} placeholder="456 Business Ave" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">GST/HST Number</label>
                      <input type="text" value={addForm.gst_number} onChange={e => setAddForm(p => ({ ...p, gst_number: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Website</label>
                      <input type="text" value={addForm.website} onChange={e => setAddForm(p => ({ ...p, website: e.target.value }))} placeholder="https://..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                  </div>
                </div>

                {/* Service Categories */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><FileText className="w-4 h-4" /> Service Categories</h4>
                  <div className="flex flex-wrap gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat.id}
                        onClick={() => toggleServiceCategory(cat.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                          addForm.service_categories.includes(cat.id)
                            ? 'bg-[#0E7480] text-white border-[#0E7480]'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-[#0E7480]'
                        }`}
                      >
                        {cat.name}
                      </button>
                    ))}
                    {categories.length === 0 && <p className="text-xs text-gray-400">No categories loaded</p>}
                  </div>
                </div>

                {/* Insurance */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><Shield className="w-4 h-4" /> Insurance</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Provider</label>
                      <input type="text" value={addForm.insurance_provider} onChange={e => setAddForm(p => ({ ...p, insurance_provider: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Policy #</label>
                      <input type="text" value={addForm.insurance_policy_number} onChange={e => setAddForm(p => ({ ...p, insurance_policy_number: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Expiry</label>
                      <input type="date" value={addForm.insurance_expiry} onChange={e => setAddForm(p => ({ ...p, insurance_expiry: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                  </div>
                </div>

                {/* References */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><User className="w-4 h-4" /> Professional References</h4>
                  <div className="space-y-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Reference 1</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={addForm.reference_1_name} onChange={e => setAddForm(p => ({ ...p, reference_1_name: e.target.value }))} placeholder="Name" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                        <input type="text" value={addForm.reference_1_phone} onChange={e => setAddForm(p => ({ ...p, reference_1_phone: e.target.value }))} placeholder="Phone" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                        <input type="email" value={addForm.reference_1_email} onChange={e => setAddForm(p => ({ ...p, reference_1_email: e.target.value }))} placeholder="Email" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                        <input type="text" value={addForm.reference_1_relationship} onChange={e => setAddForm(p => ({ ...p, reference_1_relationship: e.target.value }))} placeholder="Relationship" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                      </div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Reference 2</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={addForm.reference_2_name} onChange={e => setAddForm(p => ({ ...p, reference_2_name: e.target.value }))} placeholder="Name" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                        <input type="text" value={addForm.reference_2_phone} onChange={e => setAddForm(p => ({ ...p, reference_2_phone: e.target.value }))} placeholder="Phone" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                        <input type="email" value={addForm.reference_2_email} onChange={e => setAddForm(p => ({ ...p, reference_2_email: e.target.value }))} placeholder="Email" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                        <input type="text" value={addForm.reference_2_relationship} onChange={e => setAddForm(p => ({ ...p, reference_2_relationship: e.target.value }))} placeholder="Relationship" className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Settings */}
                <div>
                  <h4 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2"><DollarSign className="w-4 h-4" /> Pro Settings</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Commission Rate</label>
                      <select value={addForm.commission_rate} onChange={e => setAddForm(p => ({ ...p, commission_rate: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none">
                        <option value="0.10">10%</option>
                        <option value="0.12">12%</option>
                        <option value="0.15">15% (default)</option>
                        <option value="0.18">18%</option>
                        <option value="0.20">20%</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Hourly Rate ($)</label>
                      <input type="number" value={addForm.hourly_rate} onChange={e => setAddForm(p => ({ ...p, hourly_rate: e.target.value }))} placeholder="50" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 mb-1 block">Service Radius (mi)</label>
                      <input type="number" value={addForm.service_radius} onChange={e => setAddForm(p => ({ ...p, service_radius: e.target.value }))} placeholder="25" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-xs text-gray-500 mb-1 block">Bio</label>
                    <textarea value={addForm.bio} onChange={e => setAddForm(p => ({ ...p, bio: e.target.value }))} placeholder="Brief description of the pro's experience..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] outline-none resize-none h-20" />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 flex-shrink-0 bg-gray-50 rounded-b-xl">
                <p className="text-xs text-gray-400">Account will be auto-confirmed & admin-approved</p>
                <div className="flex gap-3">
                  <button onClick={() => setShowAddModal(false)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                    Cancel
                  </button>
                  <button
                    onClick={handleAddPro}
                    disabled={addLoading || !addForm.email || !addForm.password || !addForm.full_name}
                    className="px-6 py-2 text-sm font-semibold bg-[#0E7480] text-white rounded-lg hover:bg-[#0c6670] disabled:opacity-50 flex items-center gap-2"
                  >
                    {addLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : <><Plus className="w-4 h-4" /> Create Pro Account</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {rejectModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setRejectModal(null)}>
            <div className="bg-white rounded-xl max-w-md w-full p-6" onClick={e => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-500" />
                Reject Application
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                The pro will be notified and can update their information to reapply.
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (required, min 5 characters)..."
                className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none h-28 focus:ring-2 focus:ring-red-300 focus:border-red-400 outline-none"
              />
              <div className="flex justify-end gap-3 mt-4">
                <button onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800">
                  Cancel
                </button>
                <button
                  onClick={handleReject}
                  disabled={actionLoading || rejectReason.trim().length < 5}
                  className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Application'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
