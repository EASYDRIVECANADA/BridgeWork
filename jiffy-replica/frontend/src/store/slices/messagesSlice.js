import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { messagesAPI } from '@/lib/api';

// Fetch all conversations
export const fetchConversations = createAsyncThunk(
  'messages/fetchConversations',
  async (_, { rejectWithValue }) => {
    try {
      const response = await messagesAPI.getConversations();
      return response.data.data.conversations;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch conversations');
    }
  }
);

// Fetch messages for a booking
export const fetchMessages = createAsyncThunk(
  'messages/fetchMessages',
  async ({ bookingId, params }, { rejectWithValue }) => {
    try {
      const response = await messagesAPI.getMessages(bookingId, params);
      return { bookingId, ...response.data.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch messages');
    }
  }
);

// Send a message via REST API
export const sendMessage = createAsyncThunk(
  'messages/sendMessage',
  async ({ bookingId, message, attachments }, { rejectWithValue }) => {
    try {
      const response = await messagesAPI.sendMessage(bookingId, { message, attachments });
      return response.data.data.message;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to send message');
    }
  }
);

// Mark messages as read
export const markMessagesAsRead = createAsyncThunk(
  'messages/markAsRead',
  async (bookingId, { rejectWithValue }) => {
    try {
      await messagesAPI.markAsRead(bookingId);
      return bookingId;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to mark as read');
    }
  }
);

// Fetch unread count
export const fetchUnreadCount = createAsyncThunk(
  'messages/fetchUnreadCount',
  async (_, { rejectWithValue }) => {
    try {
      const response = await messagesAPI.getUnreadCount();
      return response.data.data.unread_count;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch unread count');
    }
  }
);

const messagesSlice = createSlice({
  name: 'messages',
  initialState: {
    conversations: [],
    activeBookingId: null,
    messagesByBooking: {}, // { [bookingId]: { messages: [], pagination: {} } }
    unreadCount: 0,
    typingUsers: {}, // { [bookingId]: userId }

    loading: {
      conversations: false,
      messages: false,
      sending: false,
    },
    error: null,
  },
  reducers: {
    setActiveBooking: (state, action) => {
      state.activeBookingId = action.payload;
    },
    clearActiveBooking: (state) => {
      state.activeBookingId = null;
    },
    // Add a message received via Socket.IO
    addRealtimeMessage: (state, action) => {
      const msg = action.payload;
      const bookingId = msg.booking_id;
      if (state.messagesByBooking[bookingId]) {
        const exists = state.messagesByBooking[bookingId].messages.some(m => m.id === msg.id);
        if (!exists) {
          state.messagesByBooking[bookingId].messages.push(msg);
        }
      }
      // Update conversation's latest message
      const convo = state.conversations.find(c => c.booking_id === bookingId);
      if (convo) {
        convo.latest_message = {
          message: msg.message,
          sender_id: msg.sender_id,
          created_at: msg.created_at,
          is_read: false,
        };
        // If this booking is not currently active, increment unread
        if (state.activeBookingId !== bookingId) {
          convo.unread_count = (convo.unread_count || 0) + 1;
          state.unreadCount += 1;
        }
      }
    },
    setTypingUser: (state, action) => {
      const { bookingId, userId } = action.payload;
      state.typingUsers[bookingId] = userId;
    },
    clearTypingUser: (state, action) => {
      const { bookingId } = action.payload;
      delete state.typingUsers[bookingId];
    },
    clearMessagesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Conversations
      .addCase(fetchConversations.pending, (state) => {
        state.loading.conversations = true;
        state.error = null;
      })
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.loading.conversations = false;
        state.conversations = action.payload;
      })
      .addCase(fetchConversations.rejected, (state, action) => {
        state.loading.conversations = false;
        state.error = action.payload;
      })

      // Fetch Messages
      .addCase(fetchMessages.pending, (state) => {
        state.loading.messages = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.loading.messages = false;
        const { bookingId, messages, pagination } = action.payload;
        state.messagesByBooking[bookingId] = { messages, pagination };
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.loading.messages = false;
        state.error = action.payload;
      })

      // Send Message
      .addCase(sendMessage.pending, (state) => {
        state.loading.sending = true;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.loading.sending = false;
        const msg = action.payload;
        const bookingId = msg.booking_id;
        if (state.messagesByBooking[bookingId]) {
          const exists = state.messagesByBooking[bookingId].messages.some(m => m.id === msg.id);
          if (!exists) {
            state.messagesByBooking[bookingId].messages.push(msg);
          }
        }
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.loading.sending = false;
        state.error = action.payload;
      })

      // Mark as Read
      .addCase(markMessagesAsRead.fulfilled, (state, action) => {
        const bookingId = action.payload;
        const convo = state.conversations.find(c => c.booking_id === bookingId);
        if (convo) {
          state.unreadCount = Math.max(0, state.unreadCount - (convo.unread_count || 0));
          convo.unread_count = 0;
        }
      })

      // Fetch Unread Count
      .addCase(fetchUnreadCount.fulfilled, (state, action) => {
        state.unreadCount = action.payload;
      });
  },
});

export const {
  setActiveBooking,
  clearActiveBooking,
  addRealtimeMessage,
  setTypingUser,
  clearTypingUser,
  clearMessagesError,
} = messagesSlice.actions;

export default messagesSlice.reducer;
