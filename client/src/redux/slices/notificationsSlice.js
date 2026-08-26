import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const fetchNotifications = createAsyncThunk(
  'notifications/fetch',
  async (_, { rejectWithValue }) => {
    try {
      const res = await api.get('/notifications');
      return res.data.data;
    } catch (e) {
      return rejectWithValue(e.friendlyMessage);
    }
  }
);

export const markRead = createAsyncThunk('notifications/markRead', async (ids) => {
  await api.patch('/notifications/read', { ids: Array.isArray(ids) ? ids : [] });
  return ids;
});

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState: { items: [], unreadCount: 0, loading: false },
  reducers: {},
  extraReducers: (b) => {
    b.addCase(fetchNotifications.pending, (s) => {
      s.loading = true;
    })
      .addCase(fetchNotifications.fulfilled, (s, a) => {
        s.items = a.payload.items;
        s.unreadCount = a.payload.unreadCount;
        s.loading = false;
      })
      .addCase(fetchNotifications.rejected, (s) => {
        s.loading = false;
      })
      .addCase(markRead.fulfilled, (s) => {
        s.unreadCount = 0;
        s.items = s.items.map((n) => ({ ...n, isRead: true }));
      });
  },
});

export default notificationsSlice.reducer;
