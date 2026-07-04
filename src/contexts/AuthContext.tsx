import React, { createContext, useContext, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../store';
import { setCredentials, logOut, updateWalletBalance } from '../store/authSlice';

interface AuthContextType {
  user: any | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  signup: (signupData: any) => Promise<{ success: boolean; message?: string }>;
  requestOTP: (phone: string) => Promise<{ success: boolean; message?: string; otp?: string }>;
  verifyOTP: (phone: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const authState = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);

  // Silent refresh on app load
  useEffect(() => {
    const performSilentRefresh = async () => {
      const storedRefreshToken = localStorage.getItem('refreshToken');
      if (storedRefreshToken) {
        try {
          const resp = await fetch('/api/v1/auth/refresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: storedRefreshToken })
          });
          const data = await resp.json();
          if (data.status === 'success') {
            // Fetch user profile or fetch user details
            const userResp = await fetch('/api/v1/users/profile', {
              headers: { Authorization: `Bearer ${data.accessToken}` }
            });
            const userData = await userResp.json();
            if (userData.status === 'success') {
              dispatch(setCredentials({
                user: userData.user,
                accessToken: data.accessToken,
                refreshToken: data.refreshToken
              }));
            }
          } else {
            // Revoked or invalid token
            dispatch(logOut());
          }
        } catch (err) {
          console.error('Silent refresh failed:', err);
        }
      }
      setLoading(false);
    };

    performSilentRefresh();
  }, [dispatch]);

  const login = async (email: string, password: string) => {
    try {
      const resp = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await resp.json();
      if (data.status === 'success') {
        dispatch(setCredentials({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken
        }));
        return { success: true };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  };

  const signup = async (signupData: any) => {
    try {
      const resp = await fetch('/api/v1/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupData)
      });
      const data = await resp.json();
      if (data.status === 'success') {
        dispatch(setCredentials({
          user: data.user,
          accessToken: data.accessToken,
          refreshToken: data.refreshToken
        }));
        return { success: true };
      }
      return { success: false, message: data.message || 'Registration failed' };
    } catch (err: any) {
      return { success: false, message: err.message || 'Network error' };
    }
  };

  const requestOTP = async (phone: string) => {
    try {
      const resp = await fetch('/api/v1/auth/otp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await resp.json();
      if (data.status === 'success') {
        return { success: true, message: data.message, otp: data.otp };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const verifyOTP = async (phone: string, otp: string) => {
    try {
      const resp = await fetch('/api/v1/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp })
      });
      const data = await resp.json();
      if (data.status === 'success') {
        return { success: true };
      }
      return { success: false, message: data.message };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  };

  const logout = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      try {
        await fetch('/api/v1/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: storedRefreshToken })
        });
      } catch (err) {
        console.error('Logout request failed:', err);
      }
    }
    dispatch(logOut());
  };

  return (
    <AuthContext.Provider
      value={{
        user: authState.user,
        accessToken: authState.accessToken,
        isAuthenticated: authState.isAuthenticated,
        loading,
        login,
        signup,
        requestOTP,
        verifyOTP,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
