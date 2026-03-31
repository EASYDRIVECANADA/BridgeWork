'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { useRouter } from 'next/navigation';
import { useAdminPermission } from '@/hooks/useAdminPermission';
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  DollarSign,
  Loader2,
  Mail,
  Search,
  Send,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import { payoutsAPI } from '@/lib/api';
import { toast } from 'react-toastify';

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
  }).format(parseFloat(amount || 0));
}

function formatDateLabel(dateString) {
  if (!dateString) return 'Not scheduled';
  return new Date(dateString).toLocaleDateString('en-CA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateRange(startDate, endDate) {
  if (!startDate) return 'Not scheduled';
  if (!endDate || endDate === startDate) return formatDateLabel(startDate);
  return `${formatDateLabel(startDate)} - ${formatDateLabel(endDate)}`;
}

function getStatusClasses(status) {
  if (status === 'processed' || status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'approved') return 'bg-blue-100 text-blue-700';
  if (status === 'rejected') return 'bg-red-100 text-red-700';
  if (status === 'holiday') return 'bg-red-100 text-red-700';
  if (status === 'event') return 'bg-slate-100 text-slate-700';
  if (status === 'payout') return 'bg-green-100 text-green-700';
  return 'bg-amber-100 text-amber-700';
}

export default function AdminPayoutsPage() {
  const router = useRouter();
  const { user, profile } = useSelector((state) => state.auth);
  useAdminPermission('payouts');

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('requests');
  const [searchQuery, setSearchQuery] = useState('');

  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [totalPending, setTotalPending] = useState(0);
  const [payoutHistory, setPayoutHistory] = useState([]);
  const [withdrawalRequests, setWithdrawalRequests] = useState([]);
  const [requestCounts, setRequestCounts] = useState({ pending: 0, approved: 0, rejected: 0, processed: 0 });
  const [payoutSettings, setPayoutSettings] = useState({ minimumWithdrawalAmount: 50 });
  const [settingsInput, setSettingsInput] = useState('50.00');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [calendarEntries, setCalendarEntries] = useState([]);
  const [nextPayoutDate, setNextPayoutDate] = useState(null);

  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [rejectSubmitting, setRejectSubmitting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processReference, setProcessReference] = useState('');
  const [processNotes, setProcessNotes] = useState('');
  const [processSecurityQuestion, setProcessSecurityQuestion] = useState('');
  const [processSecurityAnswer, setProcessSecurityAnswer] = useState('');
  const [processSendEmail, setProcessSendEmail] = useState(true);
  const [processSubmitting, setProcessSubmitting] = useState(false);

  const [calendarDate, setCalendarDate] = useState('');
  const [calendarEndDate, setCalendarEndDate] = useState('');
  const [calendarType, setCalendarType] = useState('payout');
  const [calendarTitle, setCalendarTitle] = useState('');
  const [calendarNotes, setCalendarNotes] = useState('');
  const [calendarSubmitting, setCalendarSubmitting] = useState(false);
  const [calendarUpdatingId, setCalendarUpdatingId] = useState(null);

  const loadDashboardData = async () => {
    try {
      const [pendingRes, historyRes, withdrawalsRes, settingsRes, calendarRes] = await Promise.all([
        payoutsAPI.getPendingPayouts(),
        payoutsAPI.getPayoutHistory(),
        payoutsAPI.getWithdrawalRequests(),
        payoutsAPI.getPayoutSettings(),
        payoutsAPI.getPayoutCalendar(),
      ]);

      setPendingPayouts(pendingRes.data?.data?.pendingPayouts || []);
      setTotalPending(parseFloat(pendingRes.data?.data?.totalPendingAmount || 0));
      setPayoutHistory(historyRes.data?.data?.payouts || []);
      setWithdrawalRequests(withdrawalsRes.data?.data?.withdrawals || []);
      setRequestCounts(withdrawalsRes.data?.data?.counts || { pending: 0, approved: 0, rejected: 0, processed: 0 });

      const settings = settingsRes.data?.data?.settings || { minimumWithdrawalAmount: 50 };
      setPayoutSettings(settings);
      setSettingsInput(parseFloat(settings.minimumWithdrawalAmount || 0).toFixed(2));

      setCalendarEntries(calendarRes.data?.data?.entries || []);
      setNextPayoutDate(calendarRes.data?.data?.nextPayoutDate || settingsRes.data?.data?.nextPayoutDate || null);
    } catch (err) {
      toast.error('Failed to load payout dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || profile?.role !== 'admin') {
      router.push('/');
      return;
    }
    loadDashboardData();
  }, [user, profile, router]);

  const filteredPendingPayouts = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return pendingPayouts;
    return pendingPayouts.filter((request) => {
      const businessName = request.pro_profiles?.business_name || '';
      const fullName = request.pro_profiles?.profiles?.full_name || '';
      const email = request.pro_profiles?.profiles?.email || '';
      const etransferEmail = request.pro_profiles?.etransfer_email || '';
      return [businessName, fullName, email, etransferEmail]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query));
    });
  }, [pendingPayouts, searchQuery]);

  const filteredRequests = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const visibleRequests = withdrawalRequests.filter((request) => request.status !== 'approved');
    if (!query) return visibleRequests;
    return visibleRequests.filter((request) => {
      const businessName = request.pro_profiles?.business_name || '';
      const fullName = request.pro_profiles?.profiles?.full_name || '';
      const email = request.pro_profiles?.profiles?.email || '';
      return [businessName, fullName, email].some((value) => value.toLowerCase().includes(query));
    });
  }, [withdrawalRequests, searchQuery]);

  const handleApproveRequest = async (requestId) => {
    try {
      await payoutsAPI.approveWithdrawalRequest(requestId, {});
      toast.success('Withdrawal request approved.');
      await loadDashboardData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to approve withdrawal request');
    }
  };

  const openRejectModal = (request) => {
    setSelectedRequest(request);
    setRejectNotes('');
    setShowRejectModal(true);
  };

  const handleRejectRequest = async () => {
    if (!rejectNotes.trim()) {
      toast.error('Enter a rejection reason.');
      return;
    }

    setRejectSubmitting(true);
    try {
      await payoutsAPI.rejectWithdrawalRequest(selectedRequest.id, { admin_notes: rejectNotes.trim() });
      toast.success('Withdrawal request rejected.');
      setShowRejectModal(false);
      await loadDashboardData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to reject withdrawal request');
    } finally {
      setRejectSubmitting(false);
    }
  };

  const openProcessModal = (request) => {
    setSelectedRequest(request);
    setProcessReference('');
    setProcessNotes(request.admin_notes || '');
    setProcessSecurityQuestion('');
    setProcessSecurityAnswer('');
    setProcessSendEmail(true);
    setShowProcessModal(true);
  };

  const handleProcessRequest = async () => {
    if (processSendEmail && (!processSecurityQuestion.trim() || !processSecurityAnswer.trim())) {
      toast.error('Enter the security question and answer or disable the email option.');
      return;
    }

    setProcessSubmitting(true);
    try {
      await payoutsAPI.processWithdrawalRequest(selectedRequest.id, {
        payout_reference: processReference.trim() || undefined,
        notes: processNotes.trim() || undefined,
        security_question: processSecurityQuestion.trim() || undefined,
        security_answer: processSecurityAnswer.trim() || undefined,
        send_email: processSendEmail,
      });
      toast.success('Withdrawal request processed successfully.');
      setShowProcessModal(false);
      await loadDashboardData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to process withdrawal request');
    } finally {
      setProcessSubmitting(false);
    }
  };

  const handleSaveSettings = async () => {
    const amount = parseFloat(settingsInput || 0);
    if (Number.isNaN(amount) || amount < 0) {
      toast.error('Enter a valid quota requirement.');
      return;
    }

    setSettingsSaving(true);
    try {
      await payoutsAPI.updatePayoutSettings({ minimum_withdrawal_amount: amount });
      toast.success('Quota requirement updated.');
      await loadDashboardData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update payout settings');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleCreateCalendarEntry = async () => {
    if (!calendarDate) {
      toast.error('Select a calendar date.');
      return;
    }

    setCalendarSubmitting(true);
    try {
      await payoutsAPI.createPayoutCalendarEntry({
        entry_date: calendarDate,
        end_date: calendarEndDate || calendarDate,
        entry_type: calendarType,
        title: calendarTitle.trim() || undefined,
        notes: calendarNotes.trim() || undefined,
      });
      toast.success('Calendar entry created.');
      setCalendarDate('');
      setCalendarEndDate('');
      setCalendarType('payout');
      setCalendarTitle('');
      setCalendarNotes('');
      await loadDashboardData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to create calendar entry');
    } finally {
      setCalendarSubmitting(false);
    }
  };

  const handleToggleCalendarEntry = async (entry) => {
    setCalendarUpdatingId(entry.id);
    try {
      await payoutsAPI.updatePayoutCalendarEntry(entry.id, { is_active: !entry.is_active });
      await loadDashboardData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update calendar entry');
    } finally {
      setCalendarUpdatingId(null);
    }
  };

  const handleDeleteCalendarEntry = async (entryId) => {
    setCalendarUpdatingId(entryId);
    try {
      await payoutsAPI.deletePayoutCalendarEntry(entryId);
      toast.success('Calendar entry deleted.');
      await loadDashboardData();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete calendar entry');
    } finally {
      setCalendarUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#0E7480]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <button onClick={() => router.push('/admin')} className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2">
              <ArrowLeft className="w-4 h-4" /> Back to Admin
            </button>
            <h1 className="text-2xl font-bold text-gray-900">Pro Payouts</h1>
            <p className="text-sm text-gray-500 mt-1">Manage withdrawal requests, quota requirement, payout calendar, and manual payouts.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending Payout Amount</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalPending)}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Send className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Open Withdrawal Requests</p>
                <p className="text-xl font-bold text-gray-900">{requestCounts.pending}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Next Payout Date</p>
                <p className="text-xl font-bold text-gray-900">{formatDateLabel(nextPayoutDate)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 bg-gray-100 rounded-lg p-1 mb-6 w-fit">
          {[
            ['requests', 'Withdrawal Requests'],
            ['quota', 'Quota Requirement'],
            ['calendar', 'Calendar'],
            ['pending', 'Pending Payouts'],
            ['history', 'Payout History'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {(activeTab === 'requests' || activeTab === 'pending') && (
          <div className="relative mb-4 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search pros..."
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none"
            />
          </div>
        )}

        {activeTab === 'requests' && (
          <div className="space-y-4">
            {filteredRequests.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-sm text-gray-500">
                No withdrawal requests yet.
              </div>
            ) : (
              filteredRequests.map((request) => {
                const businessName = request.pro_profiles?.business_name || request.pro_profiles?.profiles?.full_name || 'Pro';
                const email = request.pro_profiles?.profiles?.email || 'No email';
                return (
                  <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{businessName}</h3>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusClasses(request.status)}`}>
                            {request.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{email}</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4 text-sm">
                          <div>
                            <p className="text-gray-400">Requested amount</p>
                            <p className="font-semibold text-gray-900">{formatCurrency(request.amount)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Requested on</p>
                            <p className="font-semibold text-gray-900">{formatDateLabel(request.created_at)}</p>
                          </div>
                          <div>
                            <p className="text-gray-400">Scheduled payout</p>
                            <p className="font-semibold text-gray-900">{formatDateLabel(request.scheduled_for_date)}</p>
                          </div>
                        </div>
                        {request.notes && <p className="text-sm text-gray-600 mt-3">Pro note: {request.notes}</p>}
                        {request.admin_notes && <p className="text-sm text-gray-500 mt-1">Admin note: {request.admin_notes}</p>}
                        {request.payout_reference && <p className="text-sm text-gray-500 mt-1">Reference: {request.payout_reference}</p>}
                      </div>

                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        {request.status === 'pending' && (
                          <>
                            <button onClick={() => handleApproveRequest(request.id)} className="px-4 py-2 bg-[#0E7480] text-white text-sm font-semibold rounded-lg hover:bg-[#0c6670] transition-colors">
                              Approve
                            </button>
                            <button onClick={() => openRejectModal(request)} className="px-4 py-2 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <>
                            <button onClick={() => openProcessModal(request)} className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors">
                              Process Payout
                            </button>
                            <button onClick={() => openRejectModal(request)} className="px-4 py-2 border border-red-200 text-red-600 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors">
                              Reject
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeTab === 'quota' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 max-w-2xl">
            <div className="flex items-start gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Quota Requirement</h3>
                <p className="text-sm text-gray-500 mt-1">Set the minimum amount a pro must have available before they can submit a withdrawal request.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Withdrawal Amount</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={settingsInput}
                  onChange={(e) => setSettingsInput(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent"
                />
                <p className="text-xs text-gray-400 mt-1">Current live quota requirement: {formatCurrency(payoutSettings.minimumWithdrawalAmount)}</p>
              </div>
              <button
                onClick={handleSaveSettings}
                disabled={settingsSaving}
                className="px-5 py-2.5 bg-[#0E7480] text-white rounded-lg text-sm font-semibold hover:bg-[#0c6670] transition-colors disabled:opacity-50"
              >
                {settingsSaving ? 'Saving...' : 'Save Quota'}
              </button>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Add Calendar Entry</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input type="date" value={calendarDate} onChange={(e) => setCalendarDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input type="date" value={calendarEndDate} min={calendarDate || undefined} onChange={(e) => setCalendarEndDate(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent" />
                  <p className="text-xs text-gray-400 mt-1">Leave blank to create a single-day entry.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entry Type</label>
                  <select value={calendarType} onChange={(e) => setCalendarType(e.target.value)} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent">
                    <option value="payout">Payout Day</option>
                    <option value="holiday">Holiday</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" value={calendarTitle} onChange={(e) => setCalendarTitle(e.target.value)} placeholder="Optional display title" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={calendarNotes} onChange={(e) => setCalendarNotes(e.target.value)} rows={3} placeholder="Optional notes for the team" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0E7480] focus:border-transparent resize-none" />
                </div>
                <button
                  onClick={handleCreateCalendarEntry}
                  disabled={calendarSubmitting}
                  className="px-5 py-2.5 bg-[#0E7480] text-white rounded-lg text-sm font-semibold hover:bg-[#0c6670] transition-colors disabled:opacity-50"
                >
                  {calendarSubmitting ? 'Saving...' : 'Add Entry'}
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Calendar Entries</h3>
                  <p className="text-sm text-gray-500 mt-1">Use payout days, holidays, and events to control the withdrawal schedule.</p>
                </div>
                <span className="text-xs px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold">
                  Next payout: {formatDateLabel(nextPayoutDate)}
                </span>
              </div>

              <div className="space-y-3">
                {calendarEntries.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 px-4 py-10 text-center text-sm text-gray-500">
                    No payout calendar entries yet.
                  </div>
                ) : (
                  calendarEntries.map((entry) => (
                    <div key={entry.id} className="border border-gray-100 rounded-xl px-4 py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{entry.title}</p>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${getStatusClasses(entry.entry_type)}`}>{entry.entry_type}</span>
                          {!entry.is_active && <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-gray-100 text-gray-500">inactive</span>}
                        </div>
                        <p className="text-sm text-gray-500">{formatDateRange(entry.entry_date, entry.end_date)}</p>
                        {entry.notes && <p className="text-sm text-gray-400 mt-1">{entry.notes}</p>}
                      </div>
                      <div className="flex items-center gap-2 md:justify-end">
                        <button
                          onClick={() => handleToggleCalendarEntry(entry)}
                          disabled={calendarUpdatingId === entry.id}
                          className="px-3 py-2 border border-gray-200 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                        >
                          {entry.is_active ? 'Disable' : 'Enable'}
                        </button>
                        <button
                          onClick={() => handleDeleteCalendarEntry(entry.id)}
                          disabled={calendarUpdatingId === entry.id}
                          className="p-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'pending' && (
          <div className="space-y-3">
            {filteredPendingPayouts.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center">
                <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">No pending payouts</p>
                <p className="text-sm text-gray-400 mt-1">Approved withdrawal requests will appear here.</p>
              </div>
            ) : (
              filteredPendingPayouts.map((request) => {
                const businessName = request.pro_profiles?.business_name || request.pro_profiles?.profiles?.full_name || 'Pro';
                const fullName = request.pro_profiles?.profiles?.full_name || 'No name';
                const email = request.pro_profiles?.profiles?.email || 'No email';
                const payoutMethod = request.pro_profiles?.payout_method || 'e_transfer';
                const etransferEmail = request.pro_profiles?.etransfer_email;

                return (
                <div key={request.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                  <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-sm font-bold text-gray-600">
                        {(fullName || businessName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{businessName}</p>
                        <p className="text-xs text-gray-500">{fullName} • {email}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${payoutMethod === 'stripe_connect' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {payoutMethod === 'stripe_connect' ? 'Stripe Connect' : 'e-Transfer'}
                          </span>
                          {etransferEmail && payoutMethod !== 'stripe_connect' && (
                            <span className="text-xs text-gray-400">{etransferEmail}</span>
                          )}
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">approved</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 xl:gap-6 xl:items-center">
                      <div>
                        <p className="text-xs text-gray-400">Requested Amount</p>
                        <p className="text-sm font-semibold text-gray-700">{formatCurrency(request.amount)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Requested On</p>
                        <p className="text-sm font-semibold text-gray-700">{formatDateLabel(request.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Scheduled Payout</p>
                        <p className="text-sm font-bold text-amber-600">{formatDateLabel(request.scheduled_for_date)}</p>
                      </div>
                      <div className="flex items-center justify-start xl:justify-end">
                        <div className="flex flex-wrap gap-2 xl:justify-end">
                          <button onClick={() => openProcessModal(request)} className="px-4 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
                            Process Payout
                          </button>
                          <button onClick={() => openRejectModal(request)} className="px-4 py-2 border border-red-200 text-red-600 text-xs font-semibold rounded-lg hover:bg-red-50 transition-colors">
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  {(request.notes || request.admin_notes) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 text-sm text-gray-500 space-y-1">
                      {request.notes && <p>Pro note: {request.notes}</p>}
                      {request.admin_notes && <p>Admin note: {request.admin_notes}</p>}
                    </div>
                  )}
                </div>
              );})
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {payoutHistory.length === 0 ? (
              <div className="p-12 text-center text-sm text-gray-500">No payout history yet.</div>
            ) : (
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
                  {payoutHistory.map((payout) => (
                    <tr key={payout.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900">{payout.pro_profiles?.business_name || payout.pro_profiles?.profiles?.full_name || '—'}</p>
                        <p className="text-xs text-gray-400">{payout.pro_profiles?.profiles?.email}</p>
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{formatCurrency(payout.amount)}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{payout.payout_method}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{payout.payout_reference || '—'}</td>
                      <td className="px-5 py-3 text-xs text-gray-500">{formatDateLabel(payout.paid_at)}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusClasses(payout.status)}`}>{payout.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {showRejectModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Reject Withdrawal Request</h3>
              <button onClick={() => setShowRejectModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Enter the reason for rejecting this withdrawal request. The pro will see this message.</p>
            <textarea value={rejectNotes} onChange={(e) => setRejectNotes(e.target.value)} rows={4} className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none resize-none" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowRejectModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleRejectRequest} disabled={rejectSubmitting} className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition-colors disabled:opacity-50">
                {rejectSubmitting ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showProcessModal && selectedRequest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Process Withdrawal Request</h3>
              <button onClick={() => setShowProcessModal(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-sm font-semibold text-gray-900">{selectedRequest.pro_profiles?.business_name || selectedRequest.pro_profiles?.profiles?.full_name || 'Pro'}</p>
              <p className="text-xs text-gray-500">Amount: {formatCurrency(selectedRequest.amount)}</p>
              <p className="text-xs text-blue-600 mt-1">e-Transfer to: {selectedRequest.pro_profiles?.etransfer_email || selectedRequest.pro_profiles?.profiles?.email || 'N/A'}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Payout Reference</label>
                <input type="text" value={processReference} onChange={(e) => setProcessReference(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Admin Notes</label>
                <textarea value={processNotes} onChange={(e) => setProcessNotes(e.target.value)} rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none resize-none" />
              </div>
            </div>

            <div className="mt-4 border border-[#0E7480]/20 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between bg-[#0E7480]/5 px-4 py-3">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-[#0E7480]" />
                  <span className="text-sm font-semibold text-gray-800">Send payout email to pro</span>
                </div>
                <button type="button" onClick={() => setProcessSendEmail(!processSendEmail)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${processSendEmail ? 'bg-[#0E7480]' : 'bg-gray-300'}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${processSendEmail ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              {processSendEmail && (
                <div className="px-4 py-4 space-y-3 bg-white">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Security Question</label>
                    <input type="text" value={processSecurityQuestion} onChange={(e) => setProcessSecurityQuestion(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">Security Answer</label>
                    <input type="text" value={processSecurityAnswer} onChange={(e) => setProcessSecurityAnswer(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0E7480] focus:border-transparent outline-none" />
                  </div>
                </div>
              )}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-4 mb-4 text-xs text-amber-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              Make sure the payout has actually been sent before you process this request. Processing will create a payout ledger record and mark the request as complete.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowProcessModal(false)} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleProcessRequest} disabled={processSubmitting} className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50">
                {processSubmitting ? 'Processing...' : `Process ${formatCurrency(selectedRequest.amount)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
