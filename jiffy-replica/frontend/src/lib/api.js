import axios from 'axios';
import { supabase } from './supabase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  async (config) => {
    // Try to get current session
    let { data: { session } } = await supabase.auth.getSession();
    
    // If no session or token might be expired, try to refresh
    if (!session?.access_token) {
      const { data: refreshData } = await supabase.auth.refreshSession();
      session = refreshData?.session;
    }
    
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // If 401 error and we haven't retried yet, try to refresh token
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
        
        if (session?.access_token && !refreshError) {
          originalRequest.headers.Authorization = `Bearer ${session.access_token}`;
          return api(originalRequest);
        }
      } catch (refreshErr) {
        console.error('Token refresh failed:', refreshErr);
      }
    }
    
    return Promise.reject(error);
  }
);

export const authAPI = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getCurrentUser: () => api.get('/auth/me'),
  updateProfile: (data) => api.patch('/auth/profile', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  forgotPassword: (data) => api.post('/auth/forgot-password', data),
  resetPassword: (data) => api.post('/auth/reset-password', data),
};

export const servicesAPI = {
  getAll: (params) => api.get('/services', { params }),
  getById: (id) => api.get(`/services/${id}`),
  search: (query) => api.get('/services/search', { params: { q: query } }),
  getCategories: () => api.get('/services/categories'),
  getCategoryById: (id) => api.get(`/services/categories/${id}`),
};

export const bookingsAPI = {
  create: (data) => api.post('/bookings', data),
  getAll: (params) => api.get('/bookings', { params }),
  getById: (id) => api.get(`/bookings/${id}`),
  updateStatus: (id, data) => api.patch(`/bookings/${id}/status`, data),
  cancel: (id, data) => api.post(`/bookings/${id}/cancel`, data),
  
  // Pro: Quotation endpoints
  getQuoteRequestsForPro: () => api.get('/bookings/pro/quote-requests'),
  getQuoteRequestDetail: (id) => api.get(`/bookings/pro/quote-requests/${id}`),
  submitQuotation: (id, data) => api.post(`/bookings/pro/quote-requests/${id}/submit`, data),
  getMyQuotations: () => api.get('/bookings/pro/my-quotations'),
  
  // Admin: Quote Assignment Management
  getPendingAssignments: () => api.get('/bookings/admin/pending-assignments'),
  getAvailableProsForQuote: (bookingId) => api.get(`/bookings/admin/available-pros/${bookingId}`),
  assignProsToQuote: (data) => api.post('/bookings/admin/assign-pros', data),
  getBookingAssignments: (bookingId) => api.get(`/bookings/admin/assignments/${bookingId}`),
  removeProAssignment: (bookingId, proId) => api.delete(`/bookings/admin/assignments/${bookingId}/${proId}`),
  
  // Admin: Multi-quotation management
  getAllQuotations: () => api.get('/bookings/admin/quotations'),
  selectQuotation: (bookingId, quotationId, data) => api.put(`/bookings/admin/quotations/${bookingId}/select/${quotationId}`, data),
  
  // Admin: Legacy Quote Requests (backward compatibility)
  getQuoteRequests: (params) => api.get('/bookings/admin/quote-requests', { params }),
  setQuotePrice: (id, data) => api.put(`/bookings/admin/quote-requests/${id}/set-price`, data),
  cancelQuoteRequest: (id, data) => api.delete(`/bookings/admin/quote-requests/${id}`, { data }),
  
  // Admin: Proofs & Disputes
  getAllProofs: () => api.get('/bookings/admin/proofs'),
  getAllDisputes: () => api.get('/bookings/admin/disputes'),
  getDisputeDetails: (bookingId) => api.get(`/bookings/admin/disputes/${bookingId}`),
  
  // Homeowner: Quotation acceptance
  getBookingQuotations: (bookingId) => api.get(`/bookings/${bookingId}/quotations`),
  acceptQuotation: (bookingId, quotationId) => api.post(`/bookings/${bookingId}/quotations/${quotationId}/accept`),
};

export const prosAPI = {
  getNearby: (params) => api.get('/pros/nearby', { params }),
  getById: (id) => api.get(`/pros/${id}`),
  apply: (data) => api.post('/pros/apply', data),
  getJobs: (params) => api.get('/pros/jobs/list', { params }),
  acceptJob: (id) => api.post(`/pros/jobs/${id}/accept`),
  declineJob: (id, data) => api.post(`/pros/jobs/${id}/decline`, data),
  submitProof: (id, data) => api.post(`/pros/jobs/${id}/proof`, data),
  uploadProofFiles: (id, files) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    return api.post(`/pros/jobs/${id}/proof/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  getJobProof: (id) => api.get(`/pros/jobs/${id}/proof`),
  uploadAvatar: (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    return api.post('/pros/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  updateProfile: (data) => api.patch('/pros/profile', data),
  getStatistics: () => api.get('/pros/statistics/me'),
  getMyProfile: () => api.get('/pros/profile/me'),
  // Admin
  adminList: () => api.get('/pros/admin/list'),
  setCommission: (id, data) => api.patch(`/pros/${id}/commission`, data),
};

export const proProfileUpdatesAPI = {
  // Pro endpoints
  submitUpdate: (data) => api.post('/pro-profile-updates/request', data),
  getMyPending: () => api.get('/pro-profile-updates/my-pending'),
  getMyHistory: () => api.get('/pro-profile-updates/my-history'),
  // Admin endpoints
  getRequests: (params) => api.get('/pro-profile-updates/admin/requests', { params }),
  getPendingCount: () => api.get('/pro-profile-updates/admin/pending-count'),
  approve: (id) => api.post(`/pro-profile-updates/admin/approve/${id}`),
  reject: (id, data) => api.post(`/pro-profile-updates/admin/reject/${id}`, data),
  adminUpdatePro: (proProfileId, data) => api.put(`/pro-profile-updates/admin/pro/${proProfileId}`, data),
};

export const reviewsAPI = {
  create: (data) => api.post('/reviews', data),
  getByProId: (proId, params) => api.get(`/reviews/pro/${proId}`, { params }),
  respond: (id, data) => api.post(`/reviews/${id}/respond`, data),
};

export const paymentsAPI = {
  createIntent: (data) => api.post('/payments/create-intent', data),
  confirmPayment: (data) => api.post('/payments/confirm-payment', data),
  capturePayment: (data) => api.post('/payments/capture', data),
  cancelHold: (data) => api.post('/payments/cancel-hold', data),
  disputeBooking: (data) => api.post('/payments/dispute', data),
  getTransactions: (params) => api.get('/payments/transactions', { params }),
  // Dispute chat
  getDisputeMessages: (bookingId) => api.get(`/payments/disputes/${bookingId}/messages`),
  sendDisputeMessage: (bookingId, data) => api.post(`/payments/disputes/${bookingId}/messages`, data),
  // Stripe Connect (pro payouts)
  connectOnboard: (params) => api.post('/payments/connect/onboard', {}, { params }),
  connectStatus: () => api.get('/payments/connect/status'),
  connectDashboard: () => api.get('/payments/connect/dashboard'),
  connectRemediationLink: () => api.get('/payments/connect/remediation-link'),
  connectEarnings: () => api.get('/payments/connect/earnings'),
  commissionRate: () => api.get('/payments/connect/commission-rate'),
  // Admin
  adminRevenue: () => api.get('/payments/admin/revenue'),
  adminRefund: (data) => api.post('/payments/admin/refund', data),
  adminResolveDispute: (bookingId, data) => api.post(`/payments/admin/disputes/${bookingId}/resolve`, data),
};

export const messagesAPI = {
  getConversations: () => api.get('/messages/conversations'),
  getMessages: (bookingId, params) => api.get(`/messages/${bookingId}`, { params }),
  sendMessage: (bookingId, data) => api.post(`/messages/${bookingId}`, data),
  markAsRead: (bookingId) => api.patch(`/messages/${bookingId}/read`),
  getUnreadCount: () => api.get('/messages/unread-count'),
  uploadAttachment: (bookingId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/messages/${bookingId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const quotesAPI = {
  // Quotes
  createQuote: (data) => api.post('/quotes-invoices/quotes', data),
  getQuotes: (params) => api.get('/quotes-invoices/quotes', { params }),
  getQuoteById: (id) => api.get(`/quotes-invoices/quotes/${id}`),
  updateQuote: (id, data) => api.put(`/quotes-invoices/quotes/${id}`, data),
  sendQuote: (id) => api.post(`/quotes-invoices/quotes/${id}/send`),
  respondToQuote: (id, data) => api.post(`/quotes-invoices/quotes/${id}/respond`, data),
  convertToInvoice: (id, data) => api.post(`/quotes-invoices/quotes/${id}/convert`, data),
  deleteQuote: (id) => api.delete(`/quotes-invoices/quotes/${id}`),
  // Invoices
  createInvoice: (data) => api.post('/quotes-invoices/invoices', data),
  getInvoices: (params) => api.get('/quotes-invoices/invoices', { params }),
  getInvoiceById: (id) => api.get(`/quotes-invoices/invoices/${id}`),
  sendInvoice: (id) => api.post(`/quotes-invoices/invoices/${id}/send`),
  updateInvoiceStatus: (id, data) => api.patch(`/quotes-invoices/invoices/${id}/status`, data),
  // Stats
  getStats: () => api.get('/quotes-invoices/stats'),
  // Admin: Quote Bookings as Invoices
  getQuoteInvoices: (params) => api.get('/quotes-invoices/admin/quote-invoices', { params }),
};

export const onboardingAPI = {
  getStatus: () => api.get('/onboarding/status'),
  getAgreement: () => api.get('/onboarding/agreement'),
  submitBusinessInfo: (data) => api.post('/onboarding/step/1', data),
  acceptAgreement: (data) => api.post('/onboarding/step/2', data),
  submitRequirements: (data) => api.post('/onboarding/step/3', data),
  completeStripe: () => api.post('/onboarding/step/4'),
  // Admin
  getApplications: (params) => api.get('/onboarding/admin/applications', { params }),
  approveApplication: (id, data) => api.post(`/onboarding/admin/approve/${id}`, data),
  rejectApplication: (id, data) => api.post(`/onboarding/admin/reject/${id}`, data),
  adminCreatePro: (data) => api.post('/onboarding/admin/create-pro', data),
};

export const supportChatAPI = {
  getOrCreateConversation: () => api.get('/support-chat/conversation'),
  getMessages: (conversationId) => api.get(`/support-chat/${conversationId}/messages`),
  sendMessage: (conversationId, data) => api.post(`/support-chat/${conversationId}/messages`, data),
  getUnreadCount: () => api.get('/support-chat/unread-count'),
  // Admin
  getAllConversations: (params) => api.get('/support-chat/admin/conversations', { params }),
  closeConversation: (conversationId) => api.patch(`/support-chat/admin/${conversationId}/close`),
};

export const settingsAPI = {
  // Tax settings (Admin)
  getTaxSettings: () => api.get('/settings/tax'),
  updateTaxSetting: (serviceType, data) => api.put(`/settings/tax/${serviceType}`, data),
  // Public tax rate
  getTaxRate: (serviceType) => api.get(`/settings/tax/${serviceType}`),
};

export default api;
