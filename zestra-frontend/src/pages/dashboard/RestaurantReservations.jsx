import { useEffect } from 'react';
import { CalendarDays, Clock, CheckCircle2, Users, XCircle } from 'lucide-react';
import useReservationStore from '../../store/dashboard/useReservationStore';

const RestaurantReservations = () => {
  const { restaurantReservations, fetchRestaurantReservations, updateReservationStatus, isLoading } = useReservationStore();

  useEffect(() => {
    fetchRestaurantReservations();
  }, [fetchRestaurantReservations]);

  const handleUpdate = async (id, status) => {
    await updateReservationStatus(id, status);
  };

  if (isLoading && restaurantReservations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center font-sans">
        <div className="animate-pulse flex flex-col items-center">
          <CalendarDays className="w-10 h-10 text-(--primary) mb-4 opacity-50" />
          <p className="text-(--text-muted) font-bold">Loading table reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 font-sans px-1">
      <div>
        <h1 className="text-3xl font-black text-(--text) tracking-tight">Table Management</h1>
        <p className="text-(--text-secondary) font-medium text-sm mt-1.5">Manage customer table bookings and capacity.</p>
      </div>

      <div className="bg-(--surface) rounded-4xl border border-(--border)/60 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-(--border)/60 flex justify-between items-center bg-(--surface-secondary)/30">
          <h2 className="text-xl font-black text-(--text)">All Reservations</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-(--background) text-xs uppercase tracking-widest text-(--text-muted) border-b border-(--border)/60">
                <th className="p-4 font-black">Date & Time</th>
                <th className="p-4 font-black">Table ID</th>
                <th className="p-4 font-black">Party Size</th>
                <th className="p-4 font-black">Status</th>
                <th className="p-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {restaurantReservations.length === 0 ? (
                <tr>
                  <td colSpan="5" className="p-8 text-center text-(--text-muted) font-medium">No reservations found.</td>
                </tr>
              ) : (
                restaurantReservations.map((res) => (
                  <tr key={res.id} className="border-b border-(--border)/40 hover:bg-(--surface-secondary)/30 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-(--text)">{new Date(res.reservation_date).toLocaleDateString()}</div>
                      <div className="text-xs text-(--text-secondary) flex items-center gap-1 mt-1"><Clock className="w-3 h-3"/> {res.reservation_time.slice(0, 5)}</div>
                    </td>
                    <td className="p-4 font-mono text-xs font-bold text-(--text-secondary)">{res.table_id.slice(0, 8)}</td>
                    <td className="p-4">
                      <div className="inline-flex items-center gap-1.5 bg-(--background) px-2 py-1 rounded-md border border-(--border) font-bold text-sm">
                        <Users className="w-3.5 h-3.5 text-(--text-muted)" /> {res.party_size}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md ${
                        res.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        res.status === 'completed' ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                        'bg-red-50 text-red-600 border border-red-100'
                      }`}>
                        {res.status}
                      </span>
                    </td>
                    <td className="p-4 text-right space-x-2">
                      {res.status === 'confirmed' && (
                        <>
                          <button onClick={() => handleUpdate(res.id, 'completed')} className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors inline-flex" title="Mark Completed (Unlock Table)">
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleUpdate(res.id, 'cancelled')} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors inline-flex" title="Mark No-Show (Cancel)">
                            <XCircle className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RestaurantReservations;