import { useEffect } from 'react';
import { ChefHat, CheckCircle2, Utensils, Receipt, Banknote, ArrowRight } from 'lucide-react';
import useRestaurantOrderStore from '../../store/dashboard/useRestaurantOrderStore';

const Orders = () => {
  const { orders, isLoading, fetchOrders, updateOrderStatus } = useRestaurantOrderStore();

  useEffect(() => {
    fetchOrders();
    // In a real hackathon setting, your websocket connection is already polling/listening in the store
    const interval = setInterval(fetchOrders, 4000); 
    return () => clearInterval(interval);
  }, [fetchOrders]);

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-(--text-muted) font-medium">Loading Kitchen Display...</p>
        </div>
      </div>
    );
  }

  // Filter orders by status
  const receivedOrders = orders.filter(o => o.status === 'received');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const servedOrders = orders.filter(o => o.status === 'served');

  const getStatusColor = (status) => {
    switch(status) {
      case 'received': return 'bg-blue-100 text-blue-600 border-blue-200';
      case 'preparing': return 'bg-amber-100 text-amber-600 border-amber-200';
      case 'ready': return 'bg-emerald-100 text-emerald-600 border-emerald-200';
      case 'served': return 'bg-purple-100 text-purple-600 border-purple-200';
      default: return 'bg-gray-100 text-gray-600 border-gray-200';
    }
  };

  const OrderCard = ({ order, status }) => (
    <div className="bg-(--surface) p-4 rounded-xl border border-(--border) shadow-sm hover:shadow-md transition-all flex flex-col">
      <div className="flex justify-between items-start mb-3">
        <div>
          <span className="text-xs font-bold text-(--text-muted)">ID: {order.id.split('-')[0].toUpperCase()}</span>
          <p className="text-xs text-(--text-secondary) mt-0.5">{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
        <span className="font-extrabold text-(--primary)">${parseFloat(order.total).toFixed(2)}</span>
      </div>

      <div className="bg-(--background) rounded-lg p-3 border border-(--border) mb-4 max-h-32 overflow-y-auto scrollbar-thin">
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex justify-between text-sm mb-1 last:mb-0">
            <span className="font-medium text-(--text)"><span className="text-(--primary) mr-1">{item.quantity}x</span> Item</span>
          </div>
        ))}
      </div>

      <div className="mt-auto">
        {/* THE MAGIC BUTTON: If it is awaiting payment, show the Payment Done button! */}
        {status === 'received' && (
          <button 
            onClick={() => updateOrderStatus(order.id, 'preparing')}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Banknote className="w-4 h-4" /> Payment Done!
          </button>
        )}
        
        {/* Next step: Mark as Ready */}
        {status === 'preparing' && (
          <button 
            onClick={() => updateOrderStatus(order.id, 'ready')}
            className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" /> Mark Ready
          </button>
        )}
        
        {/* Final step: Mark as Served */}
        {status === 'ready' && (
          <button 
            onClick={() => updateOrderStatus(order.id, 'served')}
            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Utensils className="w-4 h-4" /> Mark Served
          </button>
        )}
        
        {/* Completed state */}
        {status === 'served' && (
          <div className="w-full py-2 bg-purple-50 text-purple-600 border border-purple-200 rounded-lg text-sm font-bold flex items-center justify-center gap-2">
            Completed & Paid
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-6 flex justify-between items-end shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Live Kitchen Display</h1>
          <p className="text-(--text-secondary) text-sm mt-1">Manage incoming orders and payments in real-time</p>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto scrollbar-thin pb-4">
        <div className="flex gap-6 min-w-max h-full">
          
          {/* Column 1: Awaiting Payment */}
          <div className="w-80 flex flex-col bg-(--surface-secondary) rounded-3xl border border-(--border) overflow-hidden h-full">
            <div className="p-4 border-b border-(--border) flex items-center justify-between bg-(--surface)">
              <h2 className="font-bold text-(--text) flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-500" /> Unpaid / Received
              </h2>
              <span className="bg-blue-100 text-blue-600 px-2.5 py-0.5 rounded-full text-xs font-bold">{receivedOrders.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 scrollbar-none">
              {receivedOrders.map(order => <OrderCard key={order.id} order={order} status="received" />)}
              {receivedOrders.length === 0 && <div className="text-center text-(--text-muted) text-sm py-8 border-2 border-dashed border-(--border) rounded-xl">No pending payments</div>}
            </div>
          </div>

          {/* Column 2: Preparing */}
          <div className="w-80 flex flex-col bg-(--surface-secondary) rounded-3xl border border-(--border) overflow-hidden h-full">
            <div className="p-4 border-b border-(--border) flex items-center justify-between bg-(--surface)">
              <h2 className="font-bold text-(--text) flex items-center gap-2">
                <ChefHat className="w-5 h-5 text-amber-500" /> Preparing
              </h2>
              <span className="bg-amber-100 text-amber-600 px-2.5 py-0.5 rounded-full text-xs font-bold">{preparingOrders.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 scrollbar-none">
              {preparingOrders.map(order => <OrderCard key={order.id} order={order} status="preparing" />)}
              {preparingOrders.length === 0 && <div className="text-center text-(--text-muted) text-sm py-8 border-2 border-dashed border-(--border) rounded-xl">No active cooking</div>}
            </div>
          </div>

          {/* Column 3: Ready */}
          <div className="w-80 flex flex-col bg-(--surface-secondary) rounded-3xl border border-(--border) overflow-hidden h-full">
            <div className="p-4 border-b border-(--border) flex items-center justify-between bg-(--surface)">
              <h2 className="font-bold text-(--text) flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Ready to Serve
              </h2>
              <span className="bg-emerald-100 text-emerald-600 px-2.5 py-0.5 rounded-full text-xs font-bold">{readyOrders.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 scrollbar-none">
              {readyOrders.map(order => <OrderCard key={order.id} order={order} status="ready" />)}
              {readyOrders.length === 0 && <div className="text-center text-(--text-muted) text-sm py-8 border-2 border-dashed border-(--border) rounded-xl">No orders waiting</div>}
            </div>
          </div>

          {/* Column 4: Completed/Served */}
          <div className="w-80 flex flex-col bg-(--surface-secondary) rounded-3xl border border-(--border) overflow-hidden h-full opacity-60 hover:opacity-100 transition-opacity">
            <div className="p-4 border-b border-(--border) flex items-center justify-between bg-(--surface)">
              <h2 className="font-bold text-(--text) flex items-center gap-2">
                <Utensils className="w-5 h-5 text-purple-500" /> Served
              </h2>
              <span className="bg-purple-100 text-purple-600 px-2.5 py-0.5 rounded-full text-xs font-bold">{servedOrders.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 scrollbar-none">
              {servedOrders.map(order => <OrderCard key={order.id} order={order} status="served" />)}
              {servedOrders.length === 0 && <div className="text-center text-(--text-muted) text-sm py-8 border-2 border-dashed border-(--border) rounded-xl">No completed orders</div>}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Orders;