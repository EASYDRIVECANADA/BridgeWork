'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import { Plus, Edit, Trash2, Upload, Image as ImageIcon, Search, Home, Building2 } from 'lucide-react';
import api from '@/lib/api';

export default function AdminServicesPage() {
  const router = useRouter();
  const { profile } = useSelector((state) => state.auth);
  useAdminPermission('services');
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeChannel, setActiveChannel] = useState('residential');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [useCaseInput, setUseCaseInput] = useState('');
  const [formData, setFormData] = useState({
    category_id: '',
    name: '',
    slug: '',
    description: '',
    short_description: '',
    base_price: '',
    pricing_type: 'custom',
    estimated_duration: '',
    image_url: '',
    tags: [],
    sales_channel: 'residential',
    rate: 'quote',
    emergency: 'no',
    emergency_base_price: '',
    emergency_pricing_type: 'hourly',
    additional_hourly_rate: '',
    use_cases: []
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile?.role !== 'admin') {
      router.push('/');
      return;
    }
    fetchData();
  }, [profile, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [servicesRes, categoriesRes] = await Promise.all([
        api.get('/admin/manage/services'),
        api.get('/admin/manage/categories?sales_channel=residential')
      ]);

      if (servicesRes.data.success) {
        setServices(servicesRes.data.data.services);
      }
      if (categoriesRes.data.success) {
        setCategories(categoriesRes.data.data.categories);
      }
    } catch (err) {
      // Failed to fetch data
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async (serviceId) => {
    if (!imageFile) return null;

    const fd = new FormData();
    fd.append('image', imageFile);
    fd.append('entity_type', 'service');
    fd.append('entity_id', serviceId);

    try {
      const response = await api.post('/admin/manage/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.data.image_url;
    } catch (err) {
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const payload = { ...formData };
      // Commercial services have no category
      if (payload.sales_channel === 'commercial') {
        payload.category_id = null;
      }
      // Auto-prefix slug with channel
      if (!editingService) {
        const prefix = payload.sales_channel === 'commercial' ? 'com-' : 'res-';
        if (!payload.slug.startsWith(prefix)) {
          payload.slug = prefix + payload.slug;
        }
      }

      let response;
      if (editingService) {
        response = await api.put(`/admin/manage/services/${editingService.id}`, payload);
      } else {
        response = await api.post('/admin/manage/services', payload);
      }

      if (response.data.success) {
        const serviceId = editingService?.id || response.data.data.service.id;
        if (imageFile) {
          await uploadImage(serviceId);
        }
        setShowModal(false);
        resetForm();
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save service');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (service) => {
    setEditingService(service);
    setFormData({
      category_id: service.category_id || '',
      name: service.name,
      slug: service.slug,
      description: service.description || '',
      short_description: service.short_description || '',
      base_price: service.base_price?.toString() || '',
      pricing_type: service.pricing_type || 'custom',
      estimated_duration: service.estimated_duration?.toString() || '',
      image_url: service.image_url || '',
      tags: service.tags || [],
      sales_channel: service.sales_channel || 'residential',
      rate: service.rate || 'quote',
      emergency: service.emergency || 'no',
      emergency_base_price: service.emergency_base_price?.toString() || '',
      emergency_pricing_type: service.emergency_pricing_type || 'hourly',
      additional_hourly_rate: service.additional_hourly_rate?.toString() || '',
      use_cases: service.use_cases || []
    });
    setUseCaseInput('');
    setImagePreview(service.image_url || '');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
      await api.delete(`/admin/manage/services/${id}`);
      fetchData();
    } catch (err) {
      alert('Failed to delete service');
    }
  };

  const resetForm = () => {
    setEditingService(null);
    setFormData({
      category_id: '',
      name: '',
      slug: '',
      description: '',
      short_description: '',
      base_price: '',
      pricing_type: 'custom',
      estimated_duration: '',
      image_url: '',
      tags: [],
      sales_channel: activeChannel,
      rate: activeChannel === 'commercial' ? 'quote' : 'quote',
      emergency: 'no',
      emergency_base_price: '',
      emergency_pricing_type: 'hourly',
      additional_hourly_rate: '',
      use_cases: []
    });
    setImageFile(null);
    setImagePreview('');
    setUseCaseInput('');
    setError('');
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  // Filter services by active channel, category, and search
  const channelServices = services.filter(s => s.sales_channel === activeChannel && s.is_active);
  const filteredServices = channelServices.filter(service => {
    const matchesCategory = !selectedCategory || service.category_id === selectedCategory;
    const matchesSearch = !searchQuery ||
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const residentialCount = services.filter(s => s.sales_channel === 'residential' && s.is_active).length;
  const commercialCount = services.filter(s => s.sales_channel === 'commercial' && s.is_active).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E7480] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading services...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Manage Services</h1>
              <p className="mt-1 sm:mt-2 text-sm sm:text-base text-gray-600">Add, edit, or remove services for Residential and Commercial channels</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 bg-[#0E7480] text-white rounded-lg hover:bg-[#0a5a63] transition-colors font-medium text-sm sm:text-base"
            >
              <Plus className="w-4 sm:w-5 h-4 sm:h-5" />
              Add Service
            </button>
          </div>
        </div>

        {/* Channel Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => { setActiveChannel('residential'); setSelectedCategory(''); }}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              activeChannel === 'residential'
                ? 'bg-[#0E7480] text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Home className="w-4 h-4" />
            Residential
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
              activeChannel === 'residential' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}>{residentialCount}</span>
          </button>
          <button
            onClick={() => { setActiveChannel('commercial'); setSelectedCategory(''); }}
            className={`inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-semibold transition-all text-sm sm:text-base ${
              activeChannel === 'commercial'
                ? 'bg-[#0E7480] text-white shadow-lg'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Commercial
            <span className={`ml-1 px-2 py-0.5 text-xs rounded-full ${
              activeChannel === 'commercial' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}>{commercialCount}</span>
          </button>
        </div>

        {/* Channel Info Banner */}
        {activeChannel === 'commercial' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>Commercial Services</strong> — No categories. All commercial services appear as a flat list. All are quote-based.
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className={`grid grid-cols-1 ${activeChannel === 'residential' ? 'md:grid-cols-2' : ''} gap-4`}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search Services</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or description..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                />
              </div>
            </div>
            {activeChannel === 'residential' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                >
                  <option value="">All Categories</option>
                  {categories.filter(c => c.is_active).map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredServices.map((service) => (
            <div key={service.id} className="bg-white rounded-lg shadow overflow-hidden hover:shadow-lg transition-shadow">
              {service.image_url ? (
                <img src={service.image_url} alt={service.name} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                  <ImageIcon className="w-12 h-12 text-gray-400" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-lg font-bold text-gray-900">{service.name}</h3>
                  <div className="flex items-center gap-1">
                    {service.rate === 'yes' && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">Rate</span>
                    )}
                    {service.emergency === 'yes' && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700">Emergency</span>
                    )}
                  </div>
                </div>
                {activeChannel === 'residential' && (
                  <p className="text-sm text-gray-600 mb-2">
                    {service.service_categories?.name || 'No Category'}
                  </p>
                )}
                <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                  {service.short_description || service.description || '-'}
                </p>
                <div className="flex items-center justify-between mb-4">
                  {service.rate === 'quote' ? (
                    <span className="text-sm font-semibold text-green-600">Free Quote</span>
                  ) : (
                    <span className="text-lg font-bold text-[#0E7480]">
                      ${Number(service.base_price || 0).toFixed(2)}
                    </span>
                  )}
                  <span className="text-sm text-gray-500">{service.pricing_type}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(service)}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-[#0E7480] text-white rounded-lg hover:bg-[#0a5a63] transition-colors text-sm"
                  >
                    <Edit className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(service.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <ImageIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-900 mb-2">No services found</p>
            <p className="text-gray-600">
              {searchQuery || selectedCategory ? 'Try adjusting your filters' : `Add your first ${activeChannel} service to get started`}
            </p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="text-2xl font-bold text-gray-900">
                {editingService ? 'Edit Service' : 'Add New Service'}
              </h2>
            </div>

            <div className="overflow-y-auto flex-1 px-6 py-4">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <form id="service-form" onSubmit={handleSubmit} className="space-y-6">
                {/* SECTION 1: Service Type */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#0E7480] rounded-lg flex items-center justify-center text-white font-bold text-sm">1</div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Service Type</h3>
                      <p className="text-xs text-gray-600">Choose who this service is for</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sales_channel: 'residential', category_id: '' })}
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all border-2 ${
                        formData.sales_channel === 'residential'
                          ? 'border-[#0E7480] bg-teal-50 text-[#0E7480]'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Home className="w-4 h-4" />
                      Residential
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, sales_channel: 'commercial', category_id: '', rate: 'quote', emergency: 'no' })}
                      className={`flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all border-2 ${
                        formData.sales_channel === 'commercial'
                          ? 'border-[#0E7480] bg-teal-50 text-[#0E7480]'
                          : 'border-gray-300 bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      <Building2 className="w-4 h-4" />
                      Commercial
                    </button>
                  </div>
                  {formData.sales_channel === 'commercial' && (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-700">💡 Commercial services have no categories and are always quote-based.</p>
                    </div>
                  )}
                </div>

                {/* SECTION 2: Basic Information */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#0E7480] rounded-lg flex items-center justify-center text-white font-bold text-sm">2</div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Basic Information</h3>
                      <p className="text-xs text-gray-600">Service name and category</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {formData.sales_channel === 'residential' && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
                    <select
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                    >
                      <option value="">Select a category</option>
                      {categories.filter(c => c.is_active).map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        name: e.target.value,
                        slug: generateSlug(e.target.value)
                      });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                    placeholder="e.g. Appliance Repair & Install"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Slug * 
                    <span className="text-xs text-gray-500 font-normal ml-1">(URL-friendly)</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                    placeholder="appliance-repair"
                  />
                </div>
                  </div>
                </div>

                {/* SECTION 3: Pricing Configuration */}
                {formData.sales_channel === 'residential' && (
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#0E7480] rounded-lg flex items-center justify-center text-white font-bold text-sm">3</div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Pricing Configuration</h3>
                      <p className="text-xs text-gray-600">Set pricing mode and rates</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Modes</label>
<div className="flex flex-col gap-2">
  <label className="inline-flex items-center">
    <input
      type="checkbox"
      checked={formData.rate === 'quote' || formData.rate === 'both'}
      onChange={e => {
        if (e.target.checked) {
          setFormData(f => ({ ...f, rate: f.rate === 'yes' ? 'both' : 'quote' }));
        } else {
          setFormData(f => ({ ...f, rate: f.rate === 'both' ? 'yes' : '' }));
        }
      }}
      className="form-checkbox h-4 w-4 text-[#0E7480] border-gray-300 rounded"
    />
    <span className="ml-2">Enable Free Quote</span>
  </label>
  <label className="inline-flex items-center">
    <input
      type="checkbox"
      checked={formData.rate === 'yes' || formData.rate === 'both'}
      onChange={e => {
        if (e.target.checked) {
          setFormData(f => ({ ...f, rate: f.rate === 'quote' ? 'both' : 'yes' }));
        } else {
          setFormData(f => ({ ...f, rate: f.rate === 'both' ? 'quote' : '' }));
        }
      }}
      className="form-checkbox h-4 w-4 text-[#0E7480] border-gray-300 rounded"
    />
    <span className="ml-2">Enable Rate-Based (shows price)</span>
  </label>
</div>
                    </div>

                    {/* Additional Hourly Rate - shown when rate is 'yes' (Rate-Based) */}
                    {formData.rate === 'yes' && (
                      <div className="md:col-span-2 bg-[#0E7480]/5 border border-[#0E7480]/20 rounded-lg p-4">
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Additional Charge Per Hour (CAD)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.additional_hourly_rate || ''}
                            onChange={(e) => setFormData({ ...formData, additional_hourly_rate: e.target.value })}
                            className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] transition-all bg-white"
                            placeholder="100.00"
                          />
                        </div>
                        <p className="text-xs text-gray-600 mt-2 flex items-start gap-1.5">
                          <svg className="w-3.5 h-3.5 text-[#0E7480] mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                          <span>Rate charged for additional hours beyond the base service when pros submit additional invoices</span>
                        </p>
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Service?</label>
                      <select
                        value={formData.emergency}
                        onChange={(e) => setFormData({ ...formData, emergency: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                      >
                        <option value="no">No</option>
                        <option value="yes">Yes</option>
                      </select>
                    </div>
                  </div>
                </div>
                )}

                {/* SECTION 4: Pricing Details */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#0E7480] rounded-lg flex items-center justify-center text-white font-bold text-sm">{formData.sales_channel === 'residential' ? '4' : '3'}</div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Pricing Details</h3>
                      <p className="text-xs text-gray-600">Set base price and pricing type</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Base Price (CAD)</label>
                  {formData.pricing_type === 'custom' ? (
                    <input
                      type="text"
                      value="Free Quote"
                      disabled
                      className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 cursor-not-allowed"
                    />
                  ) : (
                    <input
                      type="number"
                      step="0.01"
                      value={formData.base_price}
                      onChange={(e) => setFormData({ ...formData, base_price: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                      placeholder="0.00"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pricing Type</label>
                  <select
                    value={formData.pricing_type}
                    onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                  >
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                    <option value="custom">Custom / Quote</option>
                  </select>
                </div>

                {/* Emergency Pricing Fields - shown when emergency is 'yes' */}
                {formData.sales_channel === 'residential' && formData.emergency === 'yes' && (
                  <div className="md:col-span-2 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Emergency Base Price (CAD)
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.emergency_base_price || ''}
                            onChange={(e) => setFormData({ ...formData, emergency_base_price: e.target.value })}
                            className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] transition-all bg-white"
                            placeholder="150.00"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-800 mb-2">
                          Emergency Pricing Type
                        </label>
                        <select
                          value={formData.emergency_pricing_type}
                          onChange={(e) => setFormData({ ...formData, emergency_pricing_type: e.target.value })}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent bg-white"
                        >
                          <option value="fixed">Fixed</option>
                          <option value="hourly">Hourly</option>
                          <option value="per_job">Per Job</option>
                        </select>
                      </div>
                    </div>
                    <p className="text-xs text-red-700 mt-2 flex items-start gap-1.5">
                      <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>Emergency services have higher pricing for urgent/after-hours requests</span>
                    </p>
                  </div>
                )}
                  </div>
                </div>

                {/* SECTION 5: Service Description */}
                <div className="bg-white rounded-2xl shadow-lg p-6 mb-6 border border-gray-100">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 bg-[#0E7480] rounded-lg flex items-center justify-center text-white font-bold text-sm">{formData.sales_channel === 'residential' ? '5' : '4'}</div>
                    <div>
                      <h3 className="text-base font-bold text-gray-900">Service Description</h3>
                      <p className="text-xs text-gray-600">Describe what this service offers</p>
                    </div>
                  </div>
                <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Short Description</label>
                  <input
                    type="text"
                    value={formData.short_description}
                    onChange={(e) => setFormData({ ...formData, short_description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                    placeholder="Brief description for listings"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                    placeholder="Detailed description of the service"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Customers Use This Service For</label>
                  <p className="text-xs text-gray-500 mb-2">Add items that describe what this service covers (e.g. "Dishwasher Install", "Fridge Repair")</p>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={useCaseInput}
                      onChange={(e) => setUseCaseInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && useCaseInput.trim()) {
                          e.preventDefault();
                          if (!formData.use_cases.includes(useCaseInput.trim())) {
                            setFormData({ ...formData, use_cases: [...formData.use_cases, useCaseInput.trim()] });
                          }
                          setUseCaseInput('');
                        }
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                      placeholder="Type a use case and press Enter or click Add"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (useCaseInput.trim() && !formData.use_cases.includes(useCaseInput.trim())) {
                          setFormData({ ...formData, use_cases: [...formData.use_cases, useCaseInput.trim()] });
                        }
                        setUseCaseInput('');
                      }}
                      className="px-4 py-2 bg-[#0E7480] text-white rounded-lg hover:bg-[#0a5a63] transition-colors text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                  {formData.use_cases.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {formData.use_cases.map((uc, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-[#0E7480] border border-teal-200 rounded-full text-sm">
                          {uc}
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, use_cases: formData.use_cases.filter((_, i) => i !== idx) })}
                            className="ml-1 text-teal-400 hover:text-red-500 transition-colors font-bold"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Service Image</label>
                  <div className="flex items-center gap-4">
                    {imagePreview && (
                      <img src={imagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg" />
                    )}
                    <label className="flex-1 cursor-pointer">
                      <div className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#0E7480] transition-colors">
                        <Upload className="w-5 h-5 text-gray-400" />
                        <span className="text-sm text-gray-600">{imageFile ? imageFile.name : 'Choose image'}</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
                    </label>
                  </div>
                </div>
                </div>
                </div>

            </form>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="service-form"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[#0E7480] text-white rounded-lg hover:bg-[#0a5a63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : (editingService ? 'Update Service' : 'Create Service')}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
