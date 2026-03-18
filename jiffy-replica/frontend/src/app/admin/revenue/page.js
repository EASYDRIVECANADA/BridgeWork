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
  Download,
  X,
} from 'lucide-react';
import { generateInvoicePDF } from '@/utils/generateInvoicePDF';

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
  const [quoteInvoices, setQuoteInvoices] = useState([]); // Free quote bookings as invoices
  const [qiLoading, setQiLoading] = useState(false);
  const [qiSubTab, setQiSubTab] = useState('quotes');
  const [qiPage, setQiPage] = useState(0);
  const QI_PAGE_SIZE = 15;
  const [invoiceFilter, setInvoiceFilter] = useState('all'); // 'all', 'pending', 'paid'
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [downloadingPdfId, setDownloadingPdfId] = useState(null);
  const [selectedQuoteInvoice, setSelectedQuoteInvoice] = useState(null);
  const [showQuoteInvoiceModal, setShowQuoteInvoiceModal] = useState(false);
  
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
      const [qRes, iRes, qiRes] = await Promise.all([
        quotesAPI.getQuotes({ limit: 200 }),
        quotesAPI.getInvoices({ limit: 200 }),
        quotesAPI.getQuoteInvoices({ limit: 200 }),
      ]);
      setAllQuotes(qRes.data?.data?.quotes || []);
      setAllInvoices(iRes.data?.data?.invoices || []);
      setQuoteInvoices(qiRes.data?.data?.invoices || []);
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

  const handleDownloadInvoicePDF = async (invoice, e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDownloadingPdfId(invoice.id);
    try {
      await generateInvoicePDF(invoice);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to generate PDF');
    }
    setDownloadingPdfId(null);
  };

  const openInvoiceModal = (invoice) => {
    setSelectedInvoice(invoice);
    setShowInvoiceModal(true);
  };

  const closeInvoiceModal = () => {
    setSelectedInvoice(null);
    setShowInvoiceModal(false);
  };

  // Filter invoices based on selected filter
  const getFilteredInvoices = () => {
    if (invoiceFilter === 'pending') {
      return allInvoices.filter(inv => ['sent', 'partially_paid', 'overdue', 'converted'].includes(inv.status));
    } else if (invoiceFilter === 'paid') {
      return allInvoices.filter(inv => inv.status === 'paid');
    }
    return allInvoices;
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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6 lg:py-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">Revenue Dashboard</h1>
              <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                Platform revenue overview &middot; {revenue.commission_rate * 100}% commission rate
              </p>
            </div>
          </div>
          <div className="sm:ml-auto flex items-center gap-2 pl-12 sm:pl-0">
            <Shield className="w-4 h-4 text-red-500" />
            <span className="text-xs font-semibold text-red-500 uppercase tracking-wider">Admin Only</span>
          </div>
        </div>

        {/* Tab Switcher - Scrollable on mobile */}
        <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-4 sm:mb-6 lg:mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('revenue')}
            className={`flex-shrink-0 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'revenue'
                ? 'bg-[#0E7480] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">Revenue & Transactions</span>
            <span className="sm:hidden">Revenue</span>
          </button>
          <button
            onClick={() => setActiveTab('pros')}
            className={`flex-shrink-0 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'pros'
                ? 'bg-[#0E7480] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Manage Pros & Commission</span>
            <span className="sm:hidden">Pros</span>
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`flex-shrink-0 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'quotes'
                ? 'bg-[#0E7480] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Invoices & Receipts</span>
            <span className="sm:hidden">Invoices</span>
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`flex-shrink-0 sm:flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === 'tax'
                ? 'bg-[#0E7480] text-white shadow-sm'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span className="hidden sm:inline">Tax Management</span>
            <span className="sm:hidden">Tax</span>
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

              {/* Table Header - Hidden on mobile, shown on larger screens */}
              <div className="hidden md:grid grid-cols-12 gap-3 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                  <div key={pro.id} className="md:grid md:grid-cols-12 gap-3 px-4 sm:px-6 py-4 border-b border-gray-50 hover:bg-gray-50 transition-colors md:items-center">
                    {/* Mobile: Card layout */}
                    <div className="md:hidden space-y-3 mb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{pro.business_name || 'Unnamed'}</p>
                          <p className="text-xs text-gray-400">{pro.profiles?.full_name || pro.profiles?.email || '—'}</p>
                          <p className="text-xs text-gray-500 mt-1">{pro.profiles?.city || '—'}{pro.profiles?.state ? `, ${pro.profiles.state}` : ''}</p>
                        </div>
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
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                          <span className="font-medium text-gray-700">{pro.rating || '0'}</span>
                          <span className="text-xs text-gray-400">({pro.total_reviews || 0})</span>
                        </div>
                        <span className="text-gray-300">|</span>
                        <span className="text-gray-600">{pro.completed_jobs || 0} jobs</span>
                        <span className="text-gray-300">|</span>
                        <span className={`font-semibold ${pro.commission_rate != null ? 'text-[#0E7480]' : 'text-gray-600'}`}>
                          {pro.commission_rate != null ? `${(pro.commission_rate * 100).toFixed(0)}%` : '15%'} comm.
                        </span>
                      </div>
                    </div>
                    {/* Desktop: Grid layout */}
                    <div className="hidden md:block col-span-3">
                      <p className="text-sm font-medium text-gray-900 truncate">{pro.business_name || 'Unnamed'}</p>
                      <p className="text-xs text-gray-400">{pro.profiles?.full_name || pro.profiles?.email || '—'}</p>
                    </div>
                    <div className="hidden md:block col-span-2">
                      <p className="text-sm text-gray-600">{pro.profiles?.city || '—'}{pro.profiles?.state ? `, ${pro.profiles.state}` : ''}</p>
                    </div>
                    <div className="hidden md:block col-span-1 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
                        <span className="text-sm font-medium text-gray-700">{pro.rating || '0'}</span>
                      </div>
                      <p className="text-xs text-gray-400">{pro.total_reviews || 0} reviews</p>
                    </div>
                    <div className="hidden md:block col-span-1 text-center">
                      <p className="text-sm font-medium text-gray-700">{pro.completed_jobs || 0}</p>
                      <p className="text-xs text-gray-400">completed</p>
                    </div>
                    <div className="hidden md:block col-span-1 text-center">
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
                    <div className="hidden md:block col-span-2 text-center">
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
                    <div className="col-span-2 flex items-center justify-end md:justify-center gap-2">
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
              <button
                onClick={() => { setQiSubTab('quote-invoices'); setQiPage(0); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  qiSubTab === 'quote-invoices' ? 'bg-purple-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                }`}
              >
                Free Quote Jobs ({quoteInvoices.length})
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
            ) : qiSubTab === 'invoices' ? (
              <div>
                {/* Invoice Filter Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setInvoiceFilter('all'); setQiPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      invoiceFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    All ({allInvoices.length})
                  </button>
                  <button
                    onClick={() => { setInvoiceFilter('pending'); setQiPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      invoiceFilter === 'pending' ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Pending ({allInvoices.filter(inv => ['sent', 'partially_paid', 'overdue', 'converted'].includes(inv.status)).length})
                  </button>
                  <button
                    onClick={() => { setInvoiceFilter('paid'); setQiPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      invoiceFilter === 'paid' ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Receipts ({allInvoices.filter(inv => inv.status === 'paid').length})
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">
                      {invoiceFilter === 'paid' ? 'Receipts (Paid Invoices)' : invoiceFilter === 'pending' ? 'Pending Invoices' : 'All Invoices'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {invoiceFilter === 'paid' ? 'Completed payments and receipts' : invoiceFilter === 'pending' ? 'Invoices awaiting payment' : 'Platform-wide invoice visibility across all pros'}
                    </p>
                  </div>
                  <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">#</div>
                    <div className="col-span-2">Title</div>
                    <div className="col-span-2">Pro</div>
                    <div className="col-span-2">Customer</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-2 text-center">Actions</div>
                  </div>
                  {(() => {
                    const filteredInvoices = getFilteredInvoices();
                    const totalIPages = Math.ceil(filteredInvoices.length / QI_PAGE_SIZE);
                    const paged = filteredInvoices.slice(qiPage * QI_PAGE_SIZE, (qiPage + 1) * QI_PAGE_SIZE);
                    return (
                      <>
                        {paged.length > 0 ? paged.map((inv) => (
                          <div key={inv.id} className="grid grid-cols-12 gap-2 px-6 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center text-sm">
                            <div className="col-span-2 font-mono text-xs text-gray-400 truncate">{inv.invoice_number}</div>
                            <div className="col-span-2 font-medium text-gray-900 truncate">{inv.title}</div>
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
                            <div className="col-span-2 flex items-center justify-center gap-1">
                              <button
                                onClick={() => openInvoiceModal(inv)}
                                className="p-1.5 text-gray-500 hover:text-[#0E7480] hover:bg-gray-100 rounded-lg transition-colors"
                                title="View Invoice"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => handleDownloadInvoicePDF(inv, e)}
                                disabled={downloadingPdfId === inv.id}
                                className="p-1.5 text-gray-500 hover:text-[#0E7480] hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                                title="Download PDF"
                              >
                                {downloadingPdfId === inv.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Download className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          </div>
                        )) : (
                          <div className="px-6 py-12 text-center">
                            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">
                              {invoiceFilter === 'paid' ? 'No paid invoices yet' : invoiceFilter === 'pending' ? 'No pending invoices' : 'No invoices yet'}
                            </p>
                          </div>
                        )}
                        {totalIPages > 1 && (
                          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs text-gray-500">Showing {qiPage * QI_PAGE_SIZE + 1}–{Math.min((qiPage + 1) * QI_PAGE_SIZE, filteredInvoices.length)} of {filteredInvoices.length}</p>
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
              </div>
            ) : qiSubTab === 'quote-invoices' ? (
              <div>
                {/* Quote Invoices Filter Tabs */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => { setInvoiceFilter('all'); setQiPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      invoiceFilter === 'all' ? 'bg-gray-800 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    All ({quoteInvoices.length})
                  </button>
                  <button
                    onClick={() => { setInvoiceFilter('pending'); setQiPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      invoiceFilter === 'pending' ? 'bg-orange-500 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Pending ({quoteInvoices.filter(inv => ['pending', 'held', 'awaiting_approval'].includes(inv.status)).length})
                  </button>
                  <button
                    onClick={() => { setInvoiceFilter('paid'); setQiPage(0); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      invoiceFilter === 'paid' ? 'bg-green-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Completed ({quoteInvoices.filter(inv => inv.status === 'paid').length})
                  </button>
                </div>

                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-bold text-gray-900">
                      {invoiceFilter === 'paid' ? 'Completed Free Quote Jobs' : invoiceFilter === 'pending' ? 'Pending Free Quote Jobs' : 'All Free Quote Jobs'}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Bookings from the Free Quote flow with submitted quotations
                    </p>
                  </div>
                  <div className="grid grid-cols-12 gap-2 px-6 py-3 bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <div className="col-span-2">#</div>
                    <div className="col-span-2">Service</div>
                    <div className="col-span-2">Pro</div>
                    <div className="col-span-2">Customer</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-2 text-center">Actions</div>
                  </div>
                  {(() => {
                    const filteredQI = invoiceFilter === 'pending' 
                      ? quoteInvoices.filter(inv => ['pending', 'held', 'awaiting_approval'].includes(inv.status))
                      : invoiceFilter === 'paid'
                      ? quoteInvoices.filter(inv => inv.status === 'paid')
                      : quoteInvoices;
                    const totalQIPages = Math.ceil(filteredQI.length / QI_PAGE_SIZE);
                    const paged = filteredQI.slice(qiPage * QI_PAGE_SIZE, (qiPage + 1) * QI_PAGE_SIZE);
                    return (
                      <>
                        {paged.length > 0 ? paged.map((inv) => (
                          <div key={inv.id} className="grid grid-cols-12 gap-2 px-6 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors items-center text-sm">
                            <div className="col-span-2 font-mono text-xs text-gray-400 truncate">{inv.invoice_number}</div>
                            <div className="col-span-2 font-medium text-gray-900 truncate">{inv.service_name}</div>
                            <div className="col-span-2 text-gray-600 truncate">{inv.pro?.business_name || inv.pro?.profiles?.full_name || '—'}</div>
                            <div className="col-span-2 text-gray-600 truncate">{inv.customer?.full_name || '—'}</div>
                            <div className="col-span-1">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                inv.status === 'paid' ? 'bg-green-50 text-green-600' :
                                inv.status === 'held' ? 'bg-blue-50 text-blue-600' :
                                inv.status === 'awaiting_approval' ? 'bg-yellow-50 text-yellow-600' :
                                inv.status === 'pending' ? 'bg-orange-50 text-orange-600' :
                                'bg-gray-100 text-gray-600'
                              }`}>{inv.status?.replace('_', ' ')}</span>
                            </div>
                            <div className="col-span-1 text-right font-semibold">${parseFloat(inv.total || 0).toFixed(2)}</div>
                            <div className="col-span-2 flex items-center justify-center gap-1">
                              <button
                                onClick={() => { setSelectedQuoteInvoice(inv); setShowQuoteInvoiceModal(true); }}
                                className="p-1.5 text-gray-500 hover:text-[#0E7480] hover:bg-gray-100 rounded-lg transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        )) : (
                          <div className="px-6 py-12 text-center">
                            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                            <p className="text-sm text-gray-500">
                              {invoiceFilter === 'paid' ? 'No completed jobs yet' : invoiceFilter === 'pending' ? 'No pending jobs' : 'No free quote jobs yet'}
                            </p>
                          </div>
                        )}
                        {totalQIPages > 1 && (
                          <div className="flex items-center justify-between px-6 py-4 bg-gray-50 border-t border-gray-100">
                            <p className="text-xs text-gray-500">Showing {qiPage * QI_PAGE_SIZE + 1}–{Math.min((qiPage + 1) * QI_PAGE_SIZE, filteredQI.length)} of {filteredQI.length}</p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => setQiPage(Math.max(0, qiPage - 1))} disabled={qiPage === 0} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                              <span className="text-sm text-gray-600 font-medium">{qiPage + 1} / {totalQIPages}</span>
                              <button onClick={() => setQiPage(Math.min(totalQIPages - 1, qiPage + 1))} disabled={qiPage >= totalQIPages - 1} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-white disabled:opacity-40 transition-colors"><ChevronRight className="w-4 h-4" /></button>
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            ) : null}
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

      {/* Invoice Detail Modal */}
      {showInvoiceModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedInvoice.title}</h3>
                <p className="text-sm text-gray-500 font-mono">{selectedInvoice.invoice_number}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  selectedInvoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                  selectedInvoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                  selectedInvoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                  selectedInvoice.status === 'partially_paid' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {selectedInvoice.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </span>
                <button
                  onClick={closeInvoiceModal}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* From/To Section */}
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">From (Pro)</p>
                  <p className="font-semibold text-gray-900">{selectedInvoice.pro_profiles?.business_name || selectedInvoice.pro_profiles?.profiles?.full_name || '—'}</p>
                  {selectedInvoice.pro_profiles?.profiles?.email && (
                    <p className="text-sm text-gray-500">{selectedInvoice.pro_profiles.profiles.email}</p>
                  )}
                  {selectedInvoice.pro_profiles?.profiles?.phone && (
                    <p className="text-sm text-gray-500">{selectedInvoice.pro_profiles.profiles.phone}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Bill To (Customer)</p>
                  <p className="font-semibold text-gray-900">{selectedInvoice.customer?.full_name || '—'}</p>
                  {selectedInvoice.customer?.email && (
                    <p className="text-sm text-gray-500">{selectedInvoice.customer.email}</p>
                  )}
                  {selectedInvoice.customer?.phone && (
                    <p className="text-sm text-gray-500">{selectedInvoice.customer.phone}</p>
                  )}
                  {selectedInvoice.customer?.address && (
                    <p className="text-sm text-gray-500">
                      {selectedInvoice.customer.address}, {selectedInvoice.customer.city} {selectedInvoice.customer.state} {selectedInvoice.customer.zip_code}
                    </p>
                  )}
                </div>
              </div>

              {/* Dates */}
              <div className="bg-gray-50 rounded-lg p-4 grid grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Issue Date</p>
                  <p className="font-medium">{selectedInvoice.issue_date ? new Date(selectedInvoice.issue_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Due Date</p>
                  <p className="font-medium">{selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                </div>
                {selectedInvoice.sent_at && (
                  <div>
                    <p className="text-gray-500">Sent</p>
                    <p className="font-medium">{new Date(selectedInvoice.sent_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                )}
                {selectedInvoice.paid_at && (
                  <div>
                    <p className="text-green-600">Paid</p>
                    <p className="font-medium text-green-700">{new Date(selectedInvoice.paid_at).toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {selectedInvoice.description && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Description</p>
                  <p className="text-sm text-gray-700">{selectedInvoice.description}</p>
                </div>
              )}

              {/* Line Items */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Line Items</p>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr className="text-left text-gray-500">
                        <th className="px-4 py-2 font-medium">#</th>
                        <th className="px-4 py-2 font-medium">Description</th>
                        <th className="px-4 py-2 font-medium text-right">Qty</th>
                        <th className="px-4 py-2 font-medium">Unit</th>
                        <th className="px-4 py-2 font-medium text-right">Price</th>
                        <th className="px-4 py-2 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedInvoice.invoice_items || []).map((item, idx) => (
                        <tr key={item.id || idx} className="border-t">
                          <td className="px-4 py-2 text-gray-400">{idx + 1}</td>
                          <td className="px-4 py-2 text-gray-900">{item.description}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-gray-500">{item.unit || 'each'}</td>
                          <td className="px-4 py-2 text-right">${parseFloat(item.unit_price || 0).toFixed(2)}</td>
                          <td className="px-4 py-2 text-right font-medium">${parseFloat(item.amount || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Subtotal</span>
                    <span className="font-medium">${parseFloat(selectedInvoice.subtotal || 0).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedInvoice.discount_amount) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Discount</span>
                      <span className="font-medium text-green-600">-${parseFloat(selectedInvoice.discount_amount).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tax ({((parseFloat(selectedInvoice.tax_rate) || 0) * 100).toFixed(0)}%)</span>
                    <span className="font-medium">${parseFloat(selectedInvoice.tax_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 text-base font-bold">
                    <span>Total</span>
                    <span>${parseFloat(selectedInvoice.total || 0).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedInvoice.amount_paid) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Amount Paid</span>
                      <span className="font-medium">${parseFloat(selectedInvoice.amount_paid).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(selectedInvoice.amount_due) > 0 && selectedInvoice.status !== 'paid' && (
                    <div className="flex justify-between text-orange-600 font-bold">
                      <span>Amount Due</span>
                      <span>${parseFloat(selectedInvoice.amount_due).toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Status Banner */}
              {selectedInvoice.status === 'paid' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Paid in Full</p>
                  {selectedInvoice.payment_method && (
                    <p className="text-sm text-green-600">Payment method: {selectedInvoice.payment_method}</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end gap-3">
              <button
                onClick={closeInvoiceModal}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadInvoicePDF(selectedInvoice)}
                disabled={downloadingPdfId === selectedInvoice.id}
                className="px-4 py-2 bg-[#0E7480] text-white rounded-lg text-sm font-medium hover:bg-[#0a5a63] transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {downloadingPdfId === selectedInvoice.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quote Invoice Detail Modal */}
      {showQuoteInvoiceModal && selectedQuoteInvoice && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowQuoteInvoiceModal(false)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Free Quote Job Details</h2>
                <p className="text-sm text-gray-500">{selectedQuoteInvoice.invoice_number}</p>
              </div>
              <button onClick={() => setShowQuoteInvoiceModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  selectedQuoteInvoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                  selectedQuoteInvoice.status === 'held' ? 'bg-blue-100 text-blue-700' :
                  selectedQuoteInvoice.status === 'awaiting_approval' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {selectedQuoteInvoice.status?.replace('_', ' ').toUpperCase()}
                </span>
                {selectedQuoteInvoice.proof_submitted_at && (
                  <span className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Proof Submitted
                  </span>
                )}
              </div>

              {/* Service Info */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{selectedQuoteInvoice.service_name}</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-500">Scheduled:</span>
                    <p className="font-medium">{selectedQuoteInvoice.scheduled_date ? new Date(selectedQuoteInvoice.scheduled_date).toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Time:</span>
                    <p className="font-medium">{selectedQuoteInvoice.scheduled_time || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500">Location:</span>
                    <p className="font-medium">{[selectedQuoteInvoice.address, selectedQuoteInvoice.city, selectedQuoteInvoice.state, selectedQuoteInvoice.postal_code].filter(Boolean).join(', ') || '—'}</p>
                  </div>
                  {selectedQuoteInvoice.special_instructions && (
                    <div className="col-span-2">
                      <span className="text-gray-500">Special Instructions:</span>
                      <p className="font-medium">{selectedQuoteInvoice.special_instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Customer & Pro Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4">
                  <p className="text-xs text-blue-600 font-medium mb-2">CUSTOMER</p>
                  <p className="font-semibold text-gray-900">{selectedQuoteInvoice.customer?.full_name || '—'}</p>
                  <p className="text-sm text-gray-600">{selectedQuoteInvoice.customer?.email || '—'}</p>
                  <p className="text-sm text-gray-600">{selectedQuoteInvoice.customer?.phone || '—'}</p>
                </div>
                <div className="bg-green-50 rounded-xl p-4">
                  <p className="text-xs text-green-600 font-medium mb-2">SERVICE PRO</p>
                  <p className="font-semibold text-gray-900">{selectedQuoteInvoice.pro?.business_name || selectedQuoteInvoice.pro?.profiles?.full_name || '—'}</p>
                  <p className="text-sm text-gray-600">{selectedQuoteInvoice.pro?.profiles?.email || '—'}</p>
                  <p className="text-sm text-gray-600">{selectedQuoteInvoice.pro?.profiles?.phone || '—'}</p>
                </div>
              </div>

              {/* Quotation Details */}
              <div className="border rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b">
                  <h4 className="font-semibold text-gray-900">Quotation Breakdown</h4>
                </div>
                <div className="p-4 space-y-3">
                  {/* Work Price */}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Work Price (Labor)</span>
                    <span className="font-medium">${parseFloat(selectedQuoteInvoice.quotation?.work_price || 0).toFixed(2)}</span>
                  </div>

                  {/* Materials List */}
                  {selectedQuoteInvoice.quotation?.materials_included && selectedQuoteInvoice.quotation?.materials_list?.length > 0 && (
                    <div className="border-t pt-3">
                      <p className="text-sm font-medium text-gray-700 mb-2">Materials:</p>
                      <div className="bg-gray-50 rounded-lg overflow-hidden">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100">
                            <tr>
                              <th className="text-left px-3 py-2 font-medium text-gray-600">Item</th>
                              <th className="text-right px-3 py-2 font-medium text-gray-600">Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedQuoteInvoice.quotation.materials_list.map((mat, idx) => (
                              <tr key={idx} className="border-t border-gray-100">
                                <td className="px-3 py-2 text-gray-800">{mat.name || `Material ${idx + 1}`}</td>
                                <td className="px-3 py-2 text-right font-medium">${parseFloat(mat.price || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="bg-gray-100">
                            <tr>
                              <td className="px-3 py-2 font-medium text-gray-700">Materials Total</td>
                              <td className="px-3 py-2 text-right font-bold">${parseFloat(selectedQuoteInvoice.quotation.materials_total || 0).toFixed(2)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Totals */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="font-medium">${parseFloat(selectedQuoteInvoice.subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax ({((selectedQuoteInvoice.tax_rate || 0) * 100).toFixed(0)}%)</span>
                      <span className="font-medium">${parseFloat(selectedQuoteInvoice.tax_amount || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold border-t pt-2">
                      <span>Total</span>
                      <span className="text-[#0E7480]">${parseFloat(selectedQuoteInvoice.total || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Additional Info */}
              {(selectedQuoteInvoice.quotation?.estimated_duration || selectedQuoteInvoice.quotation?.warranty_info || selectedQuoteInvoice.quotation?.description || selectedQuoteInvoice.quotation?.notes) && (
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <h4 className="font-semibold text-gray-900">Additional Information</h4>
                  {selectedQuoteInvoice.quotation?.estimated_duration && (
                    <div className="text-sm">
                      <span className="text-gray-500">Estimated Duration:</span>
                      <p className="font-medium">
                        {selectedQuoteInvoice.quotation.estimated_duration} {selectedQuoteInvoice.quotation.duration_unit || 'minutes'}
                      </p>
                    </div>
                  )}
                  {selectedQuoteInvoice.quotation?.warranty_info && (
                    <div className="text-sm">
                      <span className="text-gray-500">Warranty:</span>
                      <p className="font-medium">{selectedQuoteInvoice.quotation.warranty_info}</p>
                    </div>
                  )}
                  {selectedQuoteInvoice.quotation?.description && (
                    <div className="text-sm">
                      <span className="text-gray-500">Description:</span>
                      <p className="font-medium">{selectedQuoteInvoice.quotation.description}</p>
                    </div>
                  )}
                  {selectedQuoteInvoice.quotation?.notes && (
                    <div className="text-sm">
                      <span className="text-gray-500">Notes:</span>
                      <p className="font-medium">{selectedQuoteInvoice.quotation.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Payment Status */}
              {selectedQuoteInvoice.status === 'paid' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Job Completed & Paid</p>
                  {selectedQuoteInvoice.paid_at && (
                    <p className="text-sm text-green-600">Paid on {new Date(selectedQuoteInvoice.paid_at).toLocaleDateString('en-CA')}</p>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowQuoteInvoiceModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
