import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  ArrowLeft, Clock, ChefHat, CheckCircle2, Receipt, Download, Utensils, AlertCircle, Banknote
} from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const OrderTracking = () => {
  const { slug, orderId } = useParams();
  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/orders/${orderId}`);
      setOrder(response.data);
    } catch (error) {
      toast.error('Could not find order. Please verify your Order ID.');
    } finally {
      setIsLoading(false);
    }
  };

  // Poll server every 4 seconds for live WebSocket updates
  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 4000);
    return () => clearInterval(interval);
  }, [orderId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center print:hidden">
        <div className="w-16 h-16 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_20px_var(--primary)]"></div>
        <p className="text-(--text) font-bold tracking-tight text-lg">Fetching live status...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-6 text-center print:hidden">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-red-100">
          <AlertCircle className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-black text-(--text) mb-3 tracking-tight">Order Not Found</h1>
        <p className="text-(--text-secondary) font-medium mb-8 max-w-sm">We couldn't retrieve an order with ID: <br/><span className="font-mono font-black text-(--text) bg-(--surface) px-2 py-1 rounded-md mt-2 inline-block border border-(--border)">{orderId}</span></p>
        <Link to="/dashboard" className="px-8 py-3.5 bg-(--primary) hover:bg-(--primary-hover) active:scale-95 transition-all text-white rounded-xl font-bold shadow-md">Return Home</Link>
      </div>
    );
  }

  // FIX 1: We only consider it an "Online Payment" (3-track flow) if the payment actually succeeded
  // and attached a razorpay_payment_id. If it failed and they pay at counter, this will be null,
  // falling back perfectly to the 4-track counter flow!
  const isOnlinePayment = !!order.razorpay_payment_id;

  // Base workflow stages
  const allStages = [
    {
      key: 'received',
      title: 'Awaiting Payment',
      description: 'Please proceed to the counter to pay for your order.',
      icon: Banknote,
      activeColor: 'text-blue-600',
      activeBg: 'bg-blue-100',
      borderColor: 'border-blue-500'
    },
    {
      key: 'preparing',
      title: 'Payment Done & Preparing',
      description: 'Payment confirmed! The kitchen is cooking your items.',
      icon: ChefHat,
      activeColor: 'text-amber-600',
      activeBg: 'bg-amber-100',
      borderColor: 'border-amber-500'
    },
    {
      key: 'ready',
      title: 'Ready to Serve',
      description: 'Your food is cooked and ready at the counter.',
      icon: Utensils,
      activeColor: 'text-emerald-600',
      activeBg: 'bg-emerald-100',
      borderColor: 'border-emerald-500'
    },
    {
      key: 'served',
      title: 'Served',
      description: 'Order complete. Enjoy your meal!',
      icon: CheckCircle2,
      activeColor: 'text-purple-600',
      activeBg: 'bg-purple-100',
      borderColor: 'border-purple-500'
    }
  ];

  // If paid online successfully, remove the "Awaiting Payment" step completely
  const stages = isOnlinePayment 
    ? allStages.filter(stage => stage.key !== 'received') 
    : allStages;

  const getStageIndex = (status) => {
    const idx = stages.findIndex(s => s.key === status);
    return idx !== -1 ? idx : 0; 
  };

  const currentStageIdx = getStageIndex(order.status);
  const currentStage = stages[currentStageIdx];
  
  // The Bill is ONLY available when the order hits the final "Served" stage
  const isFinalStage = order.status === 'served';

  const handleDownloadBill = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-(--background) pb-12 font-sans selection:bg-(--primary) selection:text-white">
      
      {/* SCREEN UI VIEW (Hidden when printing PDF) */}
      <div className="print:hidden">
        
        {/* Glassmorphism Header */}
        <header className="bg-(--background)/80 backdrop-blur-xl pt-6 pb-4 px-4 sm:px-6 shadow-sm sticky top-0 z-40 border-b border-(--border)/50 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link to="/dashboard" className="w-10 h-10 bg-(--surface) hover:bg-(--surface-secondary) border border-(--border) rounded-xl flex items-center justify-center text-(--text) transition-colors active:scale-95 shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-(--text) tracking-tight">Live Tracker</h1>
              <p className="text-xs font-bold text-(--text-muted) font-mono mt-0.5">ID: {order.id.split('-')[0].toUpperCase()}</p>
            </div>
          </div>
          <span className={`text-[10px] sm:text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border shadow-sm ${currentStage.activeBg} ${currentStage.activeColor} ${currentStage.borderColor.replace('border-', 'border-').replace('500', '200')}`}>
            {currentStage.title.split(' ')[0]}
          </span>
        </header>

        <main className="max-w-xl mx-auto p-4 sm:p-6 mt-4 space-y-8">
          
          {/* Main Hero Card - Premium Glass Widget */}
          <div className="bg-linear-to-br from-(--surface) to-(--surface-secondary) border border-(--border)/60 rounded-4xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)] text-center flex flex-col items-center relative overflow-hidden group">
            {/* Ambient Background Glow */}
            <div className={`absolute -top-12 -right-12 w-40 h-40 rounded-full blur-2xl pointer-events-none opacity-20 ${currentStage.activeBg.replace('bg-', 'bg-').replace('100', '500')}`}></div>

            <div className={`w-24 h-24 rounded-[20px] flex items-center justify-center mb-6 shadow-inner border border-white/50 relative z-10 ${currentStage.activeBg} ${!isFinalStage ? 'animate-pulse' : ''}`}>
              <currentStage.icon className={`w-12 h-12 ${currentStage.activeColor}`} />
            </div>
            
            <h2 className="text-3xl font-black text-(--text) tracking-tight relative z-10">{currentStage.title}</h2>
            <p className="text-base font-medium text-(--text-secondary) mt-2 max-w-sm relative z-10">{currentStage.description}</p>
            
            {order.status === 'received' && !isOnlinePayment && (
               <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-700 text-sm font-bold shadow-sm relative z-10 animate-bounce">
                 <Banknote className="w-4 h-4" /> Please pay at the counter now
               </div>
            )}
            {(order.status === 'preparing' || order.status === 'ready') && (
              <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold shadow-sm relative z-10">
                <CheckCircle2 className="w-4 h-4" /> Payment Confirmed
              </div>
            )}
          </div>

          {/* DETAILED WORKFLOW TIMELINE */}
          <div className="bg-(--surface) border border-(--border)/50 rounded-4xl p-6 sm:p-8 shadow-[0_4px_20px_rgb(0,0,0,0.02)]">
            <h3 className="font-black text-xl text-(--text) mb-8 tracking-tight">Workflow Progress</h3>
            
            {/* The vertical line container */}
            <div className="relative space-y-8 pl-5 before:absolute before:left-9 before:top-4 before:bottom-4 before:w-0.75 before:bg-(--surface-secondary) before:rounded-full">
              
              {/* Dynamic Progress Line Overlay */}
              <div 
                className="absolute left-9 top-4 w-0.75 bg-linear-to-b from-blue-400 via-emerald-400 to-purple-400 rounded-full transition-all duration-1000 ease-in-out z-0" 
                style={{ 
                  height: `${(currentStageIdx / (stages.length - 1)) * 100}%`,
                  bottom: '1rem' 
                }}
              ></div>

              {stages.map((stage, idx) => {
                // FIX 2: If the status is served, instantly mark it as passed/completed. No timers.
                const isPassed = currentStageIdx > idx || (stage.key === 'served' && isFinalStage);
                const isCurrentActive = currentStageIdx === idx && stage.key !== 'served';
                const Icon = stage.icon;

                return (
                  <div key={stage.key} className="relative flex items-start gap-5 sm:gap-6 z-10">
                    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shrink-0 border-[3px] transition-all duration-500 ease-out ${
                      isPassed 
                        ? 'bg-(--text) border-(--text) text-(--background) shadow-md scale-110' 
                        : isCurrentActive 
                          ? `${stage.activeBg} ${stage.borderColor} ${stage.activeColor} ring-4 ring-current/20 scale-125`
                          : 'bg-(--surface) border-(--border) text-(--text-muted)'
                    }`}>
                      {isPassed ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6" /> : <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>

                    <div className={`pt-1 flex-1 transition-all duration-500 ${isCurrentActive ? 'translate-x-1 sm:translate-x-2' : ''}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0">
                        <h4 className={`font-black text-base sm:text-lg tracking-tight ${isCurrentActive || isPassed ? 'text-(--text)' : 'text-(--text-muted)'}`}>
                          {stage.title}
                        </h4>
                        
                        {/* Only show "In Progress" if it is actively running and NOT served */}
                        {isCurrentActive && (
                          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider bg-(--text) text-(--background) px-2.5 py-1 rounded-md shadow-sm self-start sm:self-auto">
                            In Progress
                          </span>
                        )}
                        
                        {/* Show "Completed" instantly when Served is hit */}
                        {isPassed && stage.key === 'served' && (
                          <span className="text-[10px] sm:text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-700 border border-purple-200 px-2.5 py-1 rounded-md shadow-sm self-start sm:self-auto">
                            Completed
                          </span>
                        )}
                      </div>
                      <p className={`text-xs sm:text-sm mt-1 font-medium leading-relaxed pr-2 ${isCurrentActive ? 'text-(--text-secondary)' : 'text-(--text-muted)'}`}>
                        {stage.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Download Bill PDF Button - Now appears INSTANTLY when served */}
          {isFinalStage && (
            <button 
              onClick={handleDownloadBill}
              className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black text-lg py-5 rounded-3xl shadow-[0_10px_30px_rgba(147,51,234,0.3)] transition-all active:scale-95 hover:-translate-y-1 flex items-center justify-center gap-3 border border-purple-500/50 animate-in zoom-in duration-500"
            >
              <Download className="w-6 h-6" /> Download Bill (PDF)
            </button>
          )}

        </main>
      </div>

      {/* PRINT-ONLY RECEIPT TEMPLATE */}
      <div className="hidden print:block max-w-md mx-auto p-8 font-mono text-black bg-white">
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-6 mb-6">
          <h1 className="text-3xl font-bold uppercase tracking-widest mb-1">ZESTRA</h1>
          <p className="text-sm text-gray-500">Official Payment Receipt</p>
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-1 text-sm text-left">
            <p><strong>Order ID:</strong> {order.id}</p>
            <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
            <p><strong>Status:</strong> PAID IN FULL</p>
            <p><strong>Method:</strong> {isOnlinePayment ? 'Online (Razorpay)' : 'Counter'}</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="grid grid-cols-12 gap-2 font-bold border-b border-gray-300 pb-2">
            <span className="col-span-7">Item</span>
            <span className="col-span-2 text-right">Qty</span>
            <span className="col-span-3 text-right">Price</span>
          </div>
          {order.items?.map((item, i) => {
            const lineTotal = parseFloat(item.price_at_order || 0) * item.quantity;
            return (
              <div key={i} className="grid grid-cols-12 gap-2 text-sm items-start">
                <span className="col-span-7 pr-2 wrap-break-word">
                  {item.name || `Menu Item (${item.menu_item_id.slice(0, 6)})`}
                </span>
                <span className="col-span-2 text-right font-medium">x{item.quantity}</span>
                <span className="col-span-3 text-right font-medium">${lineTotal.toFixed(2)}</span>
              </div>
            );
          })}
        </div>

        <div className="border-t-2 border-dashed border-gray-300 pt-4 text-lg">
          <div className="flex justify-between font-bold">
            <span>TOTAL:</span>
            <span>${parseFloat(order.total || 0).toFixed(2)}</span>
          </div>
        </div>

        <div className="text-center mt-12 text-sm text-gray-500 italic">
          Thank you for dining with us!<br/>
          Powered by Zestra Platform
        </div>
      </div>

    </div>
  );
};

export default OrderTracking;