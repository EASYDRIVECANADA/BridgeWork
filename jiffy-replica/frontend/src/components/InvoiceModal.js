'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Loader2, FileText } from 'lucide-react';

const generateInvoiceNumber = () => {
  const now = new Date();
  return `INV-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
};

export default function InvoiceModal({ isOpen, onClose, onSubmit, booking, submitting }) {
  const [invoiceNumber] = useState(generateInvoiceNumber());
  const [issueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [subject, setSubject] = useState('');
  const [notes, setNotes] = useState('');
  const [taxRate, setTaxRate] = useState(13);
  const [items, setItems] = useState([
    { service: '', description: '', qty: 1, unit_cost: '', total: 0 }
  ]);

  // Auto-fill recipient from booking
  const recipientName = booking?.profiles?.full_name || booking?.user_name || '';
  const recipientAddress = [booking?.address, booking?.city, booking?.state, booking?.zip_code].filter(Boolean).join(', ');

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.total) || 0), 0);
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  // Update item total when qty or unit_cost changes
  const updateItem = (idx, field, value) => {
    setItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'qty' || field === 'unit_cost') {
        updated.total = (parseFloat(updated.qty) || 0) * (parseFloat(updated.unit_cost) || 0);
      }
      return updated;
    }));
  };

  const addItem = () => {
    setItems([...items, { service: '', description: '', qty: 1, unit_cost: '', total: 0 }]);
  };

  const removeItem = (idx) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!dueDate || items.length === 0 || items.some(i => !i.service || !i.unit_cost)) {
      alert('Please fill in all required fields and at least one line item.');
      return;
    }
    onSubmit({
      invoice_number: invoiceNumber,
      issue_date: issueDate,
      due_date: dueDate,
      subject,
      recipient_name: recipientName,
      recipient_address: recipientAddress,
      notes,
      tax_rate: taxRate / 100,
      subtotal,
      tax,
      total,
      items
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#0E7480]" />
            <h2 className="text-lg font-bold text-gray-900">Create Invoice</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Recipient Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Name</label>
              <input
                type="text"
                value={recipientName}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Address</label>
              <input
                type="text"
                value={recipientAddress}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 text-sm"
              />
            </div>
          </div>
          {/* Invoice Info */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Number</label>
              <input
                type="text"
                value={invoiceNumber}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
              <input
                type="date"
                value={issueDate}
                disabled
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-700 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date *</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480]"
              />
            </div>
          </div>
          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Invoice Subject (optional)</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480]"
              placeholder="e.g. Appliance Repair Service"
            />
          </div>
          {/* Line Items */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-2">Line Items *</label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border rounded-lg overflow-hidden">
                <thead className="bg-[#0E7480] text-white">
                  <tr>
                    <th className="px-2 py-2 text-left">Service/Product</th>
                    <th className="px-2 py-2 text-left">Description</th>
                    <th className="px-2 py-2 text-center w-16">Qty</th>
                    <th className="px-2 py-2 text-center w-24">Unit Cost</th>
                    <th className="px-2 py-2 text-center w-24">Total</th>
                    <th className="px-2 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b last:border-b-0">
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={item.service}
                          onChange={e => updateItem(idx, 'service', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Service"
                          required
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input
                          type="text"
                          value={item.description}
                          onChange={e => updateItem(idx, 'description', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="Description"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={e => updateItem(idx, 'qty', e.target.value)}
                          className="w-14 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                        />
                      </td>
                      <td className="px-2 py-2 text-center">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_cost}
                          onChange={e => updateItem(idx, 'unit_cost', e.target.value)}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-center"
                          placeholder="$0.00"
                          required
                        />
                      </td>
                      <td className="px-2 py-2 text-center font-semibold text-gray-700">
                        ${item.total.toFixed(2)}
                      </td>
                      <td className="px-2 py-2 text-center">
                        <button type="button" onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700" disabled={items.length <= 1}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" onClick={addItem} className="mt-2 flex items-center gap-1 text-[#0E7480] text-sm font-medium hover:underline">
              <Plus className="w-4 h-4" /> Add Line Item
            </button>
          </div>
          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480]"
              rows={2}
              placeholder="Any additional notes..."
            />
          </div>
          {/* Tax & Totals */}
          <div className="flex flex-col items-end gap-2 border-t pt-4">
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Subtotal:</span>
              <span className="font-semibold text-gray-900">${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">Tax Rate (%):</span>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={taxRate}
                onChange={e => setTaxRate(parseFloat(e.target.value) || 0)}
                className="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center"
              />
              <span className="font-semibold text-gray-900">${tax.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-4 text-lg">
              <span className="font-bold text-gray-900">Invoice Total:</span>
              <span className="font-bold text-[#0E7480]">${total.toFixed(2)}</span>
            </div>
          </div>
          {/* Submit */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-100">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2 rounded-lg bg-[#0E7480] text-white font-semibold hover:bg-[#0a5a63] flex items-center gap-2 disabled:opacity-50"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {submitting ? 'Submitting...' : 'Submit Invoice & Accept Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
