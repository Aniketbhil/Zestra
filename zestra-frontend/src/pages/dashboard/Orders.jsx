import { useEffect, useState } from 'react';
import { ChefHat, CheckCircle2, Utensils, Receipt, Banknote, Loader2, Clock } from 'lucide-react';
import useRestaurantOrderStore from '../../store/dashboard/useRestaurantOrderStore';
import toast from 'react-hot-toast';

const Orders = () => {
  const { orders, isLoading, fetchOrders, updateOrderStatus } = useRestaurantOrderStore();
  
  // Track which specific order is currently being updated
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  useEffect(() => {
    fetchOrders();
    // Poll every 4 seconds for live updates
    const interval = setInterval(fetchOrders, 4000); 
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleStatusChange = async (orderId, newStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await updateOrderStatus(orderId, newStatus);
    } catch (error) {
      toast.error("Failed to update order status.");
    } finally {
      setUpdatingOrderId(null);
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-14 h-14 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_20px_var(--primary)]"></div>
          <p className="text-(--text) font-black tracking-tight text-lg">Loading Kitchen Display...</p>
        </div>
      </div>
    );
  }

  // Filter orders by status
  const receivedOrders = orders.filter(o => o.status === 'received');
  const preparingOrders = orders.filter(o => o.status === 'preparing');
  const readyOrders = orders.filter(o => o.status === 'ready');
  const servedOrders = orders.filter(o => o.status === 'served');

  const OrderCard = ({ order, status }) => {
    const isUpdating = updatingOrderId === order.id;

    return (
      <div className={`bg-(--surface) p-5 rounded-3xl border border-(--border)/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-300 flex flex-col group relative overflow-hidden ${isUpdating ? 'opacity-70 animate-pulse pointer-events-none scale-[0.98]' : ''}`}>
        
        {/* Card Header (ID & Time & Total) */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-(--background) border border-(--border) px-2 py-0.5 rounded-md text-[10px] font-black text-(--text-secondary) font-mono tracking-wider uppercase">
                ID: {order.id.split('-')[0]}
              </span>
            </div>
            <p className="text-xs font-bold text-(--text-muted) flex items-center gap-1.5 mt-2">
              <Clock className="w-3.5 h-3.5" />
              {new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </p>
          </div>
          <span className="font-black text-lg text-(--primary) tracking-tight">${parseFloat(order.total).toFixed(2)}</span>
        </div>

        {/* Order Items Box (Digital Receipt Look) */}
        <div className="bg-(--background) rounded-2xl p-4 border border-(--border)/50 mb-5 max-h-40 overflow-y-auto scrollbar-thin shadow-inner relative">
          <div className="space-y-2.5">
            {order.items?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm items-start">
                <span className="font-bold text-(--text) leading-tight">
                  <span className="inline-flex items-center justify-center min-w-6 h-6 bg-(--primary)/10 text-(--primary) rounded-md mr-2.5 text-xs font-black shadow-sm">{item.quantity}x</span> 
                  Menu Item <span className="text-[10px] text-(--text-muted) font-mono block mt-0.5 opacity-60">({item.menu_item_id.slice(0,6)})</span>
                </span>
              </div>
            ))}
          </div>
          {/* Faded edge for scrolling indication */}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-linear-to-t from-(--background) to-transparent pointer-events-none rounded-b-2xl"></div>
        </div>

        <div className="mt-auto relative z-10">
          {/* Action Button: Received -> Preparing */}
          {status === 'received' && (
            <button 
              onClick={() => handleStatusChange(order.id, 'preparing')}
              disabled={isUpdating}
              className="w-full py-3 sm:py-3.5 bg-linear-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 disabled:from-blue-300 disabled:to-blue-400 text-white rounded-[14px] text-sm font-black transition-all shadow-[0_8px_20px_rgba(59,130,246,0.25)] active:scale-95 flex items-center justify-center gap-2 border border-blue-400"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
              {isUpdating ? 'Processing...' : 'Confirm Payment'}
            </button>
          )}
          
          {/* Action Button: Preparing -> Ready */}
          {status === 'preparing' && (
            <button 
              onClick={() => handleStatusChange(order.id, 'ready')}
              disabled={isUpdating}
              className="w-full py-3 sm:py-3.5 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 disabled:from-amber-300 disabled:to-amber-400 text-white rounded-[14px] text-sm font-black transition-all shadow-[0_8px_20px_rgba(245,158,11,0.25)] active:scale-95 flex items-center justify-center gap-2 border border-amber-400"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
              {isUpdating ? 'Marking...' : 'Mark as Ready'}
            </button>
          )}
          
          {/* Action Button: Ready -> Served */}
          {status === 'ready' && (
            <button 
              onClick={() => handleStatusChange(order.id, 'served')}
              disabled={isUpdating}
              className="w-full py-3 sm:py-3.5 bg-linear-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 disabled:from-emerald-300 disabled:to-emerald-400 text-white rounded-[14px] text-sm font-black transition-all shadow-[0_8px_20px_rgba(16,185,129,0.25)] active:scale-95 flex items-center justify-center gap-2 border border-emerald-400"
            >
              {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Utensils className="w-5 h-5" />}
              {isUpdating ? 'Serving...' : 'Serve Order'}
            </button>
          )}
          
          {/* Completed State */}
          {status === 'served' && (
            <div className="w-full py-3 bg-purple-50/50 text-purple-600 border border-purple-200/60 rounded-[14px] text-sm font-black flex items-center justify-center gap-2 shadow-inner">
              <CheckCircle2 className="w-4 h-4" /> Completed & Paid
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] font-sans">
      
      {/* Dashboard Header */}
      <div className="mb-8 flex justify-between items-end shrink-0 px-1">
        <div>
          <h1 className="text-3xl font-black text-(--text) tracking-tight">Kitchen Display</h1>
          <p className="text-(--text-secondary) font-medium text-sm mt-1.5">Manage incoming orders and workflows in real-time</p>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden scrollbar-thin scrollbar-thumb-(--border) scrollbar-track-transparent pb-4 px-1 mask-linear-fade">
        <div className="flex gap-6 min-w-max h-full">
          
          {/* Column 1: Awaiting Payment */}
          <div className="w-85 flex flex-col bg-(--surface-secondary)/40 rounded-4xl border border-(--border)/60 overflow-hidden h-full shadow-sm relative">
            <div className="p-5 border-b border-blue-500/10 bg-linear-to-br from-blue-500/10 to-transparent flex items-center justify-between shrink-0">
              <h2 className="font-black text-(--text) text-lg flex items-center gap-3 tracking-tight">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
                  <Receipt className="w-4 h-4" /> 
                </div>
                Unpaid
              </h2>
              <span className="bg-white border border-blue-100 text-blue-600 px-3 py-1 rounded-full text-sm font-black shadow-sm">{receivedOrders.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 scrollbar-none">
              {receivedOrders.map(order => <OrderCard key={order.id} order={order} status="received" />)}
              {receivedOrders.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-(--text-muted) opacity-60">
                  <Receipt className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-bold text-sm">No pending payments</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Preparing */}
          <div className="w-85 flex flex-col bg-(--surface-secondary)/40 rounded-4xl border border-(--border)/60 overflow-hidden h-full shadow-sm relative">
            <div className="p-5 border-b border-amber-500/10 bg-linear-to-br from-amber-500/10 to-transparent flex items-center justify-between shrink-0">
              <h2 className="font-black text-(--text) text-lg flex items-center gap-3 tracking-tight">
                <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm border border-amber-200">
                  <ChefHat className="w-4 h-4" />
                </div>
                Preparing
              </h2>
              <span className="bg-white border border-amber-100 text-amber-600 px-3 py-1 rounded-full text-sm font-black shadow-sm">{preparingOrders.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 scrollbar-none">
              {preparingOrders.map(order => <OrderCard key={order.id} order={order} status="preparing" />)}
              {preparingOrders.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-(--text-muted) opacity-60">
                  <ChefHat className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-bold text-sm">No active cooking</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Ready */}
          <div className="w-85 flex flex-col bg-(--surface-secondary)/40 rounded-4xl border border-(--border)/60 overflow-hidden h-full shadow-sm relative">
            <div className="p-5 border-b border-emerald-500/10 bg-linear-to-br from-emerald-500/10 to-transparent flex items-center justify-between shrink-0">
              <h2 className="font-black text-(--text) text-lg flex items-center gap-3 tracking-tight">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                Ready to Serve
              </h2>
              <span className="bg-white border border-emerald-100 text-emerald-600 px-3 py-1 rounded-full text-sm font-black shadow-sm">{readyOrders.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 scrollbar-none">
              {readyOrders.map(order => <OrderCard key={order.id} order={order} status="ready" />)}
              {readyOrders.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-(--text-muted) opacity-60">
                  <CheckCircle2 className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-bold text-sm">No orders waiting</p>
                </div>
              )}
            </div>
          </div>

          {/* Column 4: Completed/Served */}
          <div className="w-85 flex flex-col bg-(--surface-secondary)/20 rounded-4xl border border-(--border)/40 overflow-hidden h-full shadow-sm opacity-70 hover:opacity-100 transition-opacity duration-300 relative">
            <div className="p-5 border-b border-purple-500/10 bg-linear-to-br from-purple-500/5 to-transparent flex items-center justify-between shrink-0 filter grayscale hover:grayscale-0 transition-all">
              <h2 className="font-black text-(--text) text-lg flex items-center gap-3 tracking-tight">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm border border-purple-200">
                  <Utensils className="w-4 h-4" />
                </div>
                Served
              </h2>
              <span className="bg-white border border-purple-100 text-purple-600 px-3 py-1 rounded-full text-sm font-black shadow-sm">{servedOrders.length}</span>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-4 scrollbar-none">
              {servedOrders.map(order => <OrderCard key={order.id} order={order} status="served" />)}
              {servedOrders.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-(--text-muted) opacity-60">
                  <Utensils className="w-12 h-12 mb-3 opacity-20" />
                  <p className="font-bold text-sm">No completed orders yet</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Orders;