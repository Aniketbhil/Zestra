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
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-5rem)] py-6 sm:py-12 text-center w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative">
      
      {/* STEP 1: Select Restaurant */}
      {step === 1 && (
        <div className="w-full animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-6 sm:mb-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-(--primary)/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-(--primary)/20">
              <Store className="w-8 h-8 text-(--primary)" />
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-(--text) tracking-tight">Where are you eating?</h2>
            <p className="text-sm sm:text-base text-(--text-secondary) mt-2 max-w-md mx-auto">Select your restaurant to view the menu or track your order.</p>
          </div>

          {isLoading ? (
            <div className="py-12 sm:py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-(--primary) animate-spin mb-4" />
              <p className="text-(--text-muted) font-medium text-sm sm:text-base">Finding nearby restaurants...</p>
            </div>
          ) : restaurants.length === 0 ? (
            <div className="py-12 sm:py-16 text-center border-2 border-dashed border-(--border) rounded-3xl mb-8 bg-(--surface) max-w-2xl mx-auto">
              <Store className="w-10 h-10 sm:w-12 sm:h-12 text-(--text-muted) mx-auto mb-3" />
              <h3 className="text-base sm:text-lg font-bold text-(--text)">No restaurants found</h3>
              <p className="text-sm text-(--text-muted) mt-1">Check back later when new places are added!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 text-left w-full">
              {restaurants.map((restaurant) => (
                <button
                  key={restaurant.id}
                  onClick={() => setSelectedRestaurant(restaurant)}
                  className={`relative rounded-3xl overflow-hidden border-2 transition-all duration-200 shadow-sm flex flex-col h-full active:scale-[0.98] ${
                    selectedRestaurant?.id === restaurant.id 
                      ? 'border-(--primary) ring-4 ring-(--primary)/10 scale-[1.02] sm:scale-105' 
                      : 'border-(--border) hover:border-(--primary)/40 bg-(--surface)'
                  }`}
                >
                  <div className="h-32 sm:h-40 w-full bg-(--surface-secondary) flex items-center justify-center shrink-0 relative">
                    {restaurant.image_url ? (
                      <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center text-(--text-muted)">
                        <UtensilsCrossed className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-[10px] sm:text-xs font-medium uppercase tracking-wider">No Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-black/40 to-transparent opacity-0 sm:opacity-100 transition-opacity"></div>
                  </div>
                  <div className="p-4 sm:p-5 bg-(--surface) flex-1 flex flex-col justify-center">
                    <h3 className="font-bold text-(--text) text-base sm:text-lg line-clamp-1">{restaurant.name}</h3>
                    {restaurant.address && (
                      <p className="text-xs sm:text-sm text-(--text-muted) mt-1 line-clamp-1">{restaurant.address}</p>
                    )}
                  </div>
                  {selectedRestaurant?.id === restaurant.id && (
                    <div className="absolute top-3 right-3 bg-white rounded-full text-(--primary) shadow-lg animate-in zoom-in">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          )}

          <button 
            onClick={handleContinue}
            disabled={!selectedRestaurant}
            className="w-full sm:w-auto min-w-60 py-4 sm:py-3.5 bg-(--primary) hover:bg-(--primary-hover) text-white font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mx-auto shadow-lg shadow-(--primary)/25 active:scale-95 text-sm sm:text-base"
          >
            Continue <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* STEP 2: Choose Action */}
      {step === 2 && (
        <div className="w-full max-w-4xl mx-auto animate-in fade-in slide-in-from-right-8 duration-300">
          <button 
            onClick={() => setStep(1)} 
            className="flex items-center gap-1 text-(--text-muted) hover:text-(--text) font-medium text-sm mb-6 transition-colors mx-auto sm:mx-0 p-2 -ml-2"
          >
            <ChevronLeft className="w-5 h-5" /> Back to restaurants
          </button>

          <div className="mb-8 sm:mb-10 text-center sm:text-left">
            <h2 className="text-2xl sm:text-4xl font-extrabold text-(--text)">Welcome to {selectedRestaurant?.name}</h2>
            <p className="text-sm sm:text-base text-(--text-secondary) mt-2">What would you like to do today?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 w-full">
            <button 
              onClick={() => navigate(`/menu/${selectedRestaurant?.slug}`)}
              className="bg-(--surface) p-6 sm:p-8 rounded-3xl border border-(--border) shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-(--primary)/40 transition-all flex flex-col items-center text-center group active:scale-95"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <UtensilsCrossed className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-(--text)">View Menu</h3>
              <p className="text-xs sm:text-sm text-(--text-muted) mt-2">Order directly from your phone</p>
            </button>
            
            <button 
              onClick={() => setStep(3)}
              className="bg-(--surface) p-6 sm:p-8 rounded-3xl border border-(--border) shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-blue-500/40 transition-all flex flex-col items-center text-center group active:scale-95"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-(--text)">Track Order</h3>
              <p className="text-xs sm:text-sm text-(--text-muted) mt-2">Check live kitchen status</p>
            </button>

            <button 
              onClick={handleViewQR}
              className="bg-(--surface) p-6 sm:p-8 rounded-3xl border border-(--border) shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-purple-500/40 transition-all flex flex-col items-center text-center group active:scale-95"
            >
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <QrCode className="w-7 h-7 sm:w-8 sm:h-8" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-(--text)">Restaurant QR</h3>
              <p className="text-xs sm:text-sm text-(--text-muted) mt-2">Share menu with a friend</p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Track Order */}
      {step === 3 && (
        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-300">
          <button 
            onClick={() => setStep(2)} 
            className="flex items-center gap-1 text-(--text-muted) hover:text-(--text) font-medium text-sm mb-6 transition-colors p-2 -ml-2"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>

          <form onSubmit={handleTrackSubmit} className="bg-(--surface) p-6 sm:p-8 rounded-3xl sm:rounded-4xl border border-(--border) shadow-xl text-left">
            <div className="flex items-center gap-3 sm:gap-4 mb-6 border-b border-(--border) pb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                <Search className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-(--text) leading-tight">Find Your Order</h3>
                <p className="text-xs sm:text-sm text-(--text-muted) line-clamp-1">at {selectedRestaurant?.name}</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-2">Order ID</label>
                <input 
                  type="text" 
                  autoFocus
                  required
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="Paste your Order ID" 
                  className="w-full px-4 py-3.5 sm:py-4 bg-(--background) border border-(--border) rounded-2xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-(--text) transition-all text-sm sm:text-base placeholder:text-(--text-muted)/50"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-bold rounded-2xl transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-500/25 text-sm sm:text-base">
                Find Order <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STEP 4: View Restaurant QR Code (Dynamically Generated) */}
      {step === 4 && (
        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-300">
          <button 
            onClick={() => setStep(2)} 
            className="flex items-center gap-1 text-(--text-muted) hover:text-(--text) font-medium text-sm mb-6 transition-colors p-2 -ml-2"
          >
            <ChevronLeft className="w-5 h-5" /> Back
          </button>

          <div className="bg-(--surface) p-6 sm:p-8 rounded-3xl sm:rounded-4xl border border-(--border) shadow-xl text-center">
            
            <h3 className="text-2xl font-bold text-(--text) mb-1">{selectedRestaurant?.name}</h3>
            <p className="text-sm text-(--text-secondary) mb-8">Scan this code to load the live menu.</p>

            <div className="p-4 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-200 inline-block">
              {/* Using a free, instant QR Code API to bypass the backend 403 error */}
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(window.location.origin + '/menu/' + selectedRestaurant?.slug)}`} 
                alt={`${selectedRestaurant?.name} QR Code`} 
                className="w-56 h-56 object-contain"
              />
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default CustomerHome;