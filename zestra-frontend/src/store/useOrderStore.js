import { create } from 'zustand';
import api from '../services/api';
import toast from 'react-hot-toast';

const useOrderStore = create((set) => ({
  currentOrder: null,
  isLoading: false,

  placeOrder: async (slug, cartItems) => {
    set({ isLoading: true });
    try {
      // Map the frontend cart structure to the backend expected schema (menu_item_id, quantity)
      const payload = {
        items: cartItems.map((item) => ({
          menu_item_id: item.id,
          quantity: item.quantity,
        })),
      };

      const response = await api.post(`/public/orders/${slug}`, payload);
      
      set({ currentOrder: response.data, isLoading: false });
      toast.success('Order placed successfully!');
      return response.data;
    } catch (error) {
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to place order.');
      set({ isLoading: false });
      return null;
    }
  },
  
  clearCurrentOrder: () => set({ currentOrder: null })
}));

export default useOrderStore;