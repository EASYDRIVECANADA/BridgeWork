'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Plus, Trash2, Save, Send, Loader2, DollarSign, User, FileText
} from 'lucide-react';
import { createQuote, sendQuote } from '@/store/slices/quotesSlice';
import { toast } from 'react-toastify';
import api, { paymentsAPI } from '@/lib/api';

const UNIT_OPTIONS = ['each', 'hour', 'sqft', 'linear ft', 'job', 'day'];

export default function NewQuotePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);
  const { isLoading } = useSelector((state) => state.quotes);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerResults, setCustomerResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [validUntil, setValidUntil] = useState('');
  const taxRate = 0.13; // Platform tax rate (Ontario HST) — set by admin
  const [discountAmount, setDiscountAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { description: '', quantity: '1', unit_price: '', unit: 'each' }
  ]);
  const [saving, setSaving] = useState(false);
  const [commissionRate, setCommissionRate] = useState(0.15);
  const [isCustomRate, setIsCustomRate] = useState(false);

  useEffect(() => {
    if (!user) {
      router.push('/pro-login');
      return;
    }
    // Set default valid_until to 30 days from now
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setValidUntil(d.toISOString().split('T')[0]);

    // Fetch pro's commission rate
    paymentsAPI.commissionRate().then(res => {
      const data = res.data?.data;
      if (data) {
        setCommissionRate(data.rate);
        setIsCustomRate(data.is_custom_rate);
      }
    }).catch(() => {});
  }, [user, router]);

  // Search customers
  useEffect(() => {
    if (customerSearch.length < 2) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/auth/search-users', { params: { q: customerSearch, role: 'user' } });
        setCustomerResults(res.data?.data?.users || []);
      } catch {
        setCustomerResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [customerSearch]);

  const addItem = () => {
    setItems([...items, { description: '', quantity: '1', unit_price: '', unit: 'each' }]);
  };

  const removeItem = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index, field, value) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const subtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0);
  }, 0);

  const discount = parseFloat(discountAmount) || 0;
  const tax = (subtotal - discount) * taxRate;
  const total = subtotal - discount + tax;

  const handleSubmit = async (sendImmediately = false) => {
    if (!title.trim()) {
      toast.error('Please enter a quote title');
      return;
    }
    if (items.some(item => !item.description.trim() || !item.unit_price)) {
      toast.error('Please fill in all item descriptions and prices');
      return;
    }

    setSaving(true);
    try {
      const quoteData = {
        title: title.trim(),
        description: description.trim() || undefined,
        customer_id: customerId || undefined,
        items: items.map((item, i) => ({
          description: item.description.trim(),
          quantity: parseFloat(item.quantity) || 1,
          unit_price: parseFloat(item.unit_price),
          unit: item.unit,
          sort_order: i,
        })),
        tax_rate: taxRate,
        discount_amount: discount,
        valid_until: validUntil || undefined,
        notes: notes.trim() || undefined,
      };

      const result = await dispatch(createQuote(quoteData)).unwrap();
      toast.success('Quote created!');

      if (sendImmediately && customerId && result.id) {
        await dispatch(sendQuote(result.id)).unwrap();
        toast.success('Quote sent to customer!');
      }

      router.push('/pro-dashboard/quotes');
    } catch (err) {
      toast.error(err || 'Failed to create quote');
    }
    setSaving(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
          <Link href="/pro-dashboard/quotes" className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4 text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back to Quotes
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create New Quote</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="space-y-6">
          {/* Quote Details */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Quote Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Bathroom Renovation Quote"
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description of the work to be done..."
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valid Until</label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes (not visible to customer)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Private notes..."
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Customer
            </h2>
            {selectedCustomer ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{selectedCustomer.full_name}</p>
                  <p className="text-sm text-gray-500">{selectedCustomer.email}</p>
                </div>
                <button
                  onClick={() => { setSelectedCustomer(null); setCustomerId(''); setCustomerSearch(''); }}
                  className="text-red-500 hover:text-red-700 text-sm"
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="relative">
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
                  placeholder="Search customers by name or email..."
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
                {customerResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {customerResults.map((c) => (
                      <button
                        key={c.id}
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerId(c.id);
                          setCustomerSearch('');
                          setCustomerResults([]);
                        }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b last:border-b-0"
                      >
                        <p className="font-medium text-sm">{c.full_name}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </button>
                    ))}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-1">You can save the quote as draft without a customer</p>
              </div>
            )}
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              Line Items
            </h2>
            <div className="space-y-3">
              {/* Header */}
              <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-medium text-gray-500 uppercase tracking-wider px-1">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Qty</div>
                <div className="col-span-2">Unit</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-1"></div>
              </div>

              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-start">
                  <div className="col-span-12 md:col-span-5">
                    <input
                      type="text"
                      value={item.description}
                      onChange={(e) => updateItem(index, 'description', e.target.value)}
                      placeholder="Item description"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                      min="0.01"
                      step="0.01"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <select
                      value={item.unit}
                      onChange={(e) => updateItem(index, 'unit', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
                    >
                      {UNIT_OPTIONS.map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-3 md:col-span-2">
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
                      <input
                        type="number"
                        value={item.unit_price}
                        onChange={(e) => updateItem(index, 'unit_price', e.target.value)}
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className="w-full pl-7 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm"
                      />
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center justify-center">
                    {items.length > 1 && (
                      <button
                        onClick={() => removeItem(index)}
                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {/* Line total */}
                  <div className="col-span-12 md:hidden text-right text-sm text-gray-500 -mt-1 mb-2">
                    Line total: ${((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                  </div>
                </div>
              ))}

              <button
                onClick={addItem}
                className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mt-2"
              >
                <Plus className="w-4 h-4" />
                Add Line Item
              </button>
            </div>

            {/* Totals */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex flex-col items-end space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500 w-32 text-right">Subtotal:</span>
                  <span className="font-medium w-28 text-right">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500 w-32 text-right">Discount:</span>
                  <div className="w-28">
                    <div className="relative">
                      <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                      <input
                        type="number"
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(e.target.value)}
                        min="0"
                        step="0.01"
                        className="w-full pl-5 pr-2 py-1 border rounded text-sm text-right focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-500 w-32 text-right">
                    Tax ({(taxRate * 100).toFixed(0)}% HST):
                  </span>
                  <span className="font-medium w-28 text-right">${tax.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-4 text-lg font-bold border-t pt-2">
                  <span className="w-32 text-right">Total:</span>
                  <span className="w-28 text-right text-blue-600">${total.toFixed(2)}</span>
                </div>
                {/* Commission Breakdown */}
                {subtotal > 0 && (
                  <div className="border-t pt-3 mt-2 w-full max-w-xs">
                    <p className="text-xs font-semibold text-gray-500 mb-1.5">Your Earnings Breakdown</p>
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-gray-400 w-32 text-right">Platform Fee ({(commissionRate * 100).toFixed(0)}%{isCustomRate ? ' Custom' : ''}):</span>
                      <span className="text-red-500 w-28 text-right">-${(subtotal * commissionRate).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-semibold mt-1">
                      <span className="text-gray-600 w-32 text-right">You Earn:</span>
                      <span className="text-green-600 w-28 text-right">${(subtotal * (1 - commissionRate)).toFixed(2)}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between bg-white rounded-xl border shadow-sm p-6">
            <Link
              href="/pro-dashboard/quotes"
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </Link>
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit(false)}
                disabled={saving || isLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition font-medium disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save as Draft
              </button>
              {customerId && (
                <button
                  onClick={() => handleSubmit(true)}
                  disabled={saving || isLoading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Save & Send
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
