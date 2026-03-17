'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { paymentsAPI, prosAPI, quotesAPI, settingsAPI } from '@/lib/api';
import { toast } from 'react-toastify';
import {
  ArrowLeft,
  Loader2,
  DollarSign,
  TrendingUp,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  RotateCcw,
  Receipt,
  Shield,
  ChevronLeft,
  ChevronRight,
  Settings,
  Star,
  Briefcase,
  Percent,
  Save,
  RotateCw,
  FileText,
  Eye,
  Send,
  Calculator,
} from 'lucide-react';

const txStatusConfig = {
  succeeded: { label: 'Paid', color: 'bg-green-50 text-green-600', icon: CheckCircle },
  pending: { label: 'Pending', color: 'bg-yellow-50 text-yellow-600', icon: Clock },
  failed: { label: 'Failed', color: 'bg-red-50 text-red-600', icon: XCircle },
  refunded: { label: 'Refunded', color: 'bg-purple-50 text-purple-600', icon: RotateCcw },
};

export default function AdminRevenuePage() {
  const router = useRouter();
  const { user, profile, authInitialized } = useSelector((state) => state.auth);
  const [revenue, setRevenue] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refundingId, setRefundingId] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 15;
  const [activeTab, setActiveTab] = useState('revenue');
  const [pros, setPros] = useState([]);
  const [prosLoading, setProsLoading] = useState(false);
  const [editingProId, setEditingProId] = useState(null);
  const [editRate, setEditRate] = useState('');
  const [savingCommission, setSavingCommission] = useState(false);
  const [allQuotes, setAllQuotes] = useState([]);
  const [allInvoices, setAllInvoices] = useState([]);
  const [qiLoading, setQiLoading] = useState(false);
  const [qiSubTab, setQiSubTab] = useState('quotes');
  const [qiPage, setQiPage] = useState(0);
  const QI_PAGE_SIZE = 15;
  
  // Tax settings state
  const [taxSettings, setTaxSettings] = useState({
    rate: 13,
    quote: 13,
    emergency: 13
  });
  const [taxLoading, setTaxLoading] = useState(false);
  const [editingTaxType, setEditingTaxType] = useState(null);
  const [editTaxValue, setEditTaxValue] = useState('');
  const [savingTax, setSavingTax] = useState(false);

  useEffect(() => {
    if (!authInitialized) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (profile?.role !== 'admin') {
      toast.error('Admin access required');
      router.push('/dashboard');
      return;
    }
    fetchRevenue();
    fetchPros();
    fetchQuotesInvoices();
    fetchTaxSettings();
  }, [user, authInitialized, profile, router]);

  const fetchTaxSettings = async () => {
    setTaxLoading(true);
    try {
      const res = await settingsAPI.getTaxSettings();
      const settings = res.data?.data?.settings || [];
      const newTaxSettings = { rate: 13, quote: 13, emergency: 13 };
      settings.forEach(s => {
        if (s.service_type && s.value !== undefined) {
          newTaxSettings[s.service_type] = s.value;
        }
      });
      setTaxSettings(newTaxSettings);
    } catch (err) {
      console.error('[ADMIN] Tax settings error:', err);
    }
    setTaxLoading(false);
  };

  const handleSaveTax = async (serviceType) => {
    setSavingTax(true);
    try {
      const value = parseFloat(editTaxValue);
      if (isNaN(value) || value < 0 || value > 100) {
        toast.error('Tax rate must be between 0 and 100');
        setSavingTax(false);
        return;
      }
      const res = await settingsAPI.updateTaxSetting(serviceType, { value });
      toast.success(res.data?.message || 'Tax rate updated');
      setEditingTaxType(null);
      setEditTaxValue('');
      fetchTaxSettings();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update tax rate');
    }
    setSavingTax(false);
  };

  const fetchRevenue = async () => {
    setLoading(true);
    try {
      const res = await paymentsAPI.adminRevenue();
      setRevenue(res.data?.data || null);
    } catch (err) {
      console.error('[ADMIN] Revenue error:', err);
      toast.error('Failed to load revenue data');
    }
    setLoading(false);
  };

  const fetchQuotesInvoices = async () => {
    setQiLoading(true);
    try {
      const [qRes, iRes] = await Promise.all([
        quotesAPI.getQuotes({ limit: 200 }),
        quotesAPI.getInvoices({ limit: 200 }),
      ]);
      setAllQuotes(qRes.data?.data?.quotes || []);
      setAllInvoices(iRes.data?.data?.invoices || []);
    } catch (err) {
      console.error('[ADMIN] Quotes/Invoices error:', err);
    }
    setQiLoading(false);
  };

  const fetchPros = async () => {
    setProsLoading(true);
    try {
      const res = await prosAPI.adminList();
      setPros(res.data?.data?.pros || []);
    } catch (err) {
      console.error('[ADMIN] Pros list error:', err);
    }
    setProsLoading(false);
  };

  const handleSaveCommission = async (proId) => {
    setSavingCommission(true);
    try {
      const value = editRate === '' || editRate === 'default' ? null : parseFloat(editRate) / 100;
      if (value !== null && (isNaN(value) || value < 0 || value > 1)) {
        toast.error('Rate must be 0-100%');
        setSavingCommission(false);
        return;
      }
      const res = await prosAPI.setCommission(proId, { commission_rate: value });
      toast.success(res.data?.message || 'Commission updated');
      setEditingProId(null);
      setEditRate('');
      fetchPros();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update commission');
    }
    setSavingCommission(false);
  };

  const handleRefund = async () => {
    if (!selectedTx) return;
    setRefundingId(selectedTx.id);
    try {
      await paymentsAPI.adminRefund({
        transaction_id: selectedTx.id,
        reason: refundReason || 'requested_by_customer',
      });
      toast.success(`Refund of $${parseFloat(selectedTx.amount).toFixed(2)} processed successfully`);
      setShowRefundModal(false);
      setSelectedTx(null);
      setRefundReason('');
      fetchRevenue();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to process refund');
    }
    setRefundingId(null);
  };

  const openRefundModal = (tx) => {
    setSelectedTx(tx);
    setRefundReason('');
    setShowRefundModal(true);
  };

  if (!authInitialized || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0E7480] mx-auto mb-3" />
          <p className="text-gray-600 text-sm">Loading revenue dashboard...</p>
        </div>
      </div>
    );
  }

  if (!revenue) return null;

  const transactions = revenue.recent_transactions || [];
  const totalPages = Math.ceil(transactions.length / PAGE_SIZE);
  const paginatedTx = transactions.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Revenue Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Platform revenue overview &middot; {revenue.commission_rate * 100}% commission rate
            </p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Admin Only</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-8">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'revenue'
                ? 'bg-[#0E7480] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            Revenue & Transactions
          </button>
          <button
            onClick={() => setActiveTab('pros')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'pros'
                ? 'bg-[#0E7480] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            Manage Pros & Commission
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'quotes'
                ? 'bg-[#0E7480] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            Quotes & Invoices
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === 'tax'
                ? 'bg-[#0E7480] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calculator className="w-4 h-4" />
            Tax Management
          </button>
        </div>

        {/* ==================== MANAGE PROS TAB ==================== */}
        {activeTab === 'pros' && (
          <div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Service Professionals</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Set custom commission rates per pro. Default platform rate: 15%</p>
                </div>
                <span className="text-xs text-gray-400">{pros.length} pros</span>
              </div>

              {/* Table Header */}
              <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <div className="col-span-3">Pro</div>
                <div className="col-span-2">Location</div>
                <div className="col-span-1 text-center">Rating</div>
                <div className="col-span-1 text-center">Jobs</div>
                <div className="col-span-1 text-center">Status</div>
                <div className="col-span-2 text-center">Commission</div>
                <div className="col-span-2 text-center">Actions</div>
              </div>

              {prosLoading ? (
                <div className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0E7480] mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading pros...</p>
                </div>
              ) : pros.length > 0 ? (
                pros.map((pro) => (
                  <div key={pro.id} className="grid grid-cols-12 gap-3 px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center">
                    <div className="col-span-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{pro.business_name || 'Unnamed'}</p>
                      <p className="text-xs text-gray-400">{pro.profiles?.full_name || pro.profiles?.email || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-gray-600">{pro.profiles?.city || '—'}{pro.profiles?.state ? `, ${pro.profiles.state}` : ''}</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium text-gray-700">{pro.rating || '0'}</span>
                      </div>
                      <p className="text-xs text-gray-400">{pro.total_reviews || 0} reviews</p>
                    </div>
                    <div className="col-span-1 text-center">
                      <p className="text-sm font-medium text-gray-700">{pro.completed_jobs || 0}</p>
                      <p className="text-xs text-gray-400">completed</p>
                    </div>
                    <div className="col-span-1 text-center">
                      {pro.is_available ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-green-50 text-green-600">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-500">
                          Offline
                        </span>
                      )}
                    </div>
                    <div className="col-span-2 text-center">
                      {editingProId === pro.id ? (
                        <div className="flex items-center gap-1 justify-center">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="1"
                            value={editRate}
                            onChange={(e) => setEditRate(e.target.value)}
                            placeholder="15"
                            className="w-16 border border-gray-300 rounded-lg px-2 py-1 text-sm text-center focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                          />
                          <span className="text-xs text-gray-400">%</span>
                        </div>
                      ) : (
                        <div>
                          <span className={`text-sm font-semibold ${pro.commission_rate != null ? 'text-[#0E7480]' : 'text-gray-600'}`}>
                            {pro.commission_rate != null ? `${(pro.commission_rate * 100).toFixed(0)}%` : '15%'}
                          </span>
                          {pro.commission_rate != null ? (
                            <p className="text-xs text-[#0E7480]">Custom</p>
                          ) : (
                            <p className="text-xs text-gray-400">Default</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 flex items-center justify-center gap-2">
                      {editingProId === pro.id ? (
                        <>
                          <button
                            onClick={() => handleSaveCommission(pro.id)}
                            disabled={savingCommission}
                            className="px-3 py-1.5 bg-[#0E7480] text-white rounded-lg text-xs font-semibold hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {savingCommission ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingProId(null); setEditRate(''); }}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setEditingProId(pro.id);
                              setEditRate(pro.commission_rate != null ? (pro.commission_rate * 100).toFixed(0) : '');
                            }}
                            className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-1"
                          >
                            <Percent className="w-3 h-3" />
                            Set Rate
                          </button>
                          {pro.commission_rate != null && (
                            <button
                              onClick={() => {
                                setEditingProId(pro.id);
                                setEditRate('default');
                                setTimeout(() => handleSaveCommission(pro.id), 0);
                              }}
                              className="px-3 py-1.5 border border-orange-300 rounded-lg text-xs font-medium text-orange-600 hover:bg-orange-50 transition-colors flex items-center gap-1"
                            >
                              <RotateCw className="w-3 h-3" />
                              Reset
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-6 py-12 text-center">
                  <Briefcase className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No service professionals yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================== QUOTES & INVOICES TAB ==================== */}
        {activeTab === 'quotes' && (
          <div>
            {/* Sub tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => { setQiSubTab('quotes'); setQiPage(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  qiSubTab === 'quotes' ? 'bg-blue-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                Quotes ({allQuotes.length})
              </button>
              <button
                onClick={() => { setQiSubTab('invoices'); setQiPage(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  qiSubTab === 'invoices' ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                Invoices ({allInvoices.length})
              </button>
            </div>

            {qiLoading ? (
              <div className="text-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-[#0E7480] mx-auto mb-2" />
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            ) : qiSubTab === 'quotes' ? (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">All Quotes</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Platform-wide quote visibility across all pros</p>
                </div>
                <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Title</div>
                  <div className="col-span-2">Pro</div>
                  <div className="col-span-2">Customer</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-2">Date</div>
                </div>
                {(() => {
                  const totalQPages = Math.ceil(allQuotes.length / QI_PAGE_SIZE);
                  const paged = allQuotes.slice(qiPage * QI_PAGE_SIZE, (qiPage + 1) * QI_PAGE_SIZE);
                  return (
                    <>
                      {paged.length > 0 ? paged.map((q) => (
                        <div key={q.id} className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center text-sm">
                          <div className="col-span-1 font-mono text-xs text-gray-400 truncate">{q.quote_number}</div>
                          <div className="col-span-3 font-medium text-gray-900 truncate">{q.title}</div>
                          <div className="col-span-2 text-gray-600 truncate">{q.pro_profiles?.business_name || q.pro_profiles?.profiles?.full_name || '—'}</div>
                          <div className="col-span-2 text-gray-600 truncate">{q.customer?.full_name || '—'}</div>
                          <div className="col-span-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              q.status === 'accepted' ? 'bg-green-50 text-green-600' :
                              q.status === 'sent' ? 'bg-blue-50 text-blue-600' :
                              q.status === 'declined' ? 'bg-red-50 text-red-600' :
                              q.status === 'converted' ? 'bg-purple-50 text-purple-600' :
                              q.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                              'bg-yellow-50 text-yellow-600'
                            }`}>{q.status}</span>
                          </div>
                          <div className="col-span-1 text-right font-semibold">${parseFloat(q.total || 0).toFixed(2)}</div>
                          <div className="col-span-2 text-gray-500 text-xs">{q.created_at ? new Date(q.created_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</div>
                        </div>
                      )) : (
                        <div className="px-6 py-12 text-center">
                          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">No quotes yet</p>
                        </div>
                      )}
                      {totalQPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                          <p className="text-xs text-gray-500">Showing {qiPage * QI_PAGE_SIZE + 1}–{Math.min((qiPage + 1) * QI_PAGE_SIZE, allQuotes.length)} of {allQuotes.length}</p>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setQiPage(Math.max(0, qiPage - 1))} disabled={qiPage === 0} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-sm text-gray-600 font-medium">{qiPage + 1} / {totalQPages}</span>
                            <button onClick={() => setQiPage(Math.min(totalQPages - 1, qiPage + 1))} disabled={qiPage >= totalQPages - 1} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">All Invoices</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Platform-wide invoice visibility across all pros</p>
                </div>
                <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Title</div>
                  <div className="col-span-2">Pro</div>
                  <div className="col-span-2">Customer</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1 text-right">Total</div>
                  <div className="col-span-1 text-right">Due</div>
                  <div className="col-span-1">Due Date</div>
                </div>
                {(() => {
                  const totalIPages = Math.ceil(allInvoices.length / QI_PAGE_SIZE);
                  const paged = allInvoices.slice(qiPage * QI_PAGE_SIZE, (qiPage + 1) * QI_PAGE_SIZE);
                  return (
                    <>
                      {paged.length > 0 ? paged.map((inv) => (
                        <div key={inv.id} className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center text-sm">
                          <div className="col-span-1 font-mono text-xs text-gray-400 truncate">{inv.invoice_number}</div>
                          <div className="col-span-3 font-medium text-gray-900 truncate">{inv.title}</div>
                          <div className="col-span-2 text-gray-600 truncate">{inv.pro_profiles?.business_name || inv.pro_profiles?.profiles?.full_name || '—'}</div>
                          <div className="col-span-2 text-gray-600 truncate">{inv.customer?.full_name || '—'}</div>
                          <div className="col-span-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                              inv.status === 'paid' ? 'bg-green-50 text-green-600' :
                              inv.status === 'sent' ? 'bg-blue-50 text-blue-600' :
                              inv.status === 'overdue' ? 'bg-red-50 text-red-600' :
                              inv.status === 'partially_paid' ? 'bg-yellow-50 text-yellow-600' :
                              inv.status === 'cancelled' ? 'bg-gray-100 text-gray-500' :
                              inv.status === 'draft' ? 'bg-gray-100 text-gray-600' :
                              'bg-orange-50 text-orange-600'
                            }`}>{inv.status?.replace('_', ' ')}</span>
                          </div>
                          <div className="col-span-1 text-right font-semibold">${parseFloat(inv.total || 0).toFixed(2)}</div>
                          <div className="col-span-1 text-right text-orange-600 font-medium">{parseFloat(inv.amount_due || 0) > 0 ? `$${parseFloat(inv.amount_due).toFixed(2)}` : '—'}</div>
                          <div className="col-span-1 text-gray-500 text-xs">{inv.due_date ? new Date(inv.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' }) : '—'}</div>
                        </div>
                      )) : (
                        <div className="px-6 py-12 text-center">
                          <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                          <p className="text-sm text-gray-500">No invoices yet</p>
                        </div>
                      )}
                      {totalIPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                          <p className="text-xs text-gray-500">Showing {qiPage * QI_PAGE_SIZE + 1}–{Math.min((qiPage + 1) * QI_PAGE_SIZE, allInvoices.length)} of {allInvoices.length}</p>
                          <div className="flex items-center gap-2">
                            <button onClick={() => setQiPage(Math.max(0, qiPage - 1))} disabled={qiPage === 0} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                            <span className="text-sm text-gray-600 font-medium">{qiPage + 1} / {totalIPages}</span>
                            <button onClick={() => setQiPage(Math.min(totalIPages - 1, qiPage + 1))} disabled={qiPage >= totalIPages - 1} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* ==================== TAX MANAGEMENT TAB ==================== */}
        {activeTab === 'tax' && (
          <div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Tax Rate Settings</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Configure tax rates for different service types. Default: 13%</p>
                </div>
                <button
                  onClick={fetchTaxSettings}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Refresh"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </div>

              {taxLoading ? (
                <div className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#0E7480] mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading tax settings...</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Rate-based Services */}
                  <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Rate-based Services</p>
                        <p className="text-xs text-gray-500">Services with fixed hourly or per-job rates</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {editingTaxType === 'rate' ? (
                        <>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editTaxValue}
                              onChange={(e) => setEditTaxValue(e.target.value)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none"
                              placeholder="13"
                            />
                            <span className="text-gray-500 font-medium">%</span>
                          </div>
                          <button
                            onClick={() => handleSaveTax('rate')}
                            disabled={savingTax}
                            className="px-3 py-2 bg-[#0E7480] text-white rounded-lg text-sm font-medium hover:bg-[#0a5a63] transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {savingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingTaxType(null); setEditTaxValue(''); }}
                            className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{taxSettings.rate}%</p>
                            <p className="text-xs text-gray-400">current rate</p>
                          </div>
                          <button
                            onClick={() => { setEditingTaxType('rate'); setEditTaxValue(taxSettings.rate.toString()); }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Free Quote Services */}
                  <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <FileText className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Free Quote Services</p>
                        <p className="text-xs text-gray-500">Services that require custom quotes from pros</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {editingTaxType === 'quote' ? (
                        <>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editTaxValue}
                              onChange={(e) => setEditTaxValue(e.target.value)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none"
                              placeholder="13"
                            />
                            <span className="text-gray-500 font-medium">%</span>
                          </div>
                          <button
                            onClick={() => handleSaveTax('quote')}
                            disabled={savingTax}
                            className="px-3 py-2 bg-[#0E7480] text-white rounded-lg text-sm font-medium hover:bg-[#0a5a63] transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {savingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingTaxType(null); setEditTaxValue(''); }}
                            className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{taxSettings.quote}%</p>
                            <p className="text-xs text-gray-400">current rate</p>
                          </div>
                          <button
                            onClick={() => { setEditingTaxType('quote'); setEditTaxValue(taxSettings.quote.toString()); }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Emergency Services */}
                  <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">Emergency Services</p>
                        <p className="text-xs text-gray-500">24/7 urgent services with priority response</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {editingTaxType === 'emergency' ? (
                        <>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editTaxValue}
                              onChange={(e) => setEditTaxValue(e.target.value)}
                              className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-[#0E7480] outline-none"
                              placeholder="13"
                            />
                            <span className="text-gray-500 font-medium">%</span>
                          </div>
                          <button
                            onClick={() => handleSaveTax('emergency')}
                            disabled={savingTax}
                            className="px-3 py-2 bg-[#0E7480] text-white rounded-lg text-sm font-medium hover:bg-[#0a5a63] transition-colors disabled:opacity-50 flex items-center gap-1"
                          >
                            {savingTax ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save
                          </button>
                          <button
                            onClick={() => { setEditingTaxType(null); setEditTaxValue(''); }}
                            className="px-3 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-900">{taxSettings.emergency}%</p>
                            <p className="text-xs text-gray-400">current rate</p>
                          </div>
                          <button
                            onClick={() => { setEditingTaxType('emergency'); setEditTaxValue(taxSettings.emergency.toString()); }}
                            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                          >
                            Edit
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Info Box */}
              <div className="px-6 py-4 bg-amber-50 border-t border-amber-100">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">Tax Rate Information</p>
                    <p className="text-xs text-amber-700 mt-1">
                      Tax rates are applied to the total service price at checkout. Changes will affect all new bookings immediately.
                      Existing bookings will retain their original tax rates.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== REVENUE TAB ==================== */}
        {activeTab === 'revenue' && (<>
        {/* Revenue Summary Cards */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Total Revenue</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">${revenue.total_revenue.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{revenue.succeeded_count} successful payments</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-[#0E7480]" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Platform Fees</p>
            </div>
            <p className="text-2xl font-bold text-[#0E7480]">${revenue.platform_fees.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{revenue.commission_rate * 100}% of base prices</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Pro Payouts</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">${revenue.pro_payouts.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{100 - revenue.commission_rate * 100}% to service pros</p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-xs text-gray-500 uppercase tracking-wider font-medium">Pending</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">${revenue.pending_amount.toFixed(2)}</p>
            <p className="text-xs text-gray-400 mt-1">{revenue.pending_count} pending payments</p>
          </div>
        </div>

        {/* Transaction Status Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-lg font-bold text-green-700">{revenue.succeeded_count}</p>
              <p className="text-xs text-green-600">Succeeded</p>
            </div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-yellow-600" />
            <div>
              <p className="text-lg font-bold text-yellow-700">{revenue.pending_count}</p>
              <p className="text-xs text-yellow-600">Pending</p>
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
            <XCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-lg font-bold text-red-700">{revenue.failed_count}</p>
              <p className="text-xs text-red-600">Failed</p>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">All Transactions</h3>
            <span className="text-xs text-gray-400">{revenue.total_transactions} total</span>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-12 gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <div className="col-span-3">Service</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-1">Amount</div>
            <div className="col-span-1">Platform</div>
            <div className="col-span-1">Pro</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-2">Actions</div>
          </div>

          {paginatedTx.length > 0 ? (
            paginatedTx.map((tx) => {
              const config = txStatusConfig[tx.status] || txStatusConfig.pending;
              const StatusIcon = config.icon;
              const basePrice = parseFloat(tx.bookings?.base_price || tx.amount || 0);
              const platformCut = (basePrice * revenue.commission_rate).toFixed(2);
              const proCut = (basePrice * (1 - revenue.commission_rate)).toFixed(2);

              return (
                <div
                  key={tx.id}
                  className="grid grid-cols-12 gap-3 px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center"
                >
                  <div className="col-span-3">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {tx.bookings?.service_name || tx.description || 'Payment'}
                    </p>
                    <p className="text-xs text-gray-400">{tx.bookings?.booking_number || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">
                      {tx.created_at
                        ? new Date(tx.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : '—'}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm font-semibold text-gray-900">
                      ${parseFloat(tx.amount || 0).toFixed(2)}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm font-medium text-[#0E7480]">${platformCut}</p>
                  </div>
                  <div className="col-span-1">
                    <p className="text-sm font-medium text-green-600">${proCut}</p>
                  </div>
                  <div className="col-span-2">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full ${config.color}`}
                    >
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </div>
                  <div className="col-span-2">
                    {tx.status === 'succeeded' && (
                      <button
                        onClick={() => openRefundModal(tx)}
                        className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1 hover:underline"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Refund
                      </button>
                    )}
                    {tx.status === 'refunded' && (
                      <span className="text-xs text-purple-500 font-medium">Refunded</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-12 text-center">
              <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500">No transactions yet</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
              <p className="text-xs text-gray-500">
                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, transactions.length)} of{' '}
                {transactions.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-gray-600 font-medium">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </>)}
      </div>

      {/* Refund Modal */}
      {showRefundModal && selectedTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Process Refund</h3>
                <p className="text-xs text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Service</span>
                <span className="font-medium text-gray-900">
                  {selectedTx.bookings?.service_name || 'Payment'}
                </span>
              </div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-500">Amount</span>
                <span className="font-bold text-red-600">
                  ${parseFloat(selectedTx.amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Booking</span>
                <span className="text-gray-700">{selectedTx.bookings?.booking_number || '—'}</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
              <select
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
              >
                <option value="">Select a reason...</option>
                <option value="requested_by_customer">Requested by customer</option>
                <option value="duplicate">Duplicate charge</option>
                <option value="fraudulent">Fraudulent</option>
                <option value="service_not_delivered">Service not delivered</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowRefundModal(false);
                  setSelectedTx(null);
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleRefund}
                disabled={refundingId === selectedTx.id}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {refundingId === selectedTx.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Process Refund'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
