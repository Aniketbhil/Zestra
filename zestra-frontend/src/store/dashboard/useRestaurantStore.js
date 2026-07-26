import { create } from 'zustand';
import api from '../../services/api';
import toast from 'react-hot-toast';

const useRestaurantStore = create((set) => ({
  restaurant: null,
  qrData: null,
  isLoading: false,

  onboardRestaurant: async (restaurantData) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/restaurants/onboard', restaurantData);
      set({ restaurant: response.data, isLoading: false });
      toast.success('Restaurant setup complete!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to setup restaurant.');
      set({ isLoading: false });
      return false;
    }
  },

  // This is the missing function!
  fetchMyRestaurant: async () => {
    try {
      const response = await api.get('/restaurants/me');
      set({ restaurant: response.data });
    } catch (error) {
      // If 404, they haven't onboarded yet, which is fine.
      set({ restaurant: null });
    }
  },

  fetchQrCode: async (slug) => {
    if (!slug) return;
    set({ isLoading: true });
    try {
      const response = await api.get(`/restaurants/${slug}/qrcode`);
      set({ qrData: response.data, isLoading: false });
    } catch (error) {
      toast.error('Failed to load QR Code.');
      set({ isLoading: false });
    }
  }
}));

export default useRestaurantStore;