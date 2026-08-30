import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const loadMe = createAsyncThunk('auth/loadMe', async (_, { rejectWithValue }) => {
  try {
    const res = await api.get('/auth/current-user');
    return res.data.data.user;
  } catch (e) {
    return rejectWithValue(e.friendlyMessage || 'Not authenticated');
  }
});

export const login = createAsyncThunk('auth/login', async (creds, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/login', creds);
    return res.data.data.user;
  } catch (e) {
    return rejectWithValue(e.friendlyMessage);
  }
});

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const res = await api.post('/auth/register', payload);
    return res.data.data.user;
  } catch (e) {
    return rejectWithValue(e.friendlyMessage);
  }
});

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.post('/auth/logout');
});

export const updateMe = createAsyncThunk('auth/updateMe', async (payload, { rejectWithValue }) => {
  try {
    const res = await api.put('/users/me', payload);
    return res.data.data.user;
  } catch (e) {
    return rejectWithValue(e.friendlyMessage);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    status: 'idle', // idle | loading | authenticated | guest
    error: null,
    booted: false,
  },
  reducers: {
    sessionExpired(state) {
      state.user = null;
      state.status = 'guest';
      state.booted = true;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMe.pending, (state) => {
        state.status = 'loading';
      })
      .addCase(loadMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
        state.booted = true;
        state.error = null;
      })
      .addCase(loadMe.rejected, (state, action) => {
        state.user = null;
        state.status = 'guest';
        state.booted = true;
        state.error = action.payload;
      })
      .addCase(login.pending, (state) => {
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload;
        state.status = 'authenticated';
        state.booted = true;
      })
      .addCase(login.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(register.rejected, (state, action) => {
        state.error = action.payload;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.status = 'guest';
      })
      .addCase(updateMe.fulfilled, (state, action) => {
        state.user = action.payload;
      });
  },
});

export default authSlice.reducer;

export const { sessionExpired } = authSlice.actions;

export const selectUser = (s) => s.auth.user;
export const selectIsAuthenticated = (s) => s.auth.status === 'authenticated';
export const selectRole = (s) => s.auth.user?.role || null;
