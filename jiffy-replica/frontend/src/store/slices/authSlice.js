import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { supabase } from '@/lib/supabase';
import { authAPI } from '@/lib/api';

// ─── All auth goes through Supabase client directly ───
// onAuthStateChange in AuthProvider is the SINGLE source of truth
// for setting user/profile/session in Redux.

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await authAPI.login({ email, password });
      const session = response.data?.data?.session;

      if (!session?.access_token || !session?.refresh_token) {
        return rejectWithValue('Login failed');
      }

      const { data, error } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });

      if (error) return rejectWithValue(error.message);
      return {
        user: data.user,
        session: data.session,
        profile: response.data?.data?.profile || null,
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Login failed');
    }
  }
);

export const signUp = createAsyncThunk(
  'auth/signUp',
  async (credentials, { rejectWithValue }) => {
    try {
      // Use backend API to create user + profile
      // Email confirmation is required — do NOT auto-login
      const response = await authAPI.signup(credentials);
      return {
        requiresConfirmation: true,
        email: credentials.email,
        message: response.data?.message || 'Please check your email to confirm your account.'
      };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || error.message || 'Signup failed');
    }
  }
);

export const signOut = createAsyncThunk(
  'auth/signOut',
  async () => {
    await supabase.auth.signOut();
    return null;
  }
);

export const updateProfile = createAsyncThunk(
  'auth/updateProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await authAPI.updateProfile(profileData);
      return response.data.data.profile;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Update failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    profile: null,
    session: null,
    isAuthenticated: false,
    isLoading: false,
    authInitialized: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload.user;
      state.profile = action.payload.profile;
      state.session = action.payload.session;
      state.isAuthenticated = !!action.payload.user;
      state.isLoading = false;
      state.authInitialized = true;
    },
    clearAuth: (state) => {
      state.user = null;
      state.profile = null;
      state.session = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      state.authInitialized = true;
      state.error = null;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      // signIn
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.session = action.payload.session;
        state.profile = action.payload.profile || state.profile;
        state.isAuthenticated = true;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // signUp — requires email confirmation, do NOT set isAuthenticated
      .addCase(signUp.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signUp.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(signUp.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // signOut
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.profile = null;
        state.session = null;
        state.isAuthenticated = false;
        state.isLoading = false;
      })
      // updateProfile
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.profile = action.payload;
      });
  },
});

export const { setUser, clearAuth, setError } = authSlice.actions;
export default authSlice.reducer;
