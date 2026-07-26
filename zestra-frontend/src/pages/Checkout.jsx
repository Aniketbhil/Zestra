import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Receipt, Utensils } from 'lucide-react';
import usePublicMenuStore from '../store/usePublicMenuStore';
import useOrderStore from '../store/useOrderStore';

const Checkout = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart, restaurantName } = usePublicMenuStore();
  const { placeOrder, isLoading } = useOrderStore();

  const cartTotal = getCartTotal();

  // Redirect back to menu if cart is empty
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-(--surface-secondary) rounded-full flex items-center justify-center mb-4 text-(--text-muted)">
          <Utensils className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-(--text) mb-2">Your cart is empty</h2>
        <p className="text-(--text-secondary) mb-6">Looks like you haven't added anything to your order yet.</p>
        <button 
          onClick={() => navigate(`/menu/${slug}`)}
          className="px-6 py-3 bg-(--primary) hover:bg-(--primary-hover) text-white rounded-[14px] font-semibold transition-colors shadow-sm"
        >
          Browse Menu
        </button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    const orderData = await placeOrder(slug, cart);
    if (orderData) {
      clearCart();
      // Redirect to the live tracking page (we will build this next)
      navigate(`/tracking/${orderData.id}`);
    }
  };

  return (
    <div className="min-h-screen bg-(--background) pb-28">
      {/* Header */}
      <header className="bg-(--surface) pt-10 pb-6 px-4 shadow-sm sticky top-0 z-20 border-b border-(--border) flex items-center gap-4">
        <button 
          onClick={() => navigate(`/menu/${slug}`)}
          className="p-2 bg-(--surface-secondary) hover:bg-(--border) rounded-full transition-colors text-(--text)"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-(--text)">Checkout</h1>
          <p className="text-(--text-secondary) text-xs font-medium">{restaurantName}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-4">
        {/* Order Summary */}
        <div className="bg-(--surface) border border-(--border) rounded-[20px] p-6 shadow-sm">
          <div className="flex items-center gap-2 border-b border-(--border) pb-4 mb-4">
            <Receipt className="w-5 h-5 text-(--primary)" />
            <h2 className="text-lg font-bold text-(--text)">Order Summary</h2>
          </div>
          
          <div className="space-y-4">
            {cart.map((item) => (
              <div key={item.id} className="flex justify-between items-start">
                <div className="flex gap-3">
                  <span className="font-bold text-(--primary) bg-(--primary)/10 px-2 py-0.5 rounded-md text-sm h-fit">
                    {item.quantity}x
                  </span>
                  <div>
                    <h3 className="font-semibold text-(--text) text-sm">{item.name}</h3>
                    <p className="text-xs text-(--text-muted) mt-0.5">${parseFloat(item.price).toFixed(2)} each</p>
                  </div>
                </div>
                <span className="font-bold text-(--text) text-sm">
                  ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-(--border) mt-6 pt-4 flex justify-between items-center">
            <span className="font-bold text-(--text)">Total Amount</span>
            <span className="text-xl font-bold text-(--primary)">${cartTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Payment / Info Card */}
        <div className="bg-(--surface) border border-(--border) rounded-[20px] p-6 shadow-sm flex items-start gap-4">
          <div className="bg-[#DCFCE7] p-2 rounded-full text-[#22C55E] shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-(--text)">Pay at Counter</h3>
            <p className="text-sm text-(--text-secondary) mt-1 leading-relaxed">
              Your order will be sent directly to the kitchen. You can pay at the counter when you finish your meal.
            </p>
          </div>
        </div>
      </main>

      {/* Sticky Place Order Footer */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-(--background) via-(--background) to-transparent z-30 pointer-events-none">
        <div className="max-w-2xl mx-auto pointer-events-auto">
          <button 
            onClick={handlePlaceOrder}
            disabled={isLoading}
            className="w-full bg-(--primary) hover:bg-(--primary-hover) text-white p-4 rounded-[20px] shadow-[0_10px_30px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 font-bold text-lg transition-transform active:scale-[0.98] disabled:opacity-70"
          >
            {isLoading ? (
              <span className="animate-pulse">Processing Order...</span>
            ) : (
              `Place Order • $${cartTotal.toFixed(2)}`
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;