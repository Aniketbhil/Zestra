import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, ChefHat, ShoppingBag, CheckCircle2, ArrowLeft } from 'lucide-react';
import useOrderStore from '../../store/public/useOrderStore';

const STATUS_STEPS = [
  { id: 'received', label: 'Order Received', icon: Clock, desc: 'We have got your order' },
  { id: 'preparing', label: 'Preparing', icon: ChefHat, desc: 'Chef is cooking your meal' },
  { id: 'ready', label: 'Ready', icon: ShoppingBag, desc: 'Your food is ready!' },
  { id: 'served', label: 'Served', icon: CheckCircle2, desc: 'Enjoy your meal!' }
];

const OrderTracking = () => {
  const { slug, orderId } = useParams();
  const navigate = useNavigate();
  const { currentOrder, fetchOrder, connectToOrderStream, disconnectStream } = useOrderStore();

  useEffect(() => {
    // If order is missing (user refreshed the page), fetch it from backend
    if (!currentOrder) {
      fetchOrder(orderId);
    } else {
      // Connect to websocket using only the orderId as per Aniket's instructions
      connectToOrderStream(orderId);
    }

    return () => {
      disconnectStream();
    };
  }, [orderId, currentOrder, fetchOrder, connectToOrderStream, disconnectStream]);

  if (!currentOrder) return null;

  // Determine current step index
  const currentStepIndex = STATUS_STEPS.findIndex(step => step.id === currentOrder.status);

  return (
    <div className="min-h-screen bg-(--background) pb-12">
      <header className="bg-(--surface) pt-10 pb-6 px-4 shadow-sm border-b border-(--border) flex items-center gap-4">
        <button 
          onClick={() => navigate(`/menu/${slug}`)}
          className="p-2 bg-(--surface-secondary) hover:bg-(--border) rounded-full transition-colors text-(--text)"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-(--text)">Order Status</h1>
          <p className="text-(--text-secondary) text-xs font-medium uppercase tracking-wider">#{currentOrder.id.split('-')[0]}</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 mt-6">
        
        {/* Total Amount Card */}
        <div className="bg-(--surface) border border-(--border) rounded-[20px] p-6 text-center shadow-sm mb-8">
          <p className="text-(--text-secondary) text-sm mb-1">Total Amount</p>
          <h2 className="text-3xl font-bold text-(--text)">${parseFloat(currentOrder.total).toFixed(2)}</h2>
          {currentOrder.status === 'served' ? (
            <span className="inline-block mt-3 px-3 py-1 bg-[#DCFCE7] text-[#22C55E] text-xs font-bold rounded-full">Completed</span>
          ) : (
            <span className="inline-block mt-3 px-3 py-1 bg-(--surface-secondary) text-(--text-secondary) text-xs font-bold rounded-full border border-(--border)">Awaiting Payment at Counter</span>
          )}
        </div>

        {/* Live Tracking Timeline */}
        <div className="bg-(--surface) border border-(--border) rounded-[20px] p-8 shadow-sm">
          <h3 className="font-bold text-(--text) mb-8">Live Tracking</h3>
          
          <div className="relative">
            {/* Vertical Line behind steps */}
            <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-(--surface-secondary) -z-10"></div>
            
            {/* Dynamic Progress Line */}
            <div 
              className="absolute left-6 top-6 w-0.5 bg-(--primary) transition-all duration-500 ease-in-out -z-10"
              style={{ height: `${(currentStepIndex / (STATUS_STEPS.length - 1)) * 100}%` }}
            ></div>

            <div className="space-y-8">
              {STATUS_STEPS.map((step, index) => {
                const isCompleted = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                const Icon = step.icon;

                return (
                  <div key={step.id} className="flex gap-4 relative z-0">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 transition-colors duration-500 ${
                      isCompleted ? 'bg-(--primary) text-white shadow-md shadow-(--primary)/30' : 'bg-(--surface-secondary) text-(--text-muted) border border-(--border)'
                    }`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    
                    <div className="flex flex-col justify-center">
                      <h4 className={`font-bold text-base transition-colors duration-500 ${isCompleted ? 'text-(--text)' : 'text-(--text-muted)'}`}>
                        {step.label}
                      </h4>
                      <p className={`text-xs transition-colors duration-500 ${isCurrent ? 'text-(--primary) font-semibold' : 'text-(--text-muted)'}`}>
                        {step.desc}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OrderTracking;