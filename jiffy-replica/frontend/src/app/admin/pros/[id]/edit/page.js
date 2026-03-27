'use client';

import { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useRouter, useParams } from 'next/navigation';
import { prosAPI, proProfileUpdatesAPI, servicesAPI } from '@/lib/api';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Loader2,
  Save,
  Shield,
  Building2,
  FileText,
  Settings,
  Users,
  CheckCircle,
  XCircle,
  Upload,
  ExternalLink,
  MapPin,
  DollarSign,
  Globe,
  Phone,
  Mail,
  User,
  Briefcase,
  AlertTriangle,
  ChevronDown,
} from 'lucide-react';

export default function AdminProEditPage() {
  const router = useRouter();
  const params = useParams();
  const proProfileId = params.id;

  const { user, profile, authInitialized } = useSelector((state) => state.auth);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pro, setPro] = useState(null);
  const [activeSection, setActiveSection] = useState('business');
  const [categories, setCategories] = useState([]);
  const [allServices, setAllServices] = useState([]);
  const [expandedCategory, setExpandedCategory] = useState(null);

  // Form state
  const [form, setForm] = useState({
    business_name: '',
    business_address: '',
    business_unit: '',
    gst_number: '',
    website: '',
    bio: '',
    hourly_rate: '',
    service_radius: '',
    is_available: true,
    is_verified: false,
    commission_rate: '',
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_expiry: '',
    insurance_document_url: '',
    service_categories: [],
    services_offered: [],
  });

  useEffect(() => {
    if (!authInitialized) return;
    if (!user) { router.push('/login'); return; }
    if (profile?.role !== 'admin') {
      toast.error('Admin access required');
      router.push('/dashboard');
      return;
    }
    fetchProDetails();
    servicesAPI.getCategories().then(r => setCategories(r.data?.data?.categories || [])).catch(() => {});
    servicesAPI.getAll({ limit: 200 }).then(r => setAllServices(r.data?.data?.services || [])).catch(() => {});
  }, [user, authInitialized, profile, router, proProfileId]);

  const fetchProDetails = async () => {
    setLoading(true);
    try {
      const res = await prosAPI.getById(proProfileId);
      const proData = res.data?.data?.pro;
      if (!proData) {
        toast.error('Pro not found');
        router.push('/admin/revenue');
        return;
      }
      setPro(proData);
      setForm({
        business_name: proData.business_name || '',
        business_address: proData.business_address || '',
        business_unit: proData.business_unit || '',
        gst_number: proData.gst_number || '',
        website: proData.website || '',
        bio: proData.bio || '',
        hourly_rate: proData.hourly_rate != null ? String(proData.hourly_rate) : '',
        service_radius: proData.service_radius != null ? String(proData.service_radius) : '25',
        is_available: proData.is_available ?? true,
        is_verified: proData.is_verified ?? false,
        commission_rate: proData.commission_rate != null ? String((proData.commission_rate * 100).toFixed(0)) : '',
        insurance_provider: proData.insurance_provider || '',
        insurance_policy_number: proData.insurance_policy_number || '',
        insurance_expiry: proData.insurance_expiry ? proData.insurance_expiry.split('T')[0] : '',
        insurance_document_url: proData.insurance_document_url || '',
        service_categories: proData.service_categories || [],
        services_offered: proData.services_offered || [],
      });
    } catch (err) {
      toast.error('Failed to load pro details');
    }
    setLoading(false);
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const toggleService = (serviceId) => {
    setForm(prev => ({
      ...prev,
      services_offered: prev.services_offered.includes(serviceId)
        ? prev.services_offered.filter(id => id !== serviceId)
        : [...prev.services_offered, serviceId],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {};

      // Business info
      if (form.business_name !== (pro.business_name || '')) updates.business_name = form.business_name;
      if (form.business_address !== (pro.business_address || '')) updates.business_address = form.business_address;
      if (form.business_unit !== (pro.business_unit || '')) updates.business_unit = form.business_unit;
      if (form.gst_number !== (pro.gst_number || '')) updates.gst_number = form.gst_number;
      if (form.website !== (pro.website || '')) updates.website = form.website;
      if (form.bio !== (pro.bio || '')) updates.bio = form.bio;

      // Service settings
      if (form.hourly_rate !== (pro.hourly_rate != null ? String(pro.hourly_rate) : '')) {
        updates.hourly_rate = form.hourly_rate ? parseFloat(form.hourly_rate) : null;
      }
      if (form.service_radius !== (pro.service_radius != null ? String(pro.service_radius) : '25')) {
        updates.service_radius = form.service_radius ? parseInt(form.service_radius) : 25;
      }
      if (form.is_available !== (pro.is_available ?? true)) updates.is_available = form.is_available;
      if (form.is_verified !== (pro.is_verified ?? false)) updates.is_verified = form.is_verified;

      // Commission
      const currentCommissionStr = pro.commission_rate != null ? String((pro.commission_rate * 100).toFixed(0)) : '';
      if (form.commission_rate !== currentCommissionStr) {
        updates.commission_rate = form.commission_rate ? parseFloat(form.commission_rate) / 100 : null;
      }

      // Insurance
      if (form.insurance_provider !== (pro.insurance_provider || '')) updates.insurance_provider = form.insurance_provider;
      if (form.insurance_policy_number !== (pro.insurance_policy_number || '')) updates.insurance_policy_number = form.insurance_policy_number;
      const currentExpiry = pro.insurance_expiry ? pro.insurance_expiry.split('T')[0] : '';
      if (form.insurance_expiry !== currentExpiry) updates.insurance_expiry = form.insurance_expiry || null;
      if (form.insurance_document_url !== (pro.insurance_document_url || '')) updates.insurance_document_url = form.insurance_document_url;

      // Services offered (also auto-derives service_categories for backward compatibility)
      const currentServices = JSON.stringify([...(pro.services_offered || [])].sort());
      const newServices = JSON.stringify([...form.services_offered].sort());
      if (newServices !== currentServices) {
        updates.services_offered = form.services_offered;
        const selectedServiceObjs = allServices.filter(s => form.services_offered.includes(s.id));
        const derivedCats = [...new Set(selectedServiceObjs.map(s => s.category_id).filter(Boolean))];
        updates.service_categories = derivedCats;
      }

      if (Object.keys(updates).length === 0) {
        toast.info('No changes to save');
        setSaving(false);
        return;
      }

      await proProfileUpdatesAPI.adminUpdatePro(proProfileId, updates);
      toast.success('Pro profile updated successfully');
      fetchProDetails(); // Refresh data
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save changes');
    }
    setSaving(false);
  };

  const sections = [
    { key: 'business', label: 'Business Info', icon: Building2 },
    { key: 'insurance', label: 'Insurance', icon: FileText },
    { key: 'settings', label: 'Service Settings', icon: Settings },
    { key: 'references', label: 'References', icon: Users },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0E7480] mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading pro profile...</p>
        </div>
      </div>
    );
  }

  if (!pro) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/admin/revenue')}
              className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                Edit Pro Profile
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                {pro.business_name || 'Unnamed'} · {pro.profiles?.full_name || pro.profiles?.email || 'Unknown'}
              </p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-3 pl-12 sm:pl-0">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-red-500" />
              <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Admin Edit</span>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-[#0E7480] text-white rounded-lg text-sm font-semibold hover:bg-[#0a5a64] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </button>
          </div>
        </div>

        {/* Pro Summary Card */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#0E7480] to-[#1a8a96] flex items-center justify-center text-white text-xl font-bold flex-shrink-0">
              {(pro.business_name || pro.profiles?.full_name || '?')[0]?.toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h2 className="text-lg font-bold text-gray-900">{pro.business_name || 'Unnamed Business'}</h2>
                {pro.is_verified && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-50 text-green-600">
                    <CheckCircle className="w-3 h-3" /> Verified
                  </span>
                )}
                {pro.is_available ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-blue-50 text-blue-600">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
                    Offline
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                {pro.profiles?.full_name && (
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {pro.profiles.full_name}</span>
                )}
                {pro.profiles?.email && (
                  <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {pro.profiles.email}</span>
                )}
                {pro.profiles?.phone && (
                  <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {pro.profiles.phone}</span>
                )}
                {(pro.profiles?.city || pro.profiles?.state) && (
                  <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {pro.profiles.city}{pro.profiles.state ? `, ${pro.profiles.state}` : ''}</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
                <span>Rating: {pro.rating || '0.00'} ({pro.total_reviews || 0} reviews)</span>
                <span>Jobs: {pro.completed_jobs || 0} completed</span>
                <span>Commission: {pro.commission_rate != null ? `${(pro.commission_rate * 100).toFixed(0)}% (Custom)` : '15% (Default)'}</span>
                {pro.stripe_account_id && <span>Stripe: Connected</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-6 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            <strong>Admin Direct Edit</strong> — Changes are applied immediately without pro approval. Use with caution.
          </p>
        </div>

        {/* Section Tabs */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-6 overflow-x-auto">
          {sections.map(s => (
            <button
              key={s.key}
              onClick={() => setActiveSection(s.key)}
              className={`flex-shrink-0 sm:flex-1 flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                activeSection === s.key
                  ? 'bg-[#0E7480] text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <s.icon className="w-4 h-4" />
              {s.label}
            </button>
          ))}
        </div>

        {/* Section Content */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">

          {/* ==================== BUSINESS INFO ==================== */}
          {activeSection === 'business' && (
            <div className="p-4 sm:p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Business Information</h3>
                <p className="text-xs text-gray-500">Core business details for this pro.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Business Name</label>
                  <input
                    type="text"
                    value={form.business_name}
                    onChange={(e) => handleChange('business_name', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                    placeholder="e.g. Smith Plumbing"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">GST/HST Number</label>
                  <input
                    type="text"
                    value={form.gst_number}
                    onChange={(e) => handleChange('gst_number', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                    placeholder="e.g. 123456789RT0001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Business Address</label>
                  <input
                    type="text"
                    value={form.business_address}
                    onChange={(e) => handleChange('business_address', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                    placeholder="e.g. 123 Main Street, Toronto, ON"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit / Suite</label>
                  <input
                    type="text"
                    value={form.business_unit}
                    onChange={(e) => handleChange('business_unit', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                    placeholder="e.g. Unit 4B"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Website</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={form.website}
                    onChange={(e) => handleChange('website', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                    placeholder="https://example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Bio / About</label>
                <textarea
                  value={form.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows={4}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none resize-none"
                  placeholder="Describe the pro's experience and specialties..."
                />
                <p className="text-xs text-gray-400 mt-1">{form.bio.length} characters</p>
              </div>

            </div>
          )}

          {/* ==================== INSURANCE ==================== */}
          {activeSection === 'insurance' && (
            <div className="p-4 sm:p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Insurance Details</h3>
                <p className="text-xs text-gray-500">Manage the pro's insurance information and documentation.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Insurance Provider</label>
                  <input
                    type="text"
                    value={form.insurance_provider}
                    onChange={(e) => handleChange('insurance_provider', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                    placeholder="e.g. Aviva Canada"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Policy Number</label>
                  <input
                    type="text"
                    value={form.insurance_policy_number}
                    onChange={(e) => handleChange('insurance_policy_number', e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                    placeholder="e.g. POL-12345678"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Insurance Expiry Date</label>
                <input
                  type="date"
                  value={form.insurance_expiry}
                  onChange={(e) => handleChange('insurance_expiry', e.target.value)}
                  className="w-full sm:w-auto border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                />
                {form.insurance_expiry && new Date(form.insurance_expiry) < new Date() && (
                  <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Insurance is expired
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Insurance Document URL</label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={form.insurance_document_url}
                    onChange={(e) => handleChange('insurance_document_url', e.target.value)}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                    placeholder="https://storage.example.com/insurance-doc.pdf"
                  />
                  {form.insurance_document_url && (
                    <a
                      href={form.insurance_document_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 flex items-center gap-1"
                    >
                      <ExternalLink className="w-4 h-4" />
                      View
                    </a>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==================== SERVICE SETTINGS ==================== */}
          {activeSection === 'settings' && (
            <div className="p-4 sm:p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">Service Settings</h3>
                <p className="text-xs text-gray-500">Manage categories & services offered, rates, availability, and commission.</p>
              </div>

              {/* ── Categories & Services Offered ── */}
              <div>
                <div className="mb-3">
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-0.5">Categories &amp; Services Offered</p>
                  <p className="text-xs text-gray-400">Expand a category to select specific services this pro can perform.</p>
                </div>
                {categories.length === 0 || allServices.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading services...
                  </div>
                ) : (
                  <div className="space-y-2">
                    {categories.map(cat => {
                      const catServices = allServices.filter(s => s.category_id === cat.id);
                      if (catServices.length === 0) return null;
                      const selectedCount = catServices.filter(s => form.services_offered.includes(s.id)).length;
                      const isExpanded = expandedCategory === cat.id;
                      return (
                        <div key={cat.id} className="border border-gray-200 rounded-lg overflow-hidden">
                          <button
                            type="button"
                            onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                            className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-800">{cat.name}</span>
                              {selectedCount > 0 && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#0E7480] text-white">
                                  {selectedCount} selected
                                </span>
                              )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          {isExpanded && (
                            <div className="px-4 py-3 grid grid-cols-1 sm:grid-cols-2 gap-2 bg-white">
                              {catServices.map(service => (
                                <label key={service.id} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
                                  <input
                                    type="checkbox"
                                    checked={form.services_offered.includes(service.id)}
                                    onChange={() => toggleService(service.id)}
                                    className="w-4 h-4 rounded border-gray-300 focus:ring-[#0E7480] cursor-pointer accent-[#0E7480]"
                                  />
                                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{service.name}</span>
                                </label>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                {form.services_offered.length === 0 && allServices.length > 0 && (
                  <p className="text-xs text-amber-600 mt-2">No services selected — expand a category and select at least one.</p>
                )}
              </div>

              <div className="border-t border-gray-100" />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Hourly Rate (CAD)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.hourly_rate}
                      onChange={(e) => handleChange('hourly_rate', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                      placeholder="e.g. 75.00"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Service Radius (km)</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      min="1"
                      max="200"
                      value={form.service_radius}
                      onChange={(e) => handleChange('service_radius', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                      placeholder="25"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Commission Rate (%)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    value={form.commission_rate}
                    onChange={(e) => handleChange('commission_rate', e.target.value)}
                    className="w-32 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                    placeholder="15"
                  />
                  <span className="text-sm text-gray-500">Leave empty for platform default (15%)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Available for Jobs</p>
                    <p className="text-xs text-gray-500">Whether this pro appears in search results</p>
                  </div>
                  <button
                    onClick={() => handleChange('is_available', !form.is_available)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${form.is_available ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.is_available ? 'left-[26px]' : 'left-0.5'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Verified Pro</p>
                    <p className="text-xs text-gray-500">Show verified badge on profile</p>
                  </div>
                  <button
                    onClick={() => handleChange('is_verified', !form.is_verified)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${form.is_verified ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${form.is_verified ? 'left-[26px]' : 'left-0.5'}`} />
                  </button>
                </div>
              </div>

              {/* Read-only info */}
              <div className="mt-6 pt-5 border-t border-gray-100">
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Read-Only Information</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Stripe Account</p>
                    <p className="text-sm font-medium text-gray-700 truncate">{pro.stripe_account_id || 'Not connected'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Payout Method</p>
                    <p className="text-sm font-medium text-gray-700">{pro.payout_method === 'stripe_connect' ? 'Stripe Connect' : 'Interac e-Transfer'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Admin Approved</p>
                    <p className="text-sm font-medium text-gray-700">{pro.admin_approved ? 'Yes' : 'No'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-400">Onboarding</p>
                    <p className="text-sm font-medium text-gray-700">{pro.onboarding_completed ? 'Complete' : `Step ${pro.onboarding_step || 0}`}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== REFERENCES ==================== */}
          {activeSection === 'references' && (
            <div className="p-4 sm:p-6 space-y-5">
              <div>
                <h3 className="text-base font-bold text-gray-900 mb-1">References</h3>
                <p className="text-xs text-gray-500">Professional references provided during onboarding (read-only).</p>
              </div>

              {[1, 2].map((num) => {
                const name = pro[`reference_${num}_name`];
                const phone = pro[`reference_${num}_phone`];
                const email = pro[`reference_${num}_email`];
                const relationship = pro[`reference_${num}_relationship`];

                return (
                  <div key={num} className="bg-gray-50 rounded-lg border border-gray-100 p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Reference {num}</h4>
                    {name || phone || email ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-400">Name</p>
                          <p className="text-sm text-gray-700">{name || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Relationship</p>
                          <p className="text-sm text-gray-700">{relationship || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Phone</p>
                          <p className="text-sm text-gray-700">{phone || '—'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-400">Email</p>
                          <p className="text-sm text-gray-700">{email || '—'}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No reference provided</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Bottom Save Bar */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={() => router.push('/admin/revenue')}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            ← Back to Revenue
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-[#0E7480] text-white rounded-lg text-sm font-semibold hover:bg-[#0a5a64] transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save All Changes
          </button>
        </div>
      </div>
    </div>
  );
}
