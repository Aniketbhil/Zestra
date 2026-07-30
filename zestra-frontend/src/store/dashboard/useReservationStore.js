import { create } from 'zustand';
import api from '../../services/api';
import toast from 'react-hot-toast';

const useReservationStore = create((set) => ({
  publicTables: [],
  myReservations: [],
  restaurantReservations: [],
  isLoading: false,

  // PUBLIC: Get table availability (used for the "Movie Ticket" screen)
  fetchPublicTables: async (slug, date) => {
    set({ isLoading: true });
    try {
      const response = await api.get(`/public/tables/${slug}?date=${date}`);
      set({ publicTables: response.data, isLoading: false });
      return response.data;
    } catch (error) {
      toast.error('Failed to load table availability.');
      set({ isLoading: false });
      return [];
    }
  },

  // CUSTOMER: Book a table
  createReservation: async (reservationData) => {
    set({ isLoading: true });
    try {
      const response = await api.post('/reservations', reservationData);
      toast.success('Reservation Successfully!');
      set({ isLoading: false });
      return response.data;
    } catch (error) {
      const msg = error.response?.data?.detail || 'Failed to reserve table. It might be already booked or party size exceeds capacity.';
      toast.error(msg);
      set({ isLoading: false });
      return null;
    }
  },

  // CUSTOMER: Fetch their own reservations
  fetchMyReservations: async () => {
    set({ isLoading: true });
    try {
      const response = await api.get('/reservations/me');
      set({ myReservations: response.data, isLoading: false });
    } catch (error) {
      toast.error('Failed to load your reservations.');
      set({ isLoading: false });
    }
  },

  // CUSTOMER: Cancel their own reservation
  cancelReservation: async (reservationId) => {
    set({ isLoading: true });
    try {
      await api.patch(`/reservations/${reservationId}/cancel`);
      toast.success('Reservation cancelled successfully.');
      
      // Refresh the list immediately
      const response = await api.get('/reservations/me');
      set({ myReservations: response.data, isLoading: false });
      return true;
    } catch (error) {
      toast.error('Failed to cancel reservation.');
      set({ isLoading: false });
      return false;
    }
  },

  // RESTAURANT: Fetch all reservations for their restaurant
  fetchRestaurantReservations: async (date = null) => {
    set({ isLoading: true });
    try {
      const url = date ? `/dashboard/reservations?date=${date}` : '/dashboard/reservations';
      const response = await api.get(url);
      set({ restaurantReservations: response.data, isLoading: false });
    } catch (error) {
      toast.error('Failed to load reservations.');
      set({ isLoading: false });
    }
  },

  // RESTAURANT: Mark reservation as completed or cancelled
  updateReservationStatus: async (reservationId, status) => {
    set({ isLoading: true });
    try {
      await api.patch(`/dashboard/reservations/${reservationId}/status`, { status });
      toast.success(`Reservation marked as ${status}`);
      
      // Refresh the list immediately
      const response = await api.get('/dashboard/reservations');
      set({ restaurantReservations: response.data, isLoading: false });
      return true;
    } catch (error) {
      toast.error('Failed to update reservation status.');
      set({ isLoading: false });
      return false;
    }
  }
}));

export default useReservationStore;