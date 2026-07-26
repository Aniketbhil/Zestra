import { create } from 'zustand';
import api from '../services/api';
import toast from 'react-hot-toast';

const useRestaurantStore = create((set) => ({
  restaurant: null,
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
  
  // Future method: fetch current user's restaurant
  // fetchMyRestaurant: async () => { ... }
}));

export default useRestaurantStore;