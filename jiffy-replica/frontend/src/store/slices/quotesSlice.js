import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { quotesAPI } from '@/lib/api';

// ==================== QUOTES ====================

export const fetchQuotes = createAsyncThunk(
  'quotes/fetchQuotes',
  async (params, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.getQuotes(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch quotes');
    }
  }
);

export const fetchQuoteById = createAsyncThunk(
  'quotes/fetchQuoteById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.getQuoteById(id);
      return response.data.data.quote;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch quote');
    }
  }
);

export const createQuote = createAsyncThunk(
  'quotes/createQuote',
  async (data, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.createQuote(data);
      return response.data.data.quote;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create quote');
    }
  }
);

export const updateQuote = createAsyncThunk(
  'quotes/updateQuote',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.updateQuote(id, data);
      return response.data.data.quote;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update quote');
    }
  }
);

export const sendQuote = createAsyncThunk(
  'quotes/sendQuote',
  async (id, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.sendQuote(id);
      return response.data.data.quote;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send quote');
    }
  }
);

export const respondToQuote = createAsyncThunk(
  'quotes/respondToQuote',
  async ({ id, action, decline_reason, customer_notes }, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.respondToQuote(id, { action, decline_reason, customer_notes });
      return response.data.data.quote;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to respond to quote');
    }
  }
);

export const convertQuoteToInvoice = createAsyncThunk(
  'quotes/convertToInvoice',
  async ({ id, due_date, notes }, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.convertToInvoice(id, { due_date, notes });
      return { invoice: response.data.data.invoice, quoteId: id };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to convert quote');
    }
  }
);

export const deleteQuote = createAsyncThunk(
  'quotes/deleteQuote',
  async (id, { rejectWithValue }) => {
    try {
      await quotesAPI.deleteQuote(id);
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete quote');
    }
  }
);

// ==================== INVOICES ====================

export const fetchInvoices = createAsyncThunk(
  'quotes/fetchInvoices',
  async (params, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.getInvoices(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch invoices');
    }
  }
);

export const fetchInvoiceById = createAsyncThunk(
  'quotes/fetchInvoiceById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.getInvoiceById(id);
      return response.data.data.invoice;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch invoice');
    }
  }
);

export const createInvoice = createAsyncThunk(
  'quotes/createInvoice',
  async (data, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.createInvoice(data);
      return response.data.data.invoice;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create invoice');
    }
  }
);

export const sendInvoice = createAsyncThunk(
  'quotes/sendInvoice',
  async (id, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.sendInvoice(id);
      return response.data.data.invoice;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send invoice');
    }
  }
);

export const updateInvoiceStatus = createAsyncThunk(
  'quotes/updateInvoiceStatus',
  async ({ id, ...data }, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.updateInvoiceStatus(id, data);
      return response.data.data.invoice;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update invoice');
    }
  }
);

export const fetchStats = createAsyncThunk(
  'quotes/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const response = await quotesAPI.getStats();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stats');
    }
  }
);

const quotesSlice = createSlice({
  name: 'quotes',
  initialState: {
    quotes: [],
    currentQuote: null,
    invoices: [],
    currentInvoice: null,
    stats: null,
    isLoading: false,
    error: null,
    pagination: {
      total: 0,
      limit: 20,
      offset: 0,
    },
    invoicePagination: {
      total: 0,
      limit: 20,
      offset: 0,
    },
  },
  reducers: {
    clearCurrentQuote: (state) => {
      state.currentQuote = null;
    },
    clearCurrentInvoice: (state) => {
      state.currentInvoice = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch quotes
      .addCase(fetchQuotes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchQuotes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.quotes = action.payload.quotes;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchQuotes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch quote by ID
      .addCase(fetchQuoteById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchQuoteById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQuote = action.payload;
      })
      .addCase(fetchQuoteById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create quote
      .addCase(createQuote.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createQuote.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentQuote = action.payload;
        state.quotes.unshift(action.payload);
      })
      .addCase(createQuote.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Update quote
      .addCase(updateQuote.fulfilled, (state, action) => {
        state.currentQuote = action.payload;
        const idx = state.quotes.findIndex(q => q.id === action.payload.id);
        if (idx !== -1) state.quotes[idx] = action.payload;
      })
      // Send quote
      .addCase(sendQuote.fulfilled, (state, action) => {
        state.currentQuote = action.payload;
        const idx = state.quotes.findIndex(q => q.id === action.payload.id);
        if (idx !== -1) state.quotes[idx] = action.payload;
      })
      // Respond to quote
      .addCase(respondToQuote.fulfilled, (state, action) => {
        state.currentQuote = action.payload;
        const idx = state.quotes.findIndex(q => q.id === action.payload.id);
        if (idx !== -1) state.quotes[idx] = action.payload;
      })
      // Convert quote to invoice
      .addCase(convertQuoteToInvoice.fulfilled, (state, action) => {
        state.invoices.unshift(action.payload.invoice);
        const idx = state.quotes.findIndex(q => q.id === action.payload.quoteId);
        if (idx !== -1) state.quotes[idx].status = 'converted';
        if (state.currentQuote?.id === action.payload.quoteId) {
          state.currentQuote.status = 'converted';
        }
      })
      // Delete quote
      .addCase(deleteQuote.fulfilled, (state, action) => {
        state.quotes = state.quotes.filter(q => q.id !== action.payload);
        if (state.currentQuote?.id === action.payload) {
          state.currentQuote = null;
        }
      })
      // Fetch invoices
      .addCase(fetchInvoices.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.isLoading = false;
        state.invoices = action.payload.invoices;
        state.invoicePagination = action.payload.pagination;
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Fetch invoice by ID
      .addCase(fetchInvoiceById.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchInvoiceById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentInvoice = action.payload;
      })
      .addCase(fetchInvoiceById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Create invoice
      .addCase(createInvoice.fulfilled, (state, action) => {
        state.invoices.unshift(action.payload);
        state.currentInvoice = action.payload;
      })
      // Send invoice
      .addCase(sendInvoice.fulfilled, (state, action) => {
        state.currentInvoice = action.payload;
        const idx = state.invoices.findIndex(i => i.id === action.payload.id);
        if (idx !== -1) state.invoices[idx] = action.payload;
      })
      // Update invoice status
      .addCase(updateInvoiceStatus.fulfilled, (state, action) => {
        state.currentInvoice = action.payload;
        const idx = state.invoices.findIndex(i => i.id === action.payload.id);
        if (idx !== -1) state.invoices[idx] = action.payload;
      })
      // Stats
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { clearCurrentQuote, clearCurrentInvoice, clearError } = quotesSlice.actions;
export default quotesSlice.reducer;
