import { create } from 'zustand';
import api from '../../services/api';
import toast from 'react-hot-toast';

const useInventoryStore = create((set, get) => ({
  inventoryItems: [],
  isLoading: false,

  fetchInventory: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/inventory');
      set({ inventoryItems: response.data, isLoading: false });
    } catch (error) {
      toast.error('Failed to load inventory.');
      set({ isLoading: false });
    }
  },

  addInventoryItem: async (itemData) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/inventory', itemData);
      set({ 
        inventoryItems: [...get().inventoryItems, response.data],
        isLoading: false 
      });
      toast.success('Inventory item added!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail?.[0]?.msg || 'Failed to add item.');
      set({ isLoading: false });
      return false;
    }
  },

  updateInventoryItem: async (itemId, updateData) => {
    set({ isLoading: true });
    try {
      const response = await api.patch(`/inventory/${itemId}`, updateData);
      set({
        inventoryItems: get().inventoryItems.map(item => 
          item.id === itemId ? response.data : item
        ),
        isLoading: false
      });
      toast.success('Inventory updated!');
      return true;
    } catch (error) {
      toast.error('Failed to update inventory.');
      set({ isLoading: false });
      return false;
    }
  },

  deleteInventoryItem: async (itemId) => {
    try {
      await api.delete(`/inventory/${itemId}`);
      set({
        inventoryItems: get().inventoryItems.filter(item => item.id !== itemId)
      });
      toast.success('Item removed from inventory.');
    } catch (error) {
      toast.error('Failed to delete item.');
    }
  }
}));

export default useInventoryStore;