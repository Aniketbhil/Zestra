import { useEffect } from 'react';
import { CalendarDays, Clock, MapPin, XCircle, Users, Store } from 'lucide-react';
import useReservationStore from '../../store/dashboard/useReservationStore';

const CustomerReservations = () => {
  const { myReservations, fetchMyReservations, cancelReservation, isLoading } = useReservationStore();

  useEffect(() => {
    fetchMyReservations();
  }, [fetchMyReservations]);

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this reservation?')) {
      await cancelReservation(id);
    }
  };

  if (isLoading && myReservations.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center font-sans">
        <div className="animate-pulse flex flex-col items-center">
          <CalendarDays className="w-10 h-10 text-(--primary) mb-4 opacity-50" />
          <p className="text-(--text-muted) font-bold">Loading your reservations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 font-sans px-1">
      <div>
        <h1 className="text-3xl font-black text-(--text) tracking-tight">My Reservations</h1>
        <p className="text-(--text-secondary) font-medium text-sm mt-1.5">View and manage your upcoming dining experiences.</p>
      </div>

      {myReservations.length === 0 ? (
        <div className="bg-(--surface) rounded-4xl border border-(--border)/60 p-12 text-center shadow-sm">
          <CalendarDays className="w-16 h-16 text-(--border) mx-auto mb-4" />
          <h3 className="text-xl font-black text-(--text)">No reservations found</h3>
          <p className="text-(--text-muted) mt-2">You haven't booked any tables yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {myReservations.map((res) => (
            <div key={res.id} className="bg-(--surface) border border-(--border)/60 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
              
              {res.status === 'cancelled' && (
                <div className="absolute inset-0 bg-red-500/5 backdrop-blur-[1px] z-10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="bg-red-500 text-white font-black px-4 py-2 rounded-full transform rotate-12 text-lg tracking-widest shadow-lg">CANCELLED</span>
                </div>
              )}

              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-(--primary)/10 text-(--primary) flex items-center justify-center">
                    <Store className="w-6 h-6" />
                  </div>
                  <div>
                    {/* The API doesn't return restaurant_name directly here, so we show the ID for now. 
                        In a real scenario, you'd populate this field in the backend response. */}
                    <h3 className="font-black text-(--text) text-lg truncate w-48">Restaurant Booking</h3>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md mt-1 inline-block ${
                      res.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                      res.status === 'completed' ? 'bg-purple-50 text-purple-600' :
                      'bg-red-50 text-red-600'
                    }`}>
                      {res.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8 bg-(--background) p-4 rounded-2xl border border-(--border)/50">
                <div className="flex items-center gap-3 text-sm font-bold text-(--text-secondary)">
                  <CalendarDays className="w-4 h-4 text-(--primary)" />
                  {new Date(res.reservation_date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-(--text-secondary)">
                  <Clock className="w-4 h-4 text-(--primary)" />
                  {res.reservation_time.slice(0, 5)}
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-(--text-secondary)">
                  <Users className="w-4 h-4 text-(--primary)" />
                  Party of {res.party_size}
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-(--text-secondary)">
                  <MapPin className="w-4 h-4 text-(--primary)" />
                  Table ID: {res.table_id.slice(0, 8)}
                </div>
              </div>

              {res.status === 'confirmed' && (
                <button 
                  onClick={() => handleCancel(res.id)}
                  className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 hover:border-red-300 font-bold rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-95"
                >
                  <XCircle className="w-4 h-4" /> Cancel Reservation
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomerReservations;