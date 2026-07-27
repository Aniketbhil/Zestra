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
        <div className="w-12 h-12 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-(--text-muted) font-medium">Fetching live order status...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-(--background) flex flex-col items-center justify-center p-4 text-center print:hidden">
        <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-(--text) mb-2">Order Not Found</h1>
        <p className="text-(--text-secondary) mb-6">We couldn't retrieve an order with ID: <span className="font-mono font-bold text-(--text)">{orderId}</span></p>
        <Link to="/dashboard" className="px-6 py-3 bg-(--primary) text-white rounded-full font-bold shadow-md">Go Back</Link>
      </div>
    );
  }

  // UPDATED: Workflow stages mapped perfectly to your new payment flow
  const stages = [
    {
      key: 'received',
      title: 'Awaiting Payment',
      description: 'Please proceed to the counter to pay for your order.',
      icon: Banknote,
      activeColor: 'text-blue-500',
      activeBg: 'bg-blue-100',
      borderColor: 'border-blue-500'
    },
    {
      key: 'preparing',
      title: 'Payment Done & Preparing',
      description: 'Payment confirmed! The kitchen is cooking your items.',
      icon: ChefHat,
      activeColor: 'text-amber-500',
      activeBg: 'bg-amber-100',
      borderColor: 'border-amber-500'
    },
    {
      key: 'ready',
      title: 'Ready to Serve',
      description: 'Your food is cooked and ready at the counter.',
      icon: Utensils,
      activeColor: 'text-emerald-500',
      activeBg: 'bg-emerald-100',
      borderColor: 'border-emerald-500'
    },
    {
      key: 'served',
      title: 'Served',
      description: 'Order complete. Enjoy your meal!',
      icon: CheckCircle2,
      activeColor: 'text-purple-500',
      activeBg: 'bg-purple-100',
      borderColor: 'border-purple-500'
    }
  ];

  const getStageIndex = (status) => {
    switch (status) {
      case 'received': return 0;
      case 'preparing': return 1;
      case 'ready': return 2;
      case 'served': return 3;
      default: return 0;
    }
  };

  const currentStageIdx = getStageIndex(order.status);
  const currentStage = stages[currentStageIdx];
  
  // The Bill is ONLY available when the order hits the final "Served" stage
  const isFinalStage = order.status === 'served';

  const handleDownloadBill = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-(--background) pb-12">
      
      {/* SCREEN UI VIEW (Hidden when printing PDF) */}
      <div className="print:hidden">
        
        <header className="bg-(--surface) pt-6 pb-4 px-4 shadow-sm sticky top-0 z-20 border-b border-(--border) flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="p-2 bg-(--surface-secondary) hover:bg-(--border) rounded-full text-(--text) transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-(--text)">Live Order Tracker</h1>
              <p className="text-xs text-(--text-muted) font-mono">ID: {order.id.split('-')[0].toUpperCase()}</p>
            </div>
          </div>
          <span className={`text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${currentStage.activeBg} ${currentStage.activeColor}`}>
            {currentStage.title}
          </span>
        </header>

        <main className="max-w-xl mx-auto p-4 mt-4 space-y-6">
          
          {/* Main Hero Card */}
          <div className="bg-(--surface) border border-(--border) rounded-3xl p-6 shadow-sm text-center flex flex-col items-center relative overflow-hidden">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-4 ${currentStage.activeBg} ${!isFinalStage ? 'animate-pulse' : ''}`}>
              <currentStage.icon className={`w-10 h-10 ${currentStage.activeColor}`} />
            </div>
            
            <h2 className="text-2xl font-bold text-(--text)">{currentStage.title}</h2>
            <p className="text-sm text-(--text-secondary) mt-1 max-w-sm">{currentStage.description}</p>
            
            {order.status === 'received' && (
               <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold animate-bounce">
                 <ArrowLeft className="w-4 h-4" /> Please pay at the counter now
               </div>
            )}
            {(order.status === 'preparing' || order.status === 'ready') && (
              <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4" /> Payment Confirmed
              </div>
            )}
          </div>

          {/* DETAILED WORKFLOW TIMELINE */}
          <div className="bg-(--surface) border border-(--border) rounded-3xl p-6 shadow-sm">
            <h3 className="font-bold text-lg text-(--text) mb-6">Workflow Progress</h3>
            
            <div className="relative space-y-8 pl-4 before:absolute before:left-6.75 before:top-3 before:bottom-3 before:w-0.5 before:bg-(--border)">
              {stages.map((stage, idx) => {
                const isPassed = currentStageIdx > idx;
                const isCurrent = currentStageIdx === idx;
                const Icon = stage.icon;

                return (
                  <div key={stage.key} className="relative flex items-start gap-4 z-10">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${
                      isPassed 
                        ? 'bg-(--primary) border-(--primary) text-white' 
                        : isCurrent 
                          ? `${stage.activeBg} ${stage.borderColor} ${stage.activeColor} ring-4 ring-purple-500/10`
                          : 'bg-(--surface) border-(--border) text-(--text-muted)'
                    }`}>
                      {isPassed ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                    </div>

                    <div className="pt-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className={`font-bold text-base ${isCurrent ? 'text-(--text)' : isPassed ? 'text-(--text)' : 'text-(--text-muted)'}`}>
                          {stage.title}
                        </h4>
                        {isCurrent && (
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-(--primary)/10 text-(--primary) px-2 py-0.5 rounded-full">
                            In Progress
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-0.5 ${isCurrent ? 'text-(--text-secondary)' : 'text-(--text-muted)'}`}>
                        {stage.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Download Bill PDF Button - ONLY APPEARS AT THE VERY END */}
          {isFinalStage && (
            <button 
              onClick={handleDownloadBill}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" /> Download Bill (PDF)
            </button>
          )}

        </main>
      </div>

      {/* PRINT-ONLY RECEIPT TEMPLATE (Generates crisp PDF natively) */}
      <div className="hidden print:block max-w-md mx-auto p-8 font-mono text-black bg-white">
        <div className="text-center border-b-2 border-dashed border-gray-300 pb-6 mb-6">
          <h1 className="text-3xl font-bold uppercase tracking-widest mb-1">ZESTRA</h1>
          <p className="text-sm text-gray-500">Official Payment Receipt</p>
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-col gap-1 text-sm text-left">
            <p><strong>Order ID:</strong> {order.id}</p>
            <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
            <p><strong>Status:</strong> PAID IN FULL</p>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="flex justify-between font-bold border-b border-gray-300 pb-2">
            <span>Item</span>
            <span>Qty</span>
          </div>
          {order.items?.map((item, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>Menu Item ({item.menu_item_id.slice(0, 6)})</span>
              <span>x{item.quantity}</span>
            </div>
          ))}
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