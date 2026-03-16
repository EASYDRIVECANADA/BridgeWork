'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { Plus, Edit, Trash2, Upload, FolderOpen, GripVertical, Home, Package } from 'lucide-react';
import api from '@/lib/api';

export default function AdminCategoriesPage() {
  const router = useRouter();
  const { profile } = useSelector((state) => state.auth);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon_url: '',
    image_url: '',
    display_order: 0
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
      const [catRes, svcRes] = await Promise.all([
        api.get('/admin/manage/categories?sales_channel=residential'),
        api.get('/admin/manage/services?sales_channel=residential')
      ]);
      if (catRes.data.success) {
        setCategories(catRes.data.data.categories);
      }
      if (svcRes.data.success) {
        setServices(svcRes.data.data.services);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getServiceCount = (categoryId) => {
    return services.filter(s => s.category_id === categoryId && s.is_active).length;
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

  const uploadImage = async (categoryId) => {
    if (!imageFile) return null;

    const fd = new FormData();
    fd.append('image', imageFile);
    fd.append('entity_type', 'category');
    fd.append('entity_id', categoryId);

    try {
      const response = await api.post('/admin/manage/upload-image', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.data.image_url;
    } catch (err) {
      console.error('Image upload failed:', err);
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      let response;
      if (editingCategory) {
        response = await api.put(`/admin/manage/categories/${editingCategory.id}`, formData);
      } else {
        response = await api.post('/admin/manage/categories', formData);
      }

      if (response.data.success) {
        const categoryId = editingCategory?.id || response.data.data.category.id;
        if (imageFile) {
          await uploadImage(categoryId);
        }
        setShowModal(false);
        resetForm();
        fetchData();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon_url: category.icon_url || '',
      image_url: category.image_url || '',
      display_order: category.display_order || 0
    });
    setImagePreview(category.image_url || '');
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    const svcCount = getServiceCount(id);
    if (svcCount > 0) {
      alert(`Cannot delete this category — it has ${svcCount} active service(s). Remove or reassign them first.`);
      return;
    }
    if (!confirm('Are you sure you want to delete this category?')) return;

    try {
      await api.delete(`/admin/manage/categories/${id}`);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon_url: '',
      image_url: '',
      display_order: 0
    });
    setImageFile(null);
    setImagePreview('');
    setError('');
  };

  const generateSlug = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const activeCategories = categories.filter(c => c.is_active);
  const inactiveCategories = categories.filter(c => !c.is_active);

  const handleToggleStatus = async (category) => {
    try {
      await api.put(`/admin/manage/categories/${category.id}`, {
        is_active: !category.is_active
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0E7480] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-bold text-gray-900">Residential Categories</h1>
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-teal-50 text-teal-700 text-xs font-semibold rounded-full border border-teal-200">
                  <Home className="w-3 h-3" />
                  Residential Only
                </span>
              </div>
              <p className="mt-1 text-gray-600">Manage categories for residential services. Commercial services have no categories.</p>
            </div>
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#0E7480] text-white rounded-lg hover:bg-[#0a5a63] transition-colors font-medium"
            >
              <Plus className="w-5 h-5" />
              Add Category
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Total Categories</div>
            <div className="mt-2 text-3xl font-bold text-gray-900">{categories.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Active</div>
            <div className="mt-2 text-3xl font-bold text-green-600">{activeCategories.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Inactive</div>
            <div className="mt-2 text-3xl font-bold text-red-600">{inactiveCategories.length}</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-sm font-medium text-gray-600">Residential Services</div>
            <div className="mt-2 text-3xl font-bold text-[#0E7480]">
              {services.filter(s => s.is_active).length}
            </div>
          </div>
        </div>

        {/* Categories Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Services</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                      <FolderOpen className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No residential categories yet</p>
                      <p className="text-sm">Create your first category to organize residential services</p>
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className={`hover:bg-gray-50 ${!category.is_active ? 'bg-gray-50/60 opacity-70' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{category.display_order}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {category.image_url ? (
                            <img src={category.image_url} alt={category.name} className="w-10 h-10 rounded-lg object-cover" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center">
                              <span className="text-lg">{category.icon_url || '📁'}</span>
                            </div>
                          )}
                          <div className="text-sm font-medium text-gray-900">{category.name}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">{category.slug}</code>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-500 max-w-xs truncate">{category.description || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full">
                          <Package className="w-3 h-3" />
                          {getServiceCount(category.id)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleToggleStatus(category)}
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                            category.is_active
                              ? 'bg-green-100 text-green-800 hover:bg-green-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {category.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleEdit(category)}
                            className="text-[#0E7480] hover:text-[#0a5a63] inline-flex items-center gap-1"
                          >
                            <Edit className="w-4 h-4" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(category.id)}
                            className="text-red-600 hover:text-red-900 inline-flex items-center gap-1"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingCategory ? 'Edit Category' : 'Add New Residential Category'}
            </h2>

            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) });
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                    placeholder="e.g. General Services"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Slug *</label>
                  <input
                    type="text"
                    required
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                    placeholder="general-services"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                    placeholder="Brief description of this category"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Display Order</label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                    placeholder="0"
                  />
                  <p className="mt-1 text-xs text-gray-500">Lower numbers appear first</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Icon (emoji or URL)</label>
                  <input
                    type="text"
                    value={formData.icon_url}
                    onChange={(e) => setFormData({ ...formData, icon_url: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                    placeholder="🏠 or https://..."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category Image</label>
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

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 bg-[#0E7480] text-white rounded-lg hover:bg-[#0a5a63] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Saving...' : (editingCategory ? 'Update Category' : 'Create Category')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
