import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, UtensilsCrossed, ArrowRight, Store, CheckCircle2, ChevronLeft } from 'lucide-react';

// MOCK DATA: Since the backend doesn't have a public "GET /restaurants" endpoint yet, 
// we use this to let customers click and select a restaurant for the hackathon demo.
const DEMO_RESTAURANTS = [
  { 
    id: 1, 
    name: "S. G. Dhaba", 
    slug: "s-g-dhaba", 
    image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=300&fit=crop" 
  },
  { 
    id: 2, 
    name: "The Pizza Oven", 
    slug: "pizza-oven", 
    image: "https://images.unsplash.com/photo-1513104890d38-7c0f4fff45f1?w=400&h=300&fit=crop" 
  },
  { 
    id: 3, 
    name: "Burger Joint", 
    slug: "burger-joint", 
    image: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop" 
  }
];

const CustomerHome = () => {
  const navigate = useNavigate();
  
  // Step Management: 1 = Select Restaurant, 2 = Choose Action, 3 = Enter Order ID
  const [step, setStep] = useState(1);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [orderId, setOrderId] = useState('');

  const handleContinue = () => {
    if (selectedRestaurant) setStep(2);
  };

  const handleTrackSubmit = (e) => {
    e.preventDefault();
    if (orderId.trim() && selectedRestaurant) {
      // Slug is automatically included from the selected restaurant!
      navigate(`/tracking/${selectedRestaurant.slug}/${orderId.trim()}`);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] py-8 text-center max-w-2xl mx-auto px-4 relative">
      
      {/* STEP 1: Select Restaurant */}
      {step === 1 && (
        <div className="w-full animate-in fade-in zoom-in-95 duration-300">
          <div className="mb-8">
            <div className="w-20 h-20 bg-(--primary)/10 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm border border-(--primary)/20">
              <Store className="w-8 h-8 text-(--primary)" />
            </div>
            <h2 className="text-3xl font-extrabold text-(--text)">Where are you eating?</h2>
            <p className="text-(--text-secondary) mt-2">Select your restaurant to view the menu or track your order.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 text-left">
            {DEMO_RESTAURANTS.map((restaurant) => (
              <button
                key={restaurant.id}
                onClick={() => setSelectedRestaurant(restaurant)}
                className={`relative rounded-[20px] overflow-hidden border-2 transition-all duration-200 shadow-sm ${
                  selectedRestaurant?.id === restaurant.id 
                    ? 'border-(--primary) ring-4 ring-(--primary)/10 scale-[1.02]' 
                    : 'border-(--border) hover:border-(--primary)/50 bg-(--surface)'
                }`}
              >
                <div className="h-28 w-full bg-gray-200">
                  <img src={restaurant.image} alt={restaurant.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-3 bg-(--surface)">
                  <h3 className="font-bold text-(--text) text-sm">{restaurant.name}</h3>
                </div>
                {selectedRestaurant?.id === restaurant.id && (
                  <div className="absolute top-2 right-2 bg-white rounded-full text-(--primary) shadow-md">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
              </button>
            ))}
          </div>

          <button 
            onClick={handleContinue}
            disabled={!selectedRestaurant}
            className="w-full sm:w-auto min-w-50 py-3.5 bg-(--primary) hover:bg-(--primary-hover) text-white font-bold rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 mx-auto shadow-md shadow-(--primary)/20"
          >
            Continue <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* STEP 2: Choose Action */}
      {step === 2 && (
        <div className="w-full animate-in fade-in slide-in-from-right-8 duration-300">
          <button 
            onClick={() => setStep(1)} 
            className="flex items-center gap-1 text-(--text-muted) hover:text-(--text) font-medium text-sm mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back to restaurants
          </button>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-(--text)">Welcome to {selectedRestaurant?.name}</h2>
            <p className="text-(--text-secondary) mt-2">What would you like to do today?</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg mx-auto">
            {/* Direct navigation to View Menu */}
            <button 
              onClick={() => navigate(`/menu/${selectedRestaurant?.slug}`)}
              className="bg-(--surface) p-8 rounded-3xl border border-(--border) shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-(--primary)/30 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <QrCode className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-(--text)">View Menu</h3>
              <p className="text-sm text-(--text-muted) mt-2">Order directly from your phone</p>
            </button>
            
            <button 
              onClick={() => setStep(3)}
              className="bg-(--surface) p-8 rounded-3xl border border-(--border) shadow-sm hover:shadow-lg hover:-translate-y-1 hover:border-blue-500/30 transition-all flex flex-col items-center text-center group"
            >
              <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Search className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-(--text)">Track Order</h3>
              <p className="text-sm text-(--text-muted) mt-2">Check live kitchen status</p>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Track Order (Auto-filled Slug) */}
      {step === 3 && (
        <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-8 duration-300">
          <button 
            onClick={() => setStep(2)} 
            className="flex items-center gap-1 text-(--text-muted) hover:text-(--text) font-medium text-sm mb-6 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          <form onSubmit={handleTrackSubmit} className="bg-(--surface) p-8 rounded-3xl border border-(--border) shadow-xl text-left">
            <div className="flex items-center gap-3 mb-6 border-b border-(--border) pb-6">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-(--text)">Find Your Order</h3>
                <p className="text-sm text-(--text-muted)">at {selectedRestaurant?.name}</p>
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
                  placeholder="Paste your Order ID here" 
                  className="w-full px-4 py-3.5 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-(--text) transition-all"
                />
              </div>
              <button type="submit" className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-[14px] transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-500/25">
                Find Order <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
};

export default CustomerHome;