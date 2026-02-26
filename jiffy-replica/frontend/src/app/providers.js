'use client';

import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { supabase } from '@/lib/supabase';
import axios from 'axios';
import { setUser, clearAuth } from '@/store/slices/authSlice';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { fetchUnreadCount, addRealtimeMessage } from '@/store/slices/messagesSlice';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

function AuthProvider({ children }) {
  const dispatch = useDispatch();
  // Track the last user ID we fetched a profile for, to avoid duplicate calls
  const lastFetchedUserRef = useRef(null);
  // Debounce timer for auth state changes
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    // Fetch profile using a DIRECT axios call with the token passed explicitly.
    // We CANNOT use the api.js interceptor here because it calls getSession()
    // which deadlocks when called inside onAuthStateChange.
    const fetchProfile = async (accessToken) => {
      console.log('[AUTH PROVIDER] fetchProfile with explicit token');
      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const profile = response.data?.data?.profile;
        console.log('[AUTH PROVIDER] fetchProfile result:', !!profile);
        return profile || null;
      } catch (err) {
        console.error('[AUTH PROVIDER] fetchProfile error:', err?.response?.status, err?.message);
        return null;
      }
    };

    // Debounced handler: coalesces rapid auth events into a single fetchProfile call
    const handleAuthSession = (session, source) => {
      if (!session) {
        // Clear immediately on sign-out — no need to debounce
        if (debounceTimerRef.current) {
          clearTimeout(debounceTimerRef.current);
          debounceTimerRef.current = null;
        }
        lastFetchedUserRef.current = null;
        console.log(`[AUTH PROVIDER] No session (${source}), dispatching clearAuth`);
        dispatch(clearAuth());
        return;
      }

      const userId = session.user?.id;

      // Skip if we already fetched for this exact user (e.g. TOKEN_REFRESHED after SIGNED_IN)
      if (lastFetchedUserRef.current === userId && source !== 'mount') {
        console.log(`[AUTH PROVIDER] Skipping duplicate fetch for user ${userId} (${source})`);
        return;
      }

      // Debounce: wait 300ms for rapid events to settle before making the API call
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(async () => {
        debounceTimerRef.current = null;
        // Double-check we still need this fetch (user may have signed out during debounce)
        if (lastFetchedUserRef.current === userId && source !== 'mount') {
          return;
        }
        lastFetchedUserRef.current = userId;
        const profile = await fetchProfile(session.access_token);
        console.log(`[AUTH PROVIDER] Dispatching setUser (${source}), profile:`, !!profile);
        dispatch(setUser({
          user: session.user,
          session: session,
          profile: profile,
        }));
      }, source === 'mount' ? 0 : 300);
    };

    // Check existing session on mount
    console.log('[AUTH PROVIDER] Checking existing session on mount');
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[AUTH PROVIDER] getSession result:', { hasSession: !!session });
      handleAuthSession(session, 'mount');
    });

    // Listen for all auth changes (login, logout, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('[AUTH PROVIDER] onAuthStateChange event:', event, 'hasSession:', !!session);
      handleAuthSession(session, event);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [dispatch]);

  return children;
}

function SocketProvider({ children }) {
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user?.id) {
      const socket = connectSocket(user.id);

      // Listen for message notifications globally
      const handleNotification = (data) => {
        dispatch(addRealtimeMessage(data.message));
      };

      socket.on('new_message_notification', handleNotification);

      // Fetch initial unread count
      dispatch(fetchUnreadCount());

      return () => {
        socket.off('new_message_notification', handleNotification);
      };
    } else {
      disconnectSocket();
    }
  }, [user?.id, dispatch]);

  return children;
}

export function Providers({ children }) {
  return (
    <Provider store={store}>
      <AuthProvider>
        <SocketProvider>{children}</SocketProvider>
      </AuthProvider>
    </Provider>
  );
}
