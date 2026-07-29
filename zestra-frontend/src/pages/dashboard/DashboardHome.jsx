import { useEffect, useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import {
  TrendingUp,
  ShoppingBag,
  QrCode,
  Plus,
  ArrowRight,
  Store,
  Clock,
  Sparkles,
  Edit3,
  Award, // <-- Added Award icon for the new stat
} from "lucide-react";
import useAuthStore from "../../store/auth/useAuthStore";
import useRestaurantStore from "../../store/dashboard/useRestaurantStore";
import useAnalyticsStore from "../../store/dashboard/useAnalyticsStore";
import useRestaurantOrderStore from "../../store/dashboard/useRestaurantOrderStore";
import CustomerHome from "../customer/CustomerHome";

const DashboardHome = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const {
    restaurant,
    fetchMyRestaurant,
    isLoading: isRestaurantLoading,
  } = useRestaurantStore();
  const { analyticsData, fetchAnalytics } = useAnalyticsStore();
  const { orders, fetchOrders } = useRestaurantOrderStore();

  const [isInitializing, setIsInitializing] = useState(true);

  // SECURITY FIX: Prevent stale data from previous logins
  const currentRestaurant = restaurant?.owner_id === user?.id ? restaurant : null;

  // Always force a fresh fetch when the user ID changes
  useEffect(() => {
    const loadDashboardData = async () => {
      if (user?.role === 'restaurant') {
        await fetchMyRestaurant();
      }
      setIsInitializing(false);
    };
    
    loadDashboardData();
  }, [user?.id, fetchMyRestaurant, user?.role]);

  // Only fetch analytics and orders if the CURRENT verified restaurant exists
  useEffect(() => {
    if (user?.role === 'restaurant' && currentRestaurant?.slug) {
      fetchAnalytics();
      fetchOrders();
    }
  }, [currentRestaurant?.slug, fetchAnalytics, fetchOrders, user?.role]);

  // Instantly render the Customer view if they are a customer
  if (user?.role === 'customer') {
    return <CustomerHome />;
  }

  // --- RESTAURANT ONLY RENDER LOGIC BELOW ---

  if (isInitializing || isRestaurantLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-14 h-14 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-6 shadow-[0_0_20px_var(--primary)]"></div>
          <p className="text-(--text) font-black tracking-tight text-lg">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // If the user hasn't created a restaurant profile yet (or if the data is stale)
  if (!currentRestaurant) {
    return <Navigate to="/dashboard/onboard" replace />;
  }

  // Calculate quick stats
  const pendingOrders = orders.filter((o) =>
    ["received", "preparing"].includes(o.status),
  ).length;
  const todayRevenue = analyticsData?.total_sales || 0;

  // Get Top Selling Item dynamically from the analytics endpoint
  const topSellingItem = analyticsData?.top_items?.length > 0 
    ? analyticsData.top_items[0].name 
    : "No data yet";

  // Get 3 most recent orders
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-8 pb-12 font-sans">
      
      {/* Premium Welcome Banner */}
      <div className="bg-linear-to-br from-(--primary)/10 via-(--surface) to-(--surface) border border-(--border)/60 rounded-4xl p-6 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 relative overflow-hidden">
        {/* Ambient Glow */}
        <div className="absolute -right-20 -top-20 w-64 h-64 bg-(--primary)/10 rounded-full blur-[60px] pointer-events-none"></div>

        <div className="flex items-center gap-5 sm:gap-6 relative z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-linear-to-br from-(--primary) to-emerald-600 text-white rounded-[20px] flex items-center justify-center shrink-0 shadow-lg shadow-(--primary)/30">
            <Store className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-4xl font-black text-(--text) tracking-tight leading-tight">
              Welcome back,<br className="hidden sm:block" /> {currentRestaurant.name}
            </h1>
            <p className="text-(--text-secondary) font-bold text-sm sm:text-base mt-2 flex items-center gap-2 bg-(--background)/50 w-fit px-3 py-1 rounded-lg border border-(--border)/50">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_8px_#10B981]"></span>
              </span>
              Live & Accepting Orders
            </p>
          </div>
        </div>
        <Link 
          to="/dashboard/settings"
          className="w-full sm:w-auto px-6 py-3.5 bg-white border border-gray-200 hover:border-(--primary)/30 text-gray-800 hover:text-(--primary) font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-95 relative z-10"
        >
          <Edit3 className="w-4 h-4" /> Edit Details
        </Link>
      </div>

      {/* Quick Stats Bento Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Revenue Stat */}
        <div className="bg-(--surface) p-6 sm:p-8 rounded-4xl border border-(--border)/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-emerald-500/18 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/25 transition-colors"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <span className="text-sm font-bold text-(--text-secondary) uppercase tracking-wider">
              Today's Revenue
            </span>
            <div className="w-12 h-12 rounded-[14px] bg-linear-to-br from-emerald-100 to-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl sm:text-5xl font-black text-(--text) tracking-tight relative z-10">
            ${parseFloat(todayRevenue).toFixed(2)}
          </h3>
        </div>

        {/* Pending Orders Stat */}
        <div className="bg-(--surface) p-6 sm:p-8 rounded-4xl border border-(--border)/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <span className="text-sm font-bold text-(--text-secondary) uppercase tracking-wider">
              Pending Orders
            </span>
            <div className="w-12 h-12 rounded-[14px] bg-linear-to-br from-amber-100 to-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
              <Clock className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-4xl sm:text-5xl font-black text-(--text) tracking-tight relative z-10">
            {pendingOrders}
          </h3>
        </div>

        {/* Top Selling Item Stat */}
        <div className="bg-(--surface) p-6 sm:p-8 rounded-4xl border border-(--border)/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-colors"></div>
          <div className="flex items-center justify-between mb-6 relative z-10">
            <span className="text-sm font-bold text-(--text-secondary) uppercase tracking-wider">
              Top Selling Item
            </span>
            <div className="w-12 h-12 rounded-[14px] bg-linear-to-br from-purple-100 to-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform duration-500">
              <Award className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-(--text) truncate tracking-tight relative z-10" title={topSellingItem}>
            {topSellingItem}
          </h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        
        {/* Quick Actions Bento Grid */}
        <div className="bg-(--surface) rounded-4xl border border-(--border)/60 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-6 sm:p-8">
          <h2 className="text-xl font-black text-(--text) mb-6 tracking-tight">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              onClick={() => navigate("/dashboard/menu")}
              className="flex items-center gap-4 p-5 rounded-[20px] border border-(--border)/60 bg-(--background) hover:bg-(--surface-secondary) hover:border-(--primary)/30 transition-all duration-300 text-left group active:scale-95 hover:shadow-sm"
            >
              <div className="bg-(--primary)/10 border border-(--primary)/20 p-3 rounded-xl text-(--primary) group-hover:scale-110 transition-transform duration-300">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-(--text) text-base">
                  Add Menu Item
                </div>
                <div className="text-xs font-medium text-(--text-muted) mt-0.5">
                  Update your offerings
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/dashboard/qr")}
              className="flex items-center gap-4 p-5 rounded-[20px] border border-(--border)/60 bg-(--background) hover:bg-(--surface-secondary) hover:border-gray-400 transition-all duration-300 text-left group active:scale-95 hover:shadow-sm"
            >
              <div className="bg-gray-100 border border-gray-200 p-3 rounded-xl text-gray-700 group-hover:scale-110 transition-transform duration-300">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-(--text) text-base">
                  Get QR Code
                </div>
                <div className="text-xs font-medium text-(--text-muted) mt-0.5">
                  Print for your tables
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/dashboard/orders")}
              className="flex items-center gap-4 p-5 rounded-[20px] border border-(--border)/60 bg-(--background) hover:bg-(--surface-secondary) hover:border-blue-400/50 transition-all duration-300 text-left group active:scale-95 hover:shadow-sm"
            >
              <div className="bg-blue-100 border border-blue-200 p-3 rounded-xl text-blue-600 group-hover:scale-110 transition-transform duration-300">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-(--text) text-base">
                  Manage Orders
                </div>
                <div className="text-xs font-medium text-(--text-muted) mt-0.5">
                  Live kitchen display
                </div>
              </div>
            </button>

            <button
              onClick={() => navigate("/dashboard/ai")}
              className="flex items-center gap-4 p-5 rounded-[20px] border border-(--border)/60 bg-(--background) hover:bg-(--surface-secondary) hover:border-purple-400/50 transition-all duration-300 text-left group active:scale-95 hover:shadow-sm"
            >
              <div className="bg-purple-100 border border-purple-200 p-3 rounded-xl text-purple-600 group-hover:scale-110 transition-transform duration-300">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-(--text) text-base">
                  AI Insights
                </div>
                <div className="text-xs font-medium text-(--text-muted) mt-0.5">
                  Ask Gemini to analyze
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Orders Preview */}
        <div className="bg-(--surface) rounded-4xl border border-(--border)/60 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-6 sm:p-8 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-black text-(--text) tracking-tight">Recent Orders</h2>
            <button
              onClick={() => navigate("/dashboard/orders")}
              className="text-sm font-black text-(--primary) hover:text-(--primary-hover) bg-(--primary)/5 hover:bg-(--primary)/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors active:scale-95"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {recentOrders.length === 0 ? (
              <div className="h-full min-h-50 flex flex-col items-center justify-center text-(--text-muted) border-2 border-dashed border-(--border)/60 rounded-[20px] bg-(--background)/50">
                <ShoppingBag className="w-10 h-10 mb-3 opacity-30" />
                <span className="font-bold text-sm">No recent orders found.</span>
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 rounded-[20px] bg-(--background) border border-(--border)/60 hover:border-(--border) transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-(--surface-secondary) border border-(--border) flex items-center justify-center text-(--text-secondary) font-black text-xs">
                      #{order.id.split("-")[0].substring(0, 3)}
                    </div>
                    <div>
                      <div className="font-black text-(--text) text-base tracking-tight">
                        Order #{order.order_id?.split("-")[0] || order.id.split("-")[0]}
                      </div>
                      <div className="text-xs font-medium text-(--text-secondary) mt-0.5">
                        {order.items.length} items • <span className="text-(--primary) font-bold">${parseFloat(order.total).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border shadow-sm shrink-0 ${
                      order.status === "served"
                        ? "bg-(--surface-secondary) text-(--text-secondary) border-(--border)"
                        : order.status === "ready"
                          ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                          : order.status === "preparing"
                            ? "bg-amber-50 text-amber-600 border-amber-100"
                            : "bg-blue-50 text-blue-600 border-blue-100"
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;