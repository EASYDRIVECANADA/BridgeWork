import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import servicesReducer from './slices/servicesSlice';
import bookingsReducer from './slices/bookingsSlice';
import uiReducer from './slices/uiSlice';
import prosReducer from './slices/prosSlice';
import messagesReducer from './slices/messagesSlice';
import quotesReducer from './slices/quotesSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    services: servicesReducer,
    bookings: bookingsReducer,
    ui: uiReducer,
    pros: prosReducer,
    messages: messagesReducer,
    quotes: quotesReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;
