import { createSlice } from '@reduxjs/toolkit';

const savedTheme = localStorage.getItem('lmcc_theme') || 'light';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    theme: savedTheme,
    sidebarOpen: false, // mobile drawer
  },
  reducers: {
    toggleTheme(state) {
      state.theme = state.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('lmcc_theme', state.theme);
    },
    setSidebarOpen(state, action) {
      state.sidebarOpen = action.payload;
    },
  },
});

export const { toggleTheme, setSidebarOpen } = uiSlice.actions;
export default uiSlice.reducer;
