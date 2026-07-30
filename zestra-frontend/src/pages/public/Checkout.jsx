import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Copy, Check, ShoppingBag, Loader2, ShieldCheck, CreditCard } from 'lucide-react';
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
  
  // Payment tracking state
  const [paymentMethod, setPaymentMethod] = useState(null); // 'counter' or 'online'

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

  // STEP 1: Place the base order first
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    
    setIsSubmitting(true);
    try {
      const payload = {
        items: cart.map(item => ({
          menu_item_id: item.id,
          quantity: item.quantity
        }))
      };

      const response = await api.post(`/public/orders/${slug}`, payload);
      
      setPlacedOrderId(response.data.order_id);
      setOrderSuccess(true);
      clearCart(); // Empty the cart because the order is securely in the DB
      
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to place order. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // STEP 2a: Pay at Counter Flow
  const handlePayAtCounter = () => {
    setPaymentMethod('counter');
    // Instantly redirect to tracking
    navigate(`/tracking/${slug}/${placedOrderId}`);
  };

  // Helper to load Razorpay SDK script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // STEP 2b: Pay Online Flow
  const handlePayOnline = async () => {
    setPaymentMethod('online');

    try {
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error("Failed to load Razorpay. Please check your connection.");
        setPaymentMethod(null);
        return;
      }

      // Request Razorpay Order details from Backend using the newly created order_id
      const rzpOrderRes = await api.post('/payments/create-order', { order_id: placedOrderId });
      const { razorpay_order_id, amount, currency, key_id } = rzpOrderRes.data;

      // Configure Razorpay Options
      const options = {
        key: key_id,
        amount: amount,
        currency: currency,
        name: "Zestra",
        description: "Order Payment",
        order_id: razorpay_order_id,
        handler: async function (response) {
          try {
            // Verify payment signature on backend
            await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            });
            toast.success("Payment successful!");
            navigate(`/tracking/${slug}/${placedOrderId}`);
          } catch (err) {
            toast.error("Payment verification failed. Please contact the counter.");
            navigate(`/tracking/${slug}/${placedOrderId}`);
          }
        },
        modal: {
          ondismiss: function() {
            toast('Payment cancelled. You can try again or pay at counter.', { icon: '⚠️' });
            setPaymentMethod(null);
          }
        },
        theme: {
          color: "#10b981" // Zestra primary emerald
        }
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', function (response) {
         toast.error(response.error.description);
      });
      rzp.open();

    } catch (error) {
      toast.error(error.response?.data?.detail || "Payment initialization failed. Please pay at counter.");
      setPaymentMethod(null);
    }
  };

  // ------------------------------------------------------------------------
  // UI: ORDER SUCCESS SCREEN (Payment Selection)
  // ------------------------------------------------------------------------
  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-6 text-center font-sans selection:bg-(--primary) selection:text-white">
        
        {/* Premium Success Icon */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl animate-pulse"></div>
          <div className="w-24 h-24 bg-linear-to-br from-emerald-100 to-emerald-50 border border-emerald-200 rounded-3xl flex items-center justify-center shadow-lg relative z-10 animate-in zoom-in duration-500">
            <CheckCircle2 className="w-12 h-12 text-emerald-600" />
          </div>
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-black text-(--text) tracking-tight mb-3">Order Placed!</h1>
        <p className="text-(--text-secondary) font-medium text-base mb-10 max-w-sm">Your order has been securely sent directly to the kitchen.</p>
        
        {/* Digital Ticket Stub for Order ID */}
        <div className="bg-(--surface) border border-(--border)/60 p-6 rounded-3xl w-full max-w-md shadow-[0_8px_30px_rgb(0,0,0,0.04)] mb-8 relative overflow-hidden">
          <p className="text-sm font-bold text-(--text-muted) tracking-wider uppercase mb-3">Your Order ID</p>
          <div className="flex items-center justify-between bg-(--background) border border-(--border) p-4 rounded-2xl shadow-inner">
            <span className="font-mono font-black text-(--text) text-lg sm:text-xl truncate pr-4">
              {placedOrderId}
            </span>
            <button 
              onClick={handleCopyId}
              className="p-2.5 bg-(--surface) hover:bg-(--surface-secondary) border border-(--border) text-(--text) rounded-xl transition-all active:scale-95 shrink-0 shadow-sm"
              title="Copy Order ID"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-500" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
          <p className="text-xs font-medium text-emerald-600 mt-4 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Auto-copied to clipboard
          </p>
        </div>

        {/* Payment Options */}
        <div className="w-full max-w-md space-y-4">
          <button 
            onClick={handlePayOnline}
            disabled={paymentMethod === 'online'}
            className="w-full py-4 sm:py-5 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-lg rounded-[20px] shadow-[0_10px_30px_rgba(59,130,246,0.3)] transition-all active:scale-95 hover:-translate-y-1 flex items-center justify-center gap-3 border border-blue-500/50 disabled:opacity-70"
          >
            {paymentMethod === 'online' ? <Loader2 className="w-6 h-6 animate-spin" /> : <CreditCard className="w-6 h-6" />}
            {paymentMethod === 'online' ? 'Connecting to Bank...' : 'Pay Online Now'}
          </button>

          <button 
            onClick={handlePayAtCounter}
            disabled={paymentMethod === 'counter'}
            className="w-full py-4 sm:py-5 bg-(--surface) hover:bg-(--surface-secondary) text-(--text) font-black text-lg rounded-[20px] shadow-sm transition-all active:scale-95 flex items-center justify-center gap-3 border-2 border-(--border) disabled:opacity-70"
          >
            <ShieldCheck className="w-6 h-6 text-(--text-muted)" />
            Pay at Counter Instead
          </button>
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------------------
  // UI: CART SCREEN
  // ------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-(--background) pb-32 font-sans selection:bg-(--primary) selection:text-white">
      {/* Glassmorphism Header */}
      <header className="bg-(--background)/80 backdrop-blur-xl pt-6 pb-4 px-4 sm:px-6 shadow-sm sticky top-0 z-40 border-b border-(--border)/50 flex items-center gap-3 sm:gap-4 transition-all">
        <Link to={`/menu/${slug}`} className="w-10 h-10 bg-(--surface) hover:bg-(--surface-secondary) border border-(--border) rounded-xl flex items-center justify-center text-(--text) transition-colors active:scale-95 shadow-sm">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl sm:text-2xl font-black text-(--text) tracking-tight">Checkout</h1>
      </header>

      <main className="max-w-2xl mx-auto p-4 sm:p-6 mt-4 space-y-6 relative z-10">
        {cart.length === 0 ? (
          <div className="text-center py-20 bg-(--surface) border border-(--border)/50 rounded-4xl shadow-sm flex flex-col items-center">
            <div className="w-16 h-16 bg-(--surface-secondary) rounded-2xl flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8 text-(--text-muted)" />
            </div>
            <h2 className="text-xl font-black text-(--text) mb-2 tracking-tight">Your cart is empty</h2>
            <p className="text-(--text-secondary) font-medium">Add some delicious items from the menu.</p>
            <Link to={`/menu/${slug}`} className="mt-6 px-6 py-2.5 bg-(--text) text-(--background) font-bold rounded-xl active:scale-95 transition-transform">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="bg-(--surface) border border-(--border)/60 rounded-4xl p-6 sm:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <h2 className="font-black text-xl text-(--text) mb-6 tracking-tight">Order Summary</h2>
            
            <div className="space-y-4 mb-8">
              {cart.map((item, index) => (
                <div key={item.id} className={`flex justify-between items-center ${index !== cart.length - 1 ? 'border-b border-(--border)/50 pb-4' : ''}`}>
                  <div className="flex items-center gap-3 sm:gap-4 pr-4">
                    <span className="font-black text-(--background) bg-(--text) px-2.5 py-1 rounded-lg text-xs shadow-sm shrink-0">{item.quantity}x</span>
                    <span className="font-bold text-(--text) text-base line-clamp-2">{item.name}</span>
                  </div>
                  <span className="font-black text-(--text-secondary) text-base shrink-0">₹{(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            {/* Total Highlight Box */}
            <div className="bg-(--background) border border-(--border) rounded-[20px] p-5 flex justify-between items-center shadow-inner">
              <span className="font-bold text-lg text-(--text)">Total Amount</span>
              <span className="font-black text-2xl text-(--primary) tracking-tight">₹{cartTotal.toFixed(2)}</span>
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Place Order Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 sm:p-6 bg-linear-to-t from-(--background) via-(--background)/95 to-transparent z-50 pointer-events-none pb-4 sm:pb-6">
          <div className="max-w-2xl mx-auto pointer-events-auto">
            <button 
              onClick={handlePlaceOrder}
              disabled={isSubmitting}
              className="w-full bg-(--primary) hover:bg-(--primary-hover) disabled:bg-(--text-muted) disabled:shadow-none text-white p-4 sm:p-5 rounded-[20px] sm:rounded-3xl shadow-[0_15px_40px_-10px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 font-black text-base sm:text-lg border border-(--primary-hover)"
            >
              {isSubmitting ? (
                <><Loader2 className="w-6 h-6 animate-spin" /> Preparing Order...</>
              ) : (
                'Place Order'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;