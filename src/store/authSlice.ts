import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UserState {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'rider' | 'driver' | 'admin';
  walletBalance: number;
  isVerified: boolean;
}

interface AuthState {
  user: UserState | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  driverOnline: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: localStorage.getItem('accessToken'),
  refreshToken: localStorage.getItem('refreshToken'),
  isAuthenticated: false,
  driverOnline: false
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: UserState; accessToken: string; refreshToken: string }>) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
      state.isAuthenticated = true;
      localStorage.setItem('accessToken', action.payload.accessToken);
      localStorage.setItem('refreshToken', action.payload.refreshToken);
    },
    updateWalletBalance(state, action: PayloadAction<number>) {
      if (state.user) {
        state.user.walletBalance = action.payload;
      }
    },
    setDriverOnlineStatus(state, action: PayloadAction<boolean>) {
      state.driverOnline = action.payload;
    },
    logOut(state) {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.driverOnline = false;
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }
});

export const { setCredentials, updateWalletBalance, setDriverOnlineStatus, logOut } = authSlice.actions;
export default authSlice.reducer;
