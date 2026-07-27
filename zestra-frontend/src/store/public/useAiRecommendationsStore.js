import { create } from 'zustand';
import api from '../../services/api';

const useAiRecommendationsStore = create((set) => ({
  recommendations: [],
  isLoading: false,

  fetchRecommendations: async (slug) => {
    set({ isLoading: true });
    try {
      // The backend requires the slug as a query parameter
      const response = await api.get(`/ai/recommendations?slug=${slug}`);
      set({ recommendations: response.data, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch AI recommendations', error);
      set({ recommendations: [], isLoading: false });
    }
  }
}));

export default useAiRecommendationsStore;