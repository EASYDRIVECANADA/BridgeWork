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
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
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
  updateProfile: (data) => api.patch('/pros/profile', data),
  getStatistics: () => api.get('/pros/statistics/me'),
  getMyProfile: () => api.get('/pros/profile/me'),
  // Admin
  adminList: () => api.get('/pros/admin/list'),
  setCommission: (id, data) => api.patch(`/pros/${id}/commission`, data),
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
  // Stripe Connect (pro payouts)
  connectOnboard: () => api.post('/payments/connect/onboard'),
  connectStatus: () => api.get('/payments/connect/status'),
  connectDashboard: () => api.get('/payments/connect/dashboard'),
  connectEarnings: () => api.get('/payments/connect/earnings'),
  commissionRate: () => api.get('/payments/connect/commission-rate'),
  // Admin
  adminRevenue: () => api.get('/payments/admin/revenue'),
  adminRefund: (data) => api.post('/payments/admin/refund', data),
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

export default api;
