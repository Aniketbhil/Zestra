import { useEffect } from 'react';
import { Clock, ChefHat, ShoppingBag, CheckCircle2 } from 'lucide-react';
import useRestaurantOrderStore from '../../store/dashboard/useRestaurantOrderStore';
import useRestaurantStore from '../../store/dashboard/useRestaurantStore';

const STATUS_CONFIG = {
  received: { label: 'New Orders', color: 'bg-[#DBEAFE] text-[#3B82F6]', icon: Clock, next: 'preparing', btnText: 'Accept' },
  preparing: { label: 'Preparing', color: 'bg-[#FEF3C7] text-[#F59E0B]', icon: ChefHat, next: 'ready', btnText: 'Mark Ready' },
  ready: { label: 'Ready to Serve', color: 'bg-[#DCFCE7] text-[#22C55E]', icon: ShoppingBag, next: 'served', btnText: 'Mark Served' },
  served: { label: 'Completed', color: 'bg-(--surface-secondary) text-(--text-muted)', icon: CheckCircle2, next: null, btnText: null }
};

const Orders = () => {
  const { restaurant, fetchMyRestaurant } = useRestaurantStore();
  const { orders, fetchOrders, updateOrderStatus, connectDashboardStream, disconnectDashboardStream, isLoading } = useRestaurantOrderStore();

  // 1. Fetch restaurant slug if not already loaded
  useEffect(() => {
    if (!restaurant) fetchMyRestaurant();
  }, [restaurant, fetchMyRestaurant]);

  // 2. Fetch orders and connect WebSocket once we have the slug
  useEffect(() => {
    if (restaurant?.slug) {
      fetchOrders();
      connectDashboardStream(restaurant.slug);
    }
    
    return () => {
      disconnectDashboardStream();
    };
  }, [restaurant?.slug, fetchOrders, connectDashboardStream, disconnectDashboardStream]);

  const handleUpdateStatus = (orderId, nextStatus) => {
    if (!nextStatus) return;
    updateOrderStatus(orderId, nextStatus);
  };

  const getOrdersByStatus = (status) => orders.filter(order => order.status === status);

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Live Kitchen Display</h1>
        <p className="text-(--text-secondary) text-sm mt-1">Manage incoming orders in real-time</p>
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-(--text-muted)">Loading active orders...</div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6 overflow-x-auto pb-4">
          
          {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
            const columnOrders = getOrdersByStatus(statusKey);
            const Icon = config.icon;

            return (
              <div key={statusKey} className="flex flex-col bg-(--surface-secondary)/50 rounded-3xl p-4 border border-(--border) min-w-75">
                
                {/* Column Header */}
                <div className="flex items-center justify-between mb-4 px-2">
                  <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-(--text-secondary)" />
                    <h2 className="font-bold text-(--text)">{config.label}</h2>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${config.color}`}>
                    {columnOrders.length}
                  </span>
                </div>

                {/* Orders List */}
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
                  {columnOrders.length === 0 ? (
                    <div className="text-center p-6 text-(--text-muted) text-sm border-2 border-dashed border-(--border) rounded-2xl">
                      No orders
                    </div>
                  ) : (
                    columnOrders.map(order => (
                      <div key={order.id} className="bg-(--surface) p-4 rounded-2xl shadow-sm border border-(--border)">
                        <div className="flex justify-between items-start mb-3">
                          <span className="font-bold text-(--text)">#{order.order_id?.split('-')[0] || order.id.split('-')[0]}</span>
                          <span className="text-xs text-(--text-secondary)">
                            {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        
                        <div className="space-y-2 mb-4 border-b border-(--border) pb-4">
                          {order.items.map(item => (
                            <div key={item.id} className="flex justify-between text-sm">
                              <span className="text-(--text-secondary)"><span className="font-bold text-(--text)">{item.quantity}x</span> {item.name || 'Menu Item'}</span>
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="font-bold text-(--text)">${parseFloat(order.total).toFixed(2)}</span>
                          
                          {config.next && (
                            <button 
                              onClick={() => handleUpdateStatus(order.id, config.next)}
                              className="px-4 py-2 bg-(--primary) hover:bg-(--primary-hover) text-white text-xs font-bold rounded-[10px] transition-colors shadow-sm shadow-(--primary)/20"
                            >
                              {config.btnText}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Orders;