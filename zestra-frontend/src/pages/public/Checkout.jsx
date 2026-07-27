import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Check, ShoppingBag, Loader2 } from 'lucide-react';
import usePublicMenuStore from '../../store/public/usePublicMenuStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Checkout = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { cart, getCartTotal, clearCart } = usePublicMenuStore();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [copied, setCopied] = useState(false);

  const cartTotal = getCartTotal();

  // Auto-copy to clipboard when order is successful
  useEffect(() => {
    if (orderSuccess && placedOrderId) {
      navigator.clipboard.writeText(placedOrderId)
        .then(() => toast.success("Order ID copied to clipboard!"))
        .catch(() => console.log("Clipboard auto-copy failed"));
    }
  }, [orderSuccess, placedOrderId]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(placedOrderId);
    setCopied(true);
    toast.success("Order ID copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    
    setIsSubmitting(true);
    try {
      // Format payload according to backend schema
      const payload = {
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity
        }))
      };

      const response = await api.post(`/public/orders/${slug}`, payload);
      
      setPlacedOrderId(response.data.order_id);
      setOrderSuccess(true);
      clearCart(); // Empty the cart after successful order
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-6 text-center">
        <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/20 animate-in zoom-in duration-500">
          <CheckCircle2 className="w-12 h-12 text-emerald-600" />
        </div>
        <h1 className="text-3xl font-bold text-(--text) mb-2">Order Placed!</h1>
        <p className="text-(--text-secondary) mb-8">Your order has been sent to the kitchen.</p>
        
        <div className="bg-(--surface) border border-(--border) p-6 rounded-3xl w-full max-w-sm shadow-sm mb-8">
          <p className="text-sm font-medium text-(--text-muted) mb-2">Your Order ID</p>
          <div className="flex items-center justify-between bg-(--background) border border-(--border) p-4 rounded-[14px]">
            <span className="font-mono font-bold text-(--text) text-lg truncate pr-4">
              {placedOrderId}
            </span>
            <button 
              onClick={handleCopyId}
              className="p-2 bg-(--surface-secondary) hover:bg-(--border) text-(--text) rounded-lg transition-colors shrink-0"
              title="Copy Order ID"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs text-(--text-muted) mt-3">
            (We automatically copied this for you!)
          </p>
        </div>

        <button 
          onClick={() => navigate(`/tracking/${slug}/${placedOrderId}`)}
          className="w-full max-w-sm py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-2xl shadow-lg shadow-blue-500/25 transition-all"
        >
          Track My Order
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--background) pb-28">
      <header className="bg-(--surface) pt-6 pb-4 px-4 shadow-sm sticky top-0 z-20 border-b border-(--border) flex items-center gap-4">
        <Link to={`/menu/${slug}`} className="p-2 bg-(--surface-secondary) rounded-full text-(--text)">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-(--text)">Checkout</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 mt-4 space-y-6">
        {cart.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-12 h-12 text-(--text-muted) mx-auto mb-4" />
            <p className="text-(--text-secondary)">Your cart is empty.</p>
          </div>
        ) : (
          <div className="bg-(--surface) border border-(--border) rounded-3xl p-6 shadow-sm">
            <h2 className="font-bold text-lg mb-4 border-b border-(--border) pb-4">Order Summary</h2>
            <div className="space-y-4 mb-6">
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-(--primary) bg-(--primary)/10 px-2 py-0.5 rounded-md text-sm">{item.quantity}x</span>
                    <span className="font-medium text-(--text)">{item.name}</span>
                  </div>
                  <span className="font-bold text-(--text-secondary)">${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-(--border) pt-4 flex justify-between items-center">
              <span className="font-bold text-lg text-(--text)">Total</span>
              <span className="font-extrabold text-2xl text-(--primary)">${cartTotal.toFixed(2)}</span>
            </div>
          </div>
        )}
      </main>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-linear-to-t from-(--background) via-(--background) to-transparent z-30 pointer-events-none">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button 
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full bg-(--primary) hover:bg-(--primary-hover) disabled:bg-(--text-muted) text-white p-4 rounded-[20px] shadow-xl flex items-center justify-center gap-2 transition-transform active:scale-[0.98] font-bold text-lg"
            >
              {isSubmitting ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Processing...</>
              ) : (
                `Confirm & Pay at Counter`
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;