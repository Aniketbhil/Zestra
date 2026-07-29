import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, UtensilsCrossed, ArrowRight, Store, CheckCircle2, ChevronLeft, Loader2 } from 'lucide-react';
import api from '../../services/api';

const CustomerHome = () => {
  const navigate = useNavigate();
  
  // Step Management: 1 = Select Restaurant, 2 = Choose Action, 3 = Track Order, 4 = View QR Code
  const [step, setStep] = useState(1);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [orderId, setOrderId] = useState('');
  
  // Live Backend Data State
  const [restaurants, setRestaurants] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const response = await api.get('/public/restaurants');
        setRestaurants(response.data);
      } catch (error) {
        console.error("Failed to fetch restaurants:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRestaurants();
  }, []);

  const handleContinue = () => {
    if (selectedRestaurant) setStep(2);
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (orderId.trim() && selectedRestaurant) {
      navigate(`/tracking/${selectedRestaurant.slug}/${orderId.trim()}`);
    }
  };

  // Skip the restricted backend endpoint entirely and instantly show the UI
  const handleViewQR = () => {
    setStep(4);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] py-8 sm:py-12 text-center w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative font-sans selection:bg-(--primary) selection:text-white">
      
      {/* Ambient Background Glows */}
      <div className="absolute top-10 left-10 w-64 h-64 bg-(--primary)/5 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500/5 rounded-full blur-[80px] pointer-events-none"></div>

      {/* STEP 1: Select Restaurant */}
      {step === 1 && (
        <div className="w-full animate-in fade-in zoom-in-95 duration-500 relative z-10">
          <div className="mb-10 sm:mb-14 text-center">
            <div className="w-20 h-20 bg-linear-to-br from-(--primary)/20 to-(--primary)/5 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-(--primary)/10 relative">
              <div className="absolute inset-0 bg-(--primary)/20 blur-xl rounded-full animate-pulse"></div>
              <Store className="w-10 h-10 text-(--primary) relative z-10" />
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-(--text) tracking-tight">Where are you eating?</h2>
            <p className="text-base sm:text-lg font-medium text-(--text-secondary) mt-3 max-w-md mx-auto">Select your restaurant to view the live menu or track an order.</p>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_var(--primary)]"></div>
              <p className="text-(--text) font-bold tracking-tight">Finding nearby restaurants...</p>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-(--border)/60 rounded-4xl mb-8 bg-(--surface) max-w-2xl mx-auto shadow-sm">
              <Store className="w-12 h-12 text-(--border) mx-auto mb-4" />
              <h3 className="text-xl font-black text-(--text)">No restaurants found</h3>
              <p className="text-sm font-medium text-(--text-muted) mt-2">Check back later when new places are added!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 mb-10 text-left w-full">
              {restaurants.map((restaurant) => (
                <button
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurant(restaurant)}
                  className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-300 flex flex-col h-full active:scale-[0.98] group ${
                    selectedRestaurant?.id === restaurant.id 
                      ? 'border-(--primary) ring-4 ring-(--primary)/10 scale-[1.02] sm:scale-105 shadow-[0_10px_30px_rgba(16,185,129,0.15)] bg-(--surface)' 
                      : 'border-(--border)/60 hover:border-(--primary)/40 bg-(--surface) shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgb(0,0,0,0.06)] hover:-translate-y-1'
                  }`}
                >
                  <div className="h-36 sm:h-44 w-full bg-(--surface-secondary) flex items-center justify-center shrink-0 relative overflow-hidden">
                    {restaurant.image_url ? (
                      <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                    ) : (
                      <div className="flex flex-col items-center text-(--border)">
                        <UtensilsCrossed className="w-10 h-10 mb-2 opacity-50" />
                        <span className="text-xs font-black uppercase tracking-widest opacity-50">No Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/10 to-transparent opacity-0 sm:opacity-100 transition-opacity duration-300"></div>
                  </div>
                  <div className="p-5 sm:p-6 bg-(--surface) flex-1 flex flex-col justify-center relative z-10">
                    <h3 className="font-black text-(--text) text-lg sm:text-xl line-clamp-1 tracking-tight">{restaurant.name}</h3>
                    {restaurant.address && (
                      <p className="text-xs sm:text-sm font-medium text-(--text-muted) mt-1.5 line-clamp-1">{restaurant.address}</p>
                    )}
                  </div>
                  {selectedRestaurant?.id === restaurant.id && (
                    <div className="absolute top-4 right-4 bg-white rounded-full text-(--primary) shadow-lg shadow-(--primary)/30 animate-in zoom-in duration-300 z-20">
                      <CheckCircle2 className="w-7 h-7" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <button 
            onClick={handleContinue}
            disabled={!selectedRestaurant}
            className="w-full sm:w-auto min-w-70 py-4 sm:py-5 bg-(--primary) hover:bg-(--primary-hover) disabled:bg-(--text-muted) disabled:shadow-none disabled:translate-y-0 text-white font-black rounded-[20px] transition-all duration-300 flex justify-center items-center gap-3 mx-auto shadow-[0_10px_30px_rgba(16,185,129,0.3)] active:scale-95 hover:-translate-y-1 text-base sm:text-lg border border-(--primary-hover)"
          >
            Continue <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* STEP 2: Choose Action */}
      {step === 2 && (
        <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-500 relative z-10">
          <button 
            onClick={() => setStep(1)} 
            className="flex items-center gap-2 text-(--text-secondary) hover:text-(--text) font-bold text-sm sm:text-base mb-8 transition-colors mx-auto sm:mx-0 p-2 -ml-2 rounded-lg hover:bg-(--surface)"
          >
            <ChevronLeft className="w-5 h-5" /> Back to restaurants
          </button>

          <div className="mb-10 sm:mb-12 text-center sm:text-left">
            <h2 className="text-3xl sm:text-5xl font-black text-(--text) tracking-tight">Welcome to {selectedRestaurant?.name}</h2>
            <p className="text-base sm:text-lg font-medium text-(--text-secondary) mt-3">What would you like to do today?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 w-full">
            {/* View Menu Bento */}
            <button 
              onClick={() => navigate(`/menu/${selectedRestaurant?.slug}`)}
              className="bg-(--surface) p-8 sm:p-10 rounded-4xl border border-(--border)/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(16,185,129,0.1)] hover:-translate-y-2 hover:border-emerald-500/30 transition-all duration-300 flex flex-col items-center text-center group active:scale-95"
            >
              <div className="w-20 h-20 bg-linear-to-br from-emerald-100 to-emerald-50 text-emerald-600 rounded-[20px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-emerald-100">
                <UtensilsCrossed className="w-10 h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-(--text) tracking-tight">View Menu</h3>
              <p className="text-sm font-medium text-(--text-secondary) mt-2">Order directly from your phone</p>
            </button>
            
            {/* Track Order Bento */}
            <button 
              onClick={() => setStep(3)}
              className="bg-(--surface) p-8 sm:p-10 rounded-4xl border border-(--border)/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(59,130,246,0.1)] hover:-translate-y-2 hover:border-blue-500/30 transition-all duration-300 flex flex-col items-center text-center group active:scale-95"
            >
              <div className="w-20 h-20 bg-linear-to-br from-blue-100 to-blue-50 text-blue-600 rounded-[20px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-blue-100">
                <Search className="w-10 h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-(--text) tracking-tight">Track Order</h3>
              <p className="text-sm font-medium text-(--text-secondary) mt-2">Check live kitchen status</p>
            </button>

            {/* Restaurant QR Bento */}
            <button 
              onClick={handleViewQR}
              className="bg-(--surface) p-8 sm:p-10 rounded-4xl border border-(--border)/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(168,85,247,0.1)] hover:-translate-y-2 hover:border-purple-500/30 transition-all duration-300 flex flex-col items-center text-center group active:scale-95"
            >
              <div className="w-20 h-20 bg-linear-to-br from-purple-100 to-purple-50 text-purple-600 rounded-[20px] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 shadow-sm border border-purple-100">
                <QrCode className="w-10 h-10" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-(--text) tracking-tight">Share Menu</h3>
              <p className="text-sm font-medium text-(--text-secondary) mt-2">Generate QR for a friend</p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Track Order */}
      {step === 3 && (
        <div className="w-full max-w-lg mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 relative z-10">
          <button 
            onClick={() => setStep(2)} 
            className="flex items-center gap-2 text-(--text-secondary) hover:text-(--text) font-bold text-sm sm:text-base mb-8 transition-colors p-2 -ml-2 rounded-lg hover:bg-(--surface)"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>

          <form onSubmit={handleTrackSubmit} className="bg-linear-to-br from-(--surface) to-(--surface-secondary) p-8 sm:p-10 rounded-4xl border border-(--border)/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-left">
            <div className="flex items-center gap-4 sm:gap-5 mb-8 border-b border-(--border)/50 pb-8">
              <div className="w-14 h-14 bg-linear-to-br from-blue-100 to-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
                <Search className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-(--text) leading-tight tracking-tight">Find Your Order</h3>
                <p className="text-sm font-medium text-(--text-muted) mt-1 line-clamp-1">at {selectedRestaurant?.name}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-(--text-secondary) mb-3">Enter Order ID</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="e.g. ord_123abc" 
                  className="w-full px-5 py-4 sm:py-5 bg-(--background) border-2 border-(--border) rounded-[20px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-(--text) font-mono font-bold transition-all text-base sm:text-lg placeholder:text-(--text-muted)/50 placeholder:font-sans placeholder:font-medium shadow-inner"
                />
              </div>
              <button type="submit" className="w-full py-4 sm:py-5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-lg rounded-[20px] shadow-[0_10px_30px_rgba(59,130,246,0.3)] transition-all active:scale-95 hover:-translate-y-1 flex items-center justify-center gap-2 border border-blue-500/50">
                Track Live Status <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 4: View Restaurant QR Code */}
      {step === 4 && (
        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-500 relative z-10">
          <button 
            onClick={() => setStep(2)} 
            className="flex items-center gap-2 text-(--text-secondary) hover:text-(--text) font-bold text-sm sm:text-base mb-8 transition-colors p-2 -ml-2 rounded-lg hover:bg-(--surface)"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>

          <div className="bg-(--surface) p-8 sm:p-10 rounded-4xl border border-(--border)/60 shadow-[0_20px_50px_rgba(0,0,0,0.05)] text-center relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-[30px] pointer-events-none"></div>

            <h3 className="text-3xl font-black text-(--text) mb-2 tracking-tight">{selectedRestaurant?.name}</h3>
            <p className="text-sm font-medium text-(--text-secondary) mb-8">Scan this code to load the live menu.</p>

            <div className="p-5 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-200 inline-block">
              {/* Using a free, instant QR Code API to bypass the backend 403 error */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/menu/' + selectedRestaurant?.slug)}`} 
                alt={`${selectedRestaurant?.name} QR Code`} 
                className="w-56 h-56 object-contain"
              />
            </div>
            
            <p className="text-xs font-bold text-(--text-muted) uppercase tracking-widest mt-8">
              Powered by Zestra OS
            </p>
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerHome;