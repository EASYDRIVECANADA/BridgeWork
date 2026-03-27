import { io } from 'socket.io-client';
import { supabase } from '@/lib/supabase';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
  }
  return socket;
};

const connectSocketWithSession = async (s) => {
  let authToken = null;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    authToken = session?.access_token || null;
  } catch (err) {
    authToken = null;
  }

  s.auth = authToken ? { token: authToken } : {};

  if (!s.connected) {
    s.connect();
  }
};

export const connectSocket = (userId) => {
  const s = getSocket();

  connectSocketWithSession(s);
  return s;
};

export const disconnectSocket = () => {
  if (socket && socket.connected) {
    socket.disconnect();
  }
};

export const joinBookingRoom = (bookingId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit('join_booking', bookingId);
  }
};

export const leaveBookingRoom = (bookingId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit('leave_booking', bookingId);
  }
};

export const sendSocketMessage = (bookingId, message, recipientId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit('send_message', { bookingId, message, recipientId });
  }
};

export const emitTyping = (bookingId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit('typing', { bookingId });
  }
};

export const emitStopTyping = (bookingId) => {
  const s = getSocket();
  if (s.connected) {
    s.emit('stop_typing', { bookingId });
  }
};
