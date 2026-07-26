import { create } from 'zustand';
import api from '../services/api';
import toast from 'react-hot-toast';

const useOrderStore = create((set, get) => ({
  currentOrder: null,
  isLoading: false,
  wsConnection: null,

  placeOrder: async (slug, cartItems) => {
    set({ isLoading: true });
    try {
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

  connectToOrderStream: (slug, orderId) => {
    // Prevent multiple connections
    if (get().wsConnection) return;

    // Adjust this URL based on Aniket's exact WebSocket route setup
    const ws = new WebSocket(`ws://localhost:8000/api/v1/ws/orders/${slug}`);

    ws.onopen = () => {
      console.log('Connected to live order stream');
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      // If this update belongs to our current order, update the status!
      if (data.order_id === orderId && data.status) {
        set((state) => ({
          currentOrder: { ...state.currentOrder, status: data.status }
        }));
        
        // Notify the user playfully based on status
        if (data.status === 'preparing') toast('👨‍🍳 The chef is preparing your food!');
        if (data.status === 'ready') toast.success('🎉 Your order is ready!');
      }
    };

    ws.onerror = () => {
      console.error('WebSocket connection error');
    };

    set({ wsConnection: ws });
  },

  disconnectStream: () => {
    const ws = get().wsConnection;
    if (ws) {
      ws.close();
      set({ wsConnection: null });
    }
  },
  
  clearCurrentOrder: () => set({ currentOrder: null })
}));

export default useOrderStore;