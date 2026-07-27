import { create } from 'zustand';
import api from '../../services/api';
import toast from 'react-hot-toast';

const useAiStore = create((set) => ({
  insights: null,
  isLoading: false,

  fetchInsights: async (refresh = false) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/ai/insights${refresh ? '?refresh=true' : ''}`);
      set({ insights: response.data.summary, isLoading: false });
    } catch (error) {
      toast.error('Failed to load AI insights.');
      set({ isLoading: false });
    }
  }
}));

export default useAiStore;