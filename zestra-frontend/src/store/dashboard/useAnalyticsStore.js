import { create } from 'zustand';
import api from '../../services/api';
import toast from 'react-hot-toast';

const useAnalyticsStore = create((set) => ({
  analyticsData: null,
  isLoading: false,

  fetchAnalytics: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/dashboard/analytics');
      set({ analyticsData: response.data, isLoading: false });
    } catch (error) {
      toast.error('Failed to load analytics data.');
      set({ isLoading: false });
    }
  }
}));

export default useAnalyticsStore;