'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import {
  DollarSign, Send, Clock, CheckCircle, AlertTriangle,
  ChevronDown, ChevronUp, X, Loader2, Search, ArrowLeft
} from 'lucide-react';
import { payoutsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

export default function AdminPayoutsPage() {
  const router = useRouter();
  const { user, profile } = useSelector((state) => state.auth);
  useAdminPermission('payouts');

  const [loading, setLoading] = useState(true);
  const [pros, setPros] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [activeTab, setActiveTab] = useState('pending');
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Record payout modal
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [selectedPro, setSelectedPro] = useState(null);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [payoutReference, setPayoutReference] = useState('');
  const [payoutNotes, setPayoutNotes] = useState('');
  const [payoutSubmitting, setPayoutSubmitting] = useState(false);

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      router.push('/');
      return;
    }
    loadPendingPayouts();
  }, [user, profile]);

  const loadPendingPayouts = async () => {
    try {
      const res = await payoutsAPI.getPendingPayouts();
      setPros(res.data?.data?.pros || []);
      setTotalPending(res.data?.data?.totalPendingBalance || 0);
    } catch (err) {
      toast.error('Failed to load payout data');
    } finally {
      setLoading(false);
    }
  };

  const loadPayoutHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await payoutsAPI.getPayoutHistory();
      setPayoutHistory(res.data?.data?.payouts || []);
    } catch (err) {
      toast.error('Failed to load payout history');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'history' && payoutHistory.length === 0) {
      loadPayoutHistory();
    }
  };

  const openPayoutModal = (pro) => {
    setSelectedPro(pro);
    setPayoutAmount(pro.pendingBalance.toFixed(2));
    setPayoutReference('');
    setPayoutNotes('');
    setShowPayoutModal(true);
  };

  const handleRecordPayout = async () => {
    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Enter a valid payout amount');
      return;
    }
    setPayoutSubmitting(true);
    try {
      await payoutsAPI.recordPayout({
        pro_profile_id: selectedPro.proProfileId,
        amount: parseFloat(payoutAmount),
        payout_reference: payoutReference.trim() || undefined,
        notes: payoutNotes.trim() || undefined,
      });
      toast.success(`Payout of $${parseFloat(payoutAmount).toFixed(2)} recorded for ${selectedPro.businessName || selectedPro.fullName}`);
      setShowPayoutModal(false);
      loadPendingPayouts();
      if (activeTab === 'history') loadPayoutHistory();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to record payout');
    } finally {
      setPayoutSubmitting(false);
    }
  };

  const filteredPros = pros.filter(p => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (p.businessName || '').toLowerCase().includes(q)
      || (p.fullName || '').toLowerCase().includes(q)
      || (p.email || '').toLowerCase().includes(q);
  });

  const etransferPros = filteredPros.filter(p => p.payoutMethod === 'e_transfer' || !p.payoutMethod);
  const stripePros = filteredPros.filter(p => p.payoutMethod === 'stripe_connect');

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push('/admin')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to Admin
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Pro Payouts</h1>
            <p className="text-sm text-gray-500 mt-1">Manage earnings and send payouts to pros</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Pending Balance</p>
                <p className="text-xl font-bold text-gray-900">${totalPending.toFixed(2)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">e-Transfer Pros</p>
                <p className="text-xl font-bold text-gray-900">{etransferPros.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Stripe Connect Pros</p>
                <p className="text-xl font-bold text-gray-900">{stripePros.length}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          <button
            onClick={() => handleTabChange('pending')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'pending' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Pending Payouts
          </button>
          <button
            onClick={() => handleTabChange('history')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'history' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Payout History
          </button>
        </div>

        {/* Search */}
        {activeTab === 'pending' && (
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search pros..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
            />
          </div>
        )}

        {/* Pending Payouts Tab */}
        {activeTab === 'pending' && (
          <div className="space-y-3">
            {filteredPros.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No pending payouts</p>
                <p className="text-sm text-gray-400 mt-1">Pro earnings will appear here when jobs are completed.</p>
              </div>
            ) : (
              filteredPros.map(pro => (
                <div key={pro.proProfileId} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                        {(pro.fullName || pro.businessName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{pro.businessName || pro.fullName}</p>
                        <p className="text-xs text-gray-500">{pro.fullName} &middot; {pro.email}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {pro.payoutMethod === 'stripe_connect' ? (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
                              Stripe Connect
                            </span>
                          ) : (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                              e-Transfer
                            </span>
                          )}
                          {pro.etransferEmail && pro.payoutMethod !== 'stripe_connect' && (
                            <span className="text-xs text-gray-400">{pro.etransferEmail}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-4">
                      <div>
                        <p className="text-xs text-gray-400">Total Earned</p>
                        <p className="text-sm font-semibold text-gray-700">${pro.totalEarned.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Paid Out</p>
                        <p className="text-sm font-semibold text-gray-700">${pro.totalPaidOut.toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Pending</p>
                        <p className={`text-sm font-bold ${pro.pendingBalance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                          ${pro.pendingBalance.toFixed(2)}
                        </p>
                      </div>
                      {pro.pendingBalance > 0 && pro.payoutMethod !== 'stripe_connect' && (
                        <button
                          onClick={() => openPayoutModal(pro)}
                          className="ml-2 px-4 py-2 bg-[#0E7480] text-white text-xs font-semibold rounded-lg hover:bg-[#0c6670] transition-colors"
                        >
                          Record Payout
                        </button>
                      )}
                      {pro.pendingBalance > 0 && pro.payoutMethod === 'stripe_connect' && (
                        <span className="ml-2 text-xs text-green-600 font-medium">Auto-paid</span>
                      )}
                    </div>
                  </div>
                  {pro.lastPayout && (
                    <p className="text-xs text-gray-400 mt-2">
                      Last payout: {new Date(pro.lastPayout).toLocaleDateString('en-CA')}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* Payout History Tab */}
        {activeTab === 'history' && (
          <div>
            {historyLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
              </div>
            ) : payoutHistory.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No payout history yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Pro</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Amount</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Method</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Reference</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Date</th>
                      <th className="text-left text-xs font-semibold text-gray-500 px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payoutHistory.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <p className="text-sm font-medium text-gray-900">
                            {p.pro_profiles?.business_name || p.pro_profiles?.profiles?.full_name || '—'}
                          </p>
                          <p className="text-xs text-gray-400">{p.pro_profiles?.profiles?.email}</p>
                        </td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900">
                          ${parseFloat(p.amount).toFixed(2)}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.payout_method === 'stripe_transfer'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {p.payout_method === 'stripe_transfer' ? 'Stripe' : 'e-Transfer'}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-xs text-gray-500">{p.payout_reference || '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-500">
                          {p.paid_at ? new Date(p.paid_at).toLocaleDateString('en-CA') : '—'}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Record Payout Modal */}
      {showPayoutModal && selectedPro && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Record Payout</h3>
              <button onClick={() => setShowPayoutModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-gray-900">{selectedPro.businessName || selectedPro.fullName}</p>
              <p className="text-xs text-gray-500">{selectedPro.email}</p>
              {selectedPro.etransferEmail && (
                <p className="text-xs text-blue-600 mt-1">e-Transfer to: {selectedPro.etransferEmail}</p>
              )}
              <p className="text-sm font-bold text-amber-600 mt-2">
                Pending Balance: ${selectedPro.pendingBalance.toFixed(2)}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payout Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selectedPro.pendingBalance}
                    value={payoutAmount}
                    onChange={e => setPayoutAmount(e.target.value)}
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  e-Transfer Confirmation # <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <input
                  type="text"
                  value={payoutReference}
                  onChange={e => setPayoutReference(e.target.value)}
                  placeholder="e.g. ET-12345678"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Notes <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  placeholder="Any notes about this payout..."
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none resize-none"
                />
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4 mb-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  Make sure you've already sent the Interac e-Transfer to <strong>{selectedPro.etransferEmail || selectedPro.email}</strong> before
                  recording this payout. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowPayoutModal(false)}
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleRecordPayout}
                disabled={payoutSubmitting || !payoutAmount || parseFloat(payoutAmount) <= 0}
                className="flex-1 px-4 py-2.5 bg-[#0E7480] text-white rounded-lg text-sm font-semibold hover:bg-[#0c6670] transition-colors disabled:opacity-50"
              >
                {payoutSubmitting ? 'Recording...' : `Record $${parseFloat(payoutAmount || 0).toFixed(2)} Payout`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
