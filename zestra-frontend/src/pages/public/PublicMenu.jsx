import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingBag, Image as ImageIcon, ArrowRight, Plus, Minus, UtensilsCrossed } from 'lucide-react';
import usePublicMenuStore from '../../store/public/usePublicMenuStore';

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
          <div className="w-12 h-12 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-(--text-muted) font-medium">Loading Menu...</p>
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
    <div className="min-h-screen bg-(--background) pb-28">
      {/* Restaurant Header */}
      <header className="bg-(--surface) pt-10 pb-6 px-4 shadow-sm sticky top-0 z-20 border-b border-(--border)">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-(--primary)/10 text-(--primary) mb-3">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-(--text)">{restaurantName || 'Restaurant Menu'}</h1>
          <p className="text-(--text-secondary) text-sm mt-1">Scan, choose, and order directly from your table</p>
        </div>

        {/* Category Filter Pills */}
        {categories.length > 0 && (
          <div className="max-w-2xl mx-auto mt-6 flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            <button
              onClick={() => setActiveCategory('All')}
              className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeCategory === 'All' 
                  ? 'bg-(--primary) text-white shadow-sm shadow-(--primary)/25' 
                  : 'bg-(--surface-secondary) text-(--text-secondary) hover:bg-(--border)'
              }`}
            >
              All Items
            </button>
            {categories.map((cat, idx) => (
              <button
                key={idx}
                onClick={() => setActiveCategory(cat.category)}
                className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  activeCategory === cat.category 
                    ? 'bg-(--primary) text-white shadow-sm shadow-(--primary)/25' 
                    : 'bg-(--surface-secondary) text-(--text-secondary) hover:bg-(--border)'
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Menu Categories & Items */}
      <main className="max-w-2xl mx-auto p-4 space-y-8 mt-2">
        {filteredCategories.length === 0 ? (
          <div className="text-center text-(--text-muted) py-16 bg-(--surface) rounded-[20px] border border-(--border)">
            <p>No items found in this category.</p>
          </div>
        ) : (
          filteredCategories.map((categoryObj, idx) => (
            <div key={idx} className="space-y-4">
              <h2 className="text-lg font-bold text-(--text) flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-(--primary)"></span>
                {categoryObj.category}
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {categoryObj.items.map((item) => {
                  const qty = getItemQuantity(item.id);
                  return (
                    <div 
                      key={item.id} 
                      className="bg-(--surface) border border-(--border) rounded-[20px] p-4 flex gap-4 shadow-sm hover:shadow-md transition-all items-center"
                    >
                      {/* Item Image */}
                      <div className="w-24 h-24 sm:w-28 sm:h-28 shrink-0 rounded-2xl bg-(--surface-secondary) border border-(--border) overflow-hidden flex items-center justify-center text-(--text-muted)">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="w-8 h-8" />
                        )}
                      </div>
                      
                      {/* Item Details */}
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-bold text-(--text) text-base">{item.name}</h3>
                            <span className="font-bold text-(--primary) text-base">${parseFloat(item.price).toFixed(2)}</span>
                          </div>
                          {item.description && (
                            <p className="text-xs text-(--text-muted) mt-1 line-clamp-2 leading-relaxed">{item.description}</p>
                          )}
                        </div>
                        
                        <div className="mt-4 flex items-center justify-between">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${item.is_available ? 'bg-[#DCFCE7] text-[#22C55E]' : 'bg-[#FEE2E2] text-[#EF4444]'}`}>
                            {item.is_available ? 'Available' : 'Sold Out'}
                          </span>
                          
                          {/* Interactive Cart Button / Stepper */}
                          {item.is_available && (
                            qty === 0 ? (
                              <button 
                                onClick={() => addToCart(item)}
                                className="px-5 py-2 bg-(--primary) hover:bg-(--primary-hover) text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-(--primary)/20 flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add
                              </button>
                            ) : (
                              <div className="flex items-center gap-3 bg-(--surface-secondary) border border-(--border) px-3 py-1 rounded-xl">
                                <button 
                                  onClick={() => qty === 1 ? removeFromCart(item.id) : updateQuantity(item.id, -1)}
                                  className="text-(--text-secondary) hover:text-(--text) transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-bold text-xs text-(--text) w-4 text-center">{qty}</span>
                                <button 
                                  onClick={() => updateQuantity(item.id, 1)}
                                  className="text-(--primary) hover:text-(--primary-hover) transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
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
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-(--background) via-(--background) to-transparent z-30 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button 
              onClick={() => navigate(`/checkout/${slug}`)}
              className="w-full bg-(--primary) hover:bg-(--primary-hover) text-white p-4 rounded-[20px] shadow-[0_10px_30px_rgba(16,185,129,0.35)] flex items-center justify-between transition-transform active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="bg-white/20 px-3 py-1 rounded-[10px] font-bold text-sm">
                  {cartCount} items
                </div>
                <span className="font-semibold text-sm">View Cart & Checkout</span>
              </div>
              <div className="flex items-center gap-2 font-bold text-base">
                ${cartTotal.toFixed(2)}
                <ArrowRight className="w-5 h-5" />
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicMenu;