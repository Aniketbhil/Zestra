import { create } from 'zustand';
import api from '../../services/api';
import toast from 'react-hot-toast';

const useMenuStore = create((set, get) => ({
  menuItems: [],
  isLoading: false,

  fetchMenu: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/menu');
      set({ menuItems: response.data, isLoading: false });
    } catch (error) {
      toast.error('Failed to load menu items.');
      set({ isLoading: false });
    }
  },

  addMenuItem: async (itemData) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/menu', itemData);
      set({ 
        menuItems: [...get().menuItems, response.data],
        isLoading: false 
      });
      toast.success('Menu item added successfully!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to add item.');
      set({ isLoading: false });
      return false;
    }
  },

  updateMenuItem: async (itemId, updateData) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/menu/${itemId}`, updateData);
      set({
        menuItems: get().menuItems.map(item => 
          item.id === itemId ? response.data : item
        ),
        isLoading: false
      });
      toast.success('Item updated successfully!');
      return true;
    } catch (error) {
      toast.error('Failed to update item.');
      set({ isLoading: false });
      return false;
    }
  },

  deleteMenuItem: async (itemId) => {
    try {
      await api.delete(`/menu/${itemId}`);
      set({
        menuItems: get().menuItems.filter(item => item.id !== itemId)
      });
      toast.success('Item deleted.');
    } catch (error) {
      toast.error('Failed to delete item.');
    }
  }
}));

export default useMenuStore;