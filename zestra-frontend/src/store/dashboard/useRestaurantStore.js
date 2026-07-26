import { create } from 'zustand';
import api from '../../services/api';
import toast from 'react-hot-toast';

const useRestaurantStore = create((set, get) => ({
  restaurant: null,
  qrData: null,
  isLoading: false,

  onboardRestaurant: async (restaurantData) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/restaurants/onboard', restaurantData);
      const data = response.data;
      
      // Save slug to local storage so we remember it on refresh
      localStorage.setItem('restaurant_slug', data.slug);
      
      set({ restaurant: data, isLoading: false });
      toast.success('Restaurant setup complete!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to setup restaurant.');
      set({ isLoading: false });
      return false;
    }
  },

  fetchQrCode: async () => {
    // const slug = localStorage.getItem('restaurant_slug');
    const slug = 's-g-dhaba';       // tempprary
    if (!slug) {
      toast.error('Restaurant profile not found. Please complete onboarding.');
      return;
    }

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