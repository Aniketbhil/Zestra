import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShoppingBag, Image as ImageIcon, ArrowRight, Plus, Minus, UtensilsCrossed, ArrowLeft } from 'lucide-react';
import usePublicMenuStore from '../../store/public/usePublicMenuStore';
import AiRecommendations from '../../components/public/AiRecommendations';

const PublicMenu = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { 
    restaurantName, 
    categories, 
    cart, 
    isLoading, 
    fetchPublicMenu, 
    addToCart, 
    updateQuantity,
    removeFromCart,
    getCartItemCount,
    getCartTotal
  } = usePublicMenuStore();

  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    if (slug) {
      fetchPublicMenu(slug);
    }
  }, [slug, fetchPublicMenu]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-(--background) flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_var(--primary)]"></div>
          <p className="text-(--text-muted) font-bold tracking-tight">Loading Menu...</p>
        </div>
      </div>
    );
  }

  const cartCount = getCartItemCount();
  const cartTotal = getCartTotal();

  // Filter categories based on active tab
  const filteredCategories = activeCategory === 'All' 
    ? categories 
    : categories.filter(c => c.category === activeCategory);

  const getItemQuantity = (itemId) => {
    const cartItem = cart.find(item => item.id === itemId);
    return cartItem ? cartItem.quantity : 0;
  };

  return (
    <div className="min-h-screen bg-(--background) pb-32 font-sans selection:bg-(--primary) selection:text-white">
      {/* Restaurant Header - Upgraded with Glassmorphism & Back Button */}
      <header className="bg-(--background)/80 backdrop-blur-xl pt-8 pb-4 px-4 shadow-sm sticky top-0 z-40 border-b border-(--border)/50 transition-all">
        <div className="max-w-5xl mx-auto relative">
          
          {/* Back to Dashboard Button */}
          <Link 
            to="/dashboard" 
            className="absolute left-0 top-0 sm:top-2 w-10 h-10 bg-(--surface) hover:bg-(--surface-secondary) border border-(--border) rounded-xl flex items-center justify-center text-(--text) transition-colors active:scale-95 shadow-sm z-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="text-center pt-10 sm:pt-0">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-linear-to-br from-(--primary)/20 to-(--primary)/5 text-(--primary) mb-4 border border-(--primary)/10 shadow-sm">
              <UtensilsCrossed className="w-7 h-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-(--text) tracking-tight px-4">{restaurantName || 'Restaurant Menu'}</h1>
            <p className="text-(--text-secondary) font-medium text-sm sm:text-base mt-2 px-2">Scan, choose, and order directly from your table</p>
          </div>
        </div>

        {/* Category Filter Pills - Horizontally Scrollable */}
        {categories.length > 0 && (
          <div className="max-w-5xl mx-auto mt-8 flex items-center gap-2 sm:gap-3 overflow-x-auto pb-4 scrollbar-none px-2 mask-linear-fade">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-5 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                activeCategory === 'All' 
                  ? 'bg-(--text) text-(--background) shadow-md scale-105' 
                  : 'bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--text) hover:border-(--text)/30'
              }`}
            >
              All Items
            </button>
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCategory(cat.category)}
                className={`px-5 py-2 sm:px-6 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                  activeCategory === cat.category 
                    ? 'bg-(--text) text-(--background) shadow-md scale-105' 
                    : 'bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--text) hover:border-(--text)/30'
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Menu Categories & Items */}
      <main className="max-w-5xl mx-auto p-3 sm:p-6 space-y-12 mt-4 relative z-10">
        
        {/* AI Recommendations */}
        <AiRecommendations slug={slug} onAddToCart={addToCart} />

        {filteredCategories.length === 0 ? (
          <div className="text-center flex flex-col items-center justify-center py-20 bg-(--surface) rounded-4xl border border-(--border)/50 shadow-sm">
            <UtensilsCrossed className="w-12 h-12 text-(--border) mb-4" />
            <p className="text-(--text-muted) font-bold text-lg">No items found in this category.</p>
          </div>
        ) : (
          filteredCategories.map((categoryObj, idx) => (
            <div key={idx} className="space-y-6">
              <h2 className="text-xl sm:text-2xl font-black text-(--text) flex items-center gap-3 tracking-tight px-1 sm:px-0">
                <span className="w-2.5 sm:w-3 h-6 sm:h-8 rounded-full bg-(--primary)"></span>
                {categoryObj.category}
              </h2>
              
              {/* RESPONSIVE BENTO GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                {categoryObj.items.map((item) => {
                  const qty = getItemQuantity(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className="bg-(--surface) border border-(--border)/60 rounded-[20px] sm:rounded-3xl p-3 sm:p-4 flex gap-3 sm:gap-5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_12px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 items-center group relative overflow-hidden"
                    >
                      {/* Item Image */}
                      <div className="w-24 h-24 sm:w-32 sm:h-32 shrink-0 rounded-[14px] sm:rounded-2xl bg-(--surface-secondary) border border-(--border)/50 overflow-hidden flex items-center justify-center text-(--border) relative">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                        ) : (
                          <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 opacity-30" />
                        )}
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors"></div>
                      </div>
                      
                      {/* Item Details */}
                      <div className="flex-1 flex flex-col justify-between py-1 h-full min-w-0">
                        <div>
                          <div className="flex justify-between items-start gap-2 mb-1">
                            <h3 className="font-bold text-(--text) text-base sm:text-lg tracking-tight truncate">{item.name}</h3>
                            <span className="font-black text-(--primary) text-base sm:text-lg shrink-0">${parseFloat(item.price).toFixed(2)}</span>
                          </div>
                          {item.description && (
                            <p className="text-xs sm:text-sm font-medium text-(--text-muted) line-clamp-2 leading-relaxed pr-1">{item.description}</p>
                          )}
                        </div>
                        
                        {/* Action Row - Mobile Optimized */}
                        <div className="mt-auto pt-3 flex items-center justify-between gap-2">
                          <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-1 sm:px-2.5 sm:py-1 rounded-md shadow-sm border shrink-0 ${item.is_available ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                            {item.is_available ? 'Available' : 'Sold Out'}
                          </span>
                          
                          {/* Premium Interactive Stepper / Add Button */}
                          {item.is_available && (
                            qty === 0 ? (
                              <button 
                                onClick={() => addToCart(item)}
                                className="px-4 py-2 sm:px-5 sm:py-2.5 bg-(--primary) hover:bg-(--primary-hover) text-white rounded-[10px] sm:rounded-xl text-xs sm:text-sm font-bold transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] active:scale-95 flex items-center gap-1.5 shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Add
                              </button>
                            ) : (
                              <div className="flex items-center gap-1 sm:gap-3 bg-(--surface) border-2 border-(--primary)/20 px-1 py-1 sm:px-2 sm:py-1.5 rounded-xl sm:rounded-[14px] shadow-sm shrink-0">
                                <button 
                                  onClick={() => qty === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-(--surface-secondary) hover:bg-red-50 text-(--text-secondary) hover:text-red-500 flex items-center justify-center transition-colors active:scale-90 shrink-0"
                                >
                                  <Minus className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                                <span className="font-black text-xs sm:text-sm text-(--text) w-4 sm:w-5 text-center shrink-0">{qty}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-(--primary)/10 hover:bg-(--primary) text-(--primary) hover:text-white flex items-center justify-center transition-colors active:scale-90 shrink-0"
                                >
                                  <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                                </button>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </main>

      {/* Mobile Sticky Cart Footer */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-6 bg-linear-to-t from-(--background) via-(--background)/95 to-transparent z-50 pointer-events-none pb-4 sm:pb-6">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button 
              onClick={() => navigate(`/checkout/${slug}`)}
              className="w-full bg-(--text) hover:bg-gray-800 text-(--background) p-3 sm:p-5 rounded-[20px] sm:rounded-3xl shadow-[0_15px_40px_-10px_rgba(0,0,0,0.3)] flex items-center justify-between transition-all duration-300 active:scale-95 hover:-translate-y-1 border border-gray-700"
            >
              <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <div className="bg-white/10 px-3 py-1.5 sm:px-4 rounded-full font-black text-xs sm:text-sm border border-white/10 flex items-center justify-center">
                  {cartCount} <span className="hidden sm:inline ml-1">{cartCount === 1 ? 'item' : 'items'}</span>
                </div>
                <span className="font-bold text-sm sm:text-base">Checkout</span>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 font-black text-base sm:text-lg shrink-0">
                ${cartTotal.toFixed(2)}
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/10 flex items-center justify-center">
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;