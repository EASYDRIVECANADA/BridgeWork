import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { prosAPI } from '@/lib/api';

// Fetch pro jobs (alerts, active, history based on status param)
export const fetchProJobs = createAsyncThunk(
  'pros/fetchProJobs',
  async (params, { rejectWithValue }) => {
    try {
      const response = await prosAPI.getJobs(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch jobs');
    }
  }
);

// Accept a job
export const acceptJob = createAsyncThunk(
  'pros/acceptJob',
  async (jobId, { rejectWithValue }) => {
    try {
      const response = await prosAPI.acceptJob(jobId);
      return response.data.data.booking;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to accept job');
    }
  }
);

// Decline a job
export const declineJob = createAsyncThunk(
  'pros/declineJob',
  async ({ jobId, reason }, { rejectWithValue }) => {
    try {
      const response = await prosAPI.declineJob(jobId, { reason });
      return { jobId, ...response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to decline job');
    }
  }
);

// Get pro statistics (earnings, job counts, etc.)
export const fetchProStatistics = createAsyncThunk(
  'pros/fetchProStatistics',
  async (_, { rejectWithValue }) => {
    try {
      const response = await prosAPI.getStatistics();
      return response.data.data.statistics;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch statistics');
    }
  }
);

// Update pro profile
export const updateProProfile = createAsyncThunk(
  'pros/updateProProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const response = await prosAPI.updateProfile(profileData);
      return response.data.data.profile;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update profile');
    }
  }
);

// Get pro by ID (public profile)
export const fetchProById = createAsyncThunk(
  'pros/fetchProById',
  async (id, { rejectWithValue }) => {
    try {
      const response = await prosAPI.getById(id);
      return response.data.data.pro;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch pro');
    }
  }
);

// Apply to become a pro
export const applyToBePro = createAsyncThunk(
  'pros/applyToBePro',
  async (applicationData, { rejectWithValue }) => {
    try {
      const response = await prosAPI.apply(applicationData);
      return response.data.data.application;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || 'Failed to submit application');
    }
  }
);

const prosSlice = createSlice({
  name: 'pros',
  initialState: {
    // Job lists
    jobAlerts: [],
    activeJobs: [],
    jobHistory: [],
    jobsPagination: null,

    // Statistics
    statistics: null,

    // Pro profile (for editing)
    proProfile: null,

    // Public pro profile (viewing)
    viewingPro: null,

    // Application
    application: null,

    // Loading states
    loading: {
      jobs: false,
      statistics: false,
      profile: false,
      viewingPro: false,
      application: false,
      acceptJob: false,
      declineJob: false,
    },

    // Errors
    error: null,
  },
  reducers: {
    clearProError: (state) => {
      state.error = null;
    },
    clearViewingPro: (state) => {
      state.viewingPro = null;
    },
    // Optimistic update: move job from alerts to active
    moveJobToActive: (state, action) => {
      const jobId = action.payload;
      const jobIndex = state.jobAlerts.findIndex(j => j.id === jobId);
      if (jobIndex !== -1) {
        const [job] = state.jobAlerts.splice(jobIndex, 1);
        job.status = 'accepted';
        state.activeJobs.unshift(job);
      }
    },
    // Optimistic update: remove job from alerts
    removeJobAlert: (state, action) => {
      state.jobAlerts = state.jobAlerts.filter(j => j.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Pro Jobs
      .addCase(fetchProJobs.pending, (state) => {
        state._jobsLoadingCount = (state._jobsLoadingCount || 0) + 1;
        state.loading.jobs = true;
        state.error = null;
      })
      .addCase(fetchProJobs.fulfilled, (state, action) => {
        state._jobsLoadingCount = Math.max(0, (state._jobsLoadingCount || 1) - 1);
        if (state._jobsLoadingCount === 0) state.loading.jobs = false;

        const jobs = action.payload.jobs || [];
        const status = action.meta.arg?.status;

        if (status === 'pending') {
          state.jobAlerts = jobs;
        } else if (status === 'accepted' || status === 'in_progress') {
          state.activeJobs = jobs;
        } else if (status === 'completed') {
          state.jobHistory = jobs;
        } else {
          // No filter — categorize by status
          state.jobAlerts = jobs.filter(j => j.status === 'pending');
          state.activeJobs = jobs.filter(j => j.status === 'accepted' || j.status === 'in_progress');
          state.jobHistory = jobs.filter(j => j.status === 'completed');
        }
        state.jobsPagination = action.payload.pagination;
      })
      .addCase(fetchProJobs.rejected, (state, action) => {
        state._jobsLoadingCount = Math.max(0, (state._jobsLoadingCount || 1) - 1);
        if (state._jobsLoadingCount === 0) state.loading.jobs = false;
        state.error = action.payload;
      })

      // Accept Job
      .addCase(acceptJob.pending, (state) => {
        state.loading.acceptJob = true;
      })
      .addCase(acceptJob.fulfilled, (state, action) => {
        state.loading.acceptJob = false;
        const acceptedJob = action.payload;
        // Remove from alerts, add to active
        state.jobAlerts = state.jobAlerts.filter(j => j.id !== acceptedJob.id);
        state.activeJobs.unshift(acceptedJob);
      })
      .addCase(acceptJob.rejected, (state, action) => {
        state.loading.acceptJob = false;
        state.error = action.payload;
      })

      // Decline Job
      .addCase(declineJob.pending, (state) => {
        state.loading.declineJob = true;
      })
      .addCase(declineJob.fulfilled, (state, action) => {
        state.loading.declineJob = false;
        state.jobAlerts = state.jobAlerts.filter(j => j.id !== action.payload.jobId);
      })
      .addCase(declineJob.rejected, (state, action) => {
        state.loading.declineJob = false;
        state.error = action.payload;
      })

      // Fetch Statistics
      .addCase(fetchProStatistics.pending, (state) => {
        state.loading.statistics = true;
      })
      .addCase(fetchProStatistics.fulfilled, (state, action) => {
        state.loading.statistics = false;
        state.statistics = action.payload;
      })
      .addCase(fetchProStatistics.rejected, (state, action) => {
        state.loading.statistics = false;
        state.error = action.payload;
      })

      // Update Pro Profile
      .addCase(updateProProfile.pending, (state) => {
        state.loading.profile = true;
      })
      .addCase(updateProProfile.fulfilled, (state, action) => {
        state.loading.profile = false;
        state.proProfile = action.payload;
      })
      .addCase(updateProProfile.rejected, (state, action) => {
        state.loading.profile = false;
        state.error = action.payload;
      })

      // Fetch Pro By ID
      .addCase(fetchProById.pending, (state) => {
        state.loading.viewingPro = true;
      })
      .addCase(fetchProById.fulfilled, (state, action) => {
        state.loading.viewingPro = false;
        state.viewingPro = action.payload;
      })
      .addCase(fetchProById.rejected, (state, action) => {
        state.loading.viewingPro = false;
        state.error = action.payload;
      })

      // Apply to be Pro
      .addCase(applyToBePro.pending, (state) => {
        state.loading.application = true;
      })
      .addCase(applyToBePro.fulfilled, (state, action) => {
        state.loading.application = false;
        state.application = action.payload;
      })
      .addCase(applyToBePro.rejected, (state, action) => {
        state.loading.application = false;
        state.error = action.payload;
      });
  },
});

export const { clearProError, clearViewingPro, moveJobToActive, removeJobAlert } = prosSlice.actions;
export default prosSlice.reducer;
