import { create } from 'zustand';
import api from '../../services/api';
import toast from 'react-hot-toast';

const useAuthStore = create((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,

  // Login Action
  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token } = response.data;
      
      localStorage.setItem('access_token', access_token);
      localStorage.setItem('refresh_token', refresh_token);
      
      // Fetch user details immediately after login
      await useAuthStore.getState().fetchUser();
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed. Please check your credentials.');
      set({ isLoading: false });
      return false;
    }
  },

  // Register Action
  register: async (email, password, role, phone_number) => {
    set({ isLoading: true });
    try {
      // API call creates the unverified account and triggers the OTP email/SMS.
      await api.post('/auth/register', { email, password, role, phone_number });
      
      set({ isLoading: false });
      return true; // We removed the toast here since VerifyOTP handles the UI feedback
    } catch (error) {
      toast.error(error.response?.data?.detail?.[0]?.msg || error.response?.data?.detail || 'Registration failed.');
      set({ isLoading: false });
      return false;
    }
  },

  // Verify OTP Action
  verifyOtp: async (email, otp) => {
    set({ isLoading: true });
    try {
      await api.post('/auth/verify-otp', { email, otp });
      
      // We intentionally DO NOT store tokens here anymore, 
      // ensuring the user is forced to the manual Login page.
      
      toast.success('Account verified successfully! Please log in.');
      set({ isLoading: false });
      return true;
    } catch (error) {
      // Exact error message requested
      toast.error('OTP is incorrect Try Again');
      set({ isLoading: false });
      return false;
    }
  },

  // Resend OTP Action
  resendOtp: async (email) => {
    try {
      await api.post('/auth/resend-otp', { email });
      toast.success('A new OTP has been sent.');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to resend OTP. Please wait before trying again.');
      return false;
    }
  },

  // Fetch Current User Action
  fetchUser: async () => {
    try {
      const response = await api.get('/auth/me');
      set({ user: response.data, isAuthenticated: true, isLoading: false });
    } catch (error) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  // Logout Action
  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    set({ user: null, isAuthenticated: false });
    toast.success('Logged out successfully');
  }
}));

export default useAuthStore;