import { create } from 'zustand';
import api from '../../services/api';
import toast from 'react-hot-toast';

const useRestaurantOrderStore = create((set, get) => ({
  orders: [],
  isLoading: false,
  wsConnection: null,

  fetchOrders: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/orders');
      set({ orders: response.data, isLoading: false });
    } catch (error) {
      toast.error('Failed to load orders.');
      set({ isLoading: false });
    }
  },

  updateOrderStatus: async (orderId, newStatus) => {
    try {
      const response = await api.patch(`/orders/${orderId}/status`, { status: newStatus });
      
      // Update local state immediately for a snappy UI
      set((state) => ({
        orders: state.orders.map((order) => 
          order.id === orderId ? response.data : order
        )
      }));
      
      toast.success(`Order marked as ${newStatus}`);
      return true;
    } catch (error) {
      toast.error('Failed to update order status.');
      return false;
    }
  },

  connectDashboardStream: (slug) => {
    // Prevent duplicate connections
    if (get().wsConnection) return;

    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
    const wsBaseUrl = apiBaseUrl.replace(/^http/, 'ws').replace(/\/api\/v1\/?$/, '');
    const ws = new WebSocket(`${wsBaseUrl}/ws/orders/${slug}`);

    ws.onopen = () => console.log('Dashboard connected to live order stream');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      set((state) => {
        const existingOrder = state.orders.find(o => o.id === (data.order_id || data.id));
        
        // If it's an existing order status update
        if (existingOrder) {
          if (data.status) toast(`Order #${existingOrder.id.split('-')[0]} is now ${data.status}`);
          return {
            orders: state.orders.map(o => 
              o.id === (data.order_id || data.id) ? { ...o, ...data } : o
            )
          };
        } 
        
        // If it's a completely new order arriving
        if (data.id) {
          toast.success('🔔 New order received!');
          return { orders: [data, ...state.orders] };
        }
        
        return state;
      });
    };

    ws.onerror = () => console.error('Dashboard WebSocket connection error');

    set({ wsConnection: ws });
  },

  disconnectDashboardStream: () => {
    const ws = get().wsConnection;
    if (ws) {
      ws.close();
      set({ wsConnection: null });
    }
  }
}));

export default useRestaurantOrderStore;