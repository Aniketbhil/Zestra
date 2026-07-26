import { create } from 'zustand';
import api from '../../services/api';
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
      toast.error('Failed to place order.');
      set({ isLoading: false });
      return null;
    }
  },

  // Fetch order if the user refreshes the page
  fetchOrder: async (orderId) => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      set({ currentOrder: response.data });
    } catch (error) {
      toast.error('Failed to load order details.');
    }
  },

  connectToOrderStream: (orderId) => {
    if (get().wsConnection) return;

    // Use Aniket's exact WebSocket path
    const ws = new WebSocket(`ws://localhost:8000/ws/orders/track/${orderId}`);

    ws.onopen = () => console.log('Connected to live order stream');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.order_id === orderId && data.status) {
        set((state) => ({
          currentOrder: { ...state.currentOrder, status: data.status }
        }));
        
        if (data.status === 'preparing') toast('👨‍🍳 The chef is preparing your food!');
        if (data.status === 'ready') toast.success('🎉 Your order is ready!');
      }
    };

    ws.onerror = () => console.error('WebSocket connection error');

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