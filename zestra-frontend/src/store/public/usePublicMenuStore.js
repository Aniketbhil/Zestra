import { create } from 'zustand';
import api from '../../services/api';
import toast from 'react-hot-toast';

const usePublicMenuStore = create((set, get) => ({
  restaurantName: '',
  categories: [],
  cart: [],
  isLoading: false,

  fetchPublicMenu: async (slug) => {
    set({ isLoading: true });
    try {
      // Note: We use the public endpoint which doesn't require authentication
      const response = await api.get(`/public/menu/${slug}`);
      set({ 
        restaurantName: response.data.name,
        categories: response.data.categories,
        isLoading: false 
      });
    } catch (error) {
      toast.error('Failed to load menu. The restaurant might not exist.');
      set({ isLoading: false });
    }
  },

  addToCart: (item) => {
    if (!item.is_available) {
      toast.error('This item is currently unavailable.');
      return;
    }
    
    set((state) => {
      const existingItem = state.cart.find((cartItem) => cartItem.id === item.id);
      if (existingItem) {
        return {
          cart: state.cart.map((cartItem) =>
            cartItem.id === item.id
              ? { ...cartItem, quantity: cartItem.quantity + 1 }
              : cartItem
          ),
        };
      }
      return { cart: [...state.cart, { ...item, quantity: 1 }] };
    });
    toast.success(`Added ${item.name} to cart!`);
  },

  removeFromCart: (itemId) => {
    set((state) => ({
      cart: state.cart.filter((item) => item.id !== itemId),
    }));
  },

  updateQuantity: (itemId, delta) => {
    set((state) => ({
      cart: state.cart.map((item) => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, item.quantity + delta);
          return { ...item, quantity: newQuantity };
        }
        return item;
      }),
    }));
  },

  getCartTotal: () => {
    return get().cart.reduce((total, item) => total + (parseFloat(item.price) * item.quantity), 0);
  },
  
  getCartItemCount: () => {
    return get().cart.reduce((count, item) => count + item.quantity, 0);
  },
  
  clearCart: () => set({ cart: [] })
}));

export default usePublicMenuStore;