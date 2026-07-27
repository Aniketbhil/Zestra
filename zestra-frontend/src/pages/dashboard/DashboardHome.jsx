import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  TrendingUp,
  ShoppingBag,
  QrCode,
  Plus,
  ArrowRight,
  Store,
  Clock,
  Sparkles,
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

  // FIX 1: Only fetch restaurant data if the user is a restaurant owner
  useEffect(() => {
    const loadDashboardData = async () => {
      if (user?.role === "restaurant" && !restaurant) {
        await fetchMyRestaurant();
      }
      setIsInitializing(false);
    };

    loadDashboardData();
  }, [restaurant, fetchMyRestaurant, user?.role]);

  // FIX 2: Only fetch analytics and orders if they are a restaurant owner with a profile
  useEffect(() => {
    if (user?.role === "restaurant" && restaurant?.slug) {
      fetchAnalytics();
      fetchOrders();
    }
  }, [restaurant?.slug, fetchAnalytics, fetchOrders, user?.role]);

  // FIX 3: Instantly render the Customer view if they are a customer
  if (user?.role === "customer") {
    return <CustomerHome />;
  }

  // --- RESTAURANT ONLY RENDER LOGIC BELOW ---

  if (isInitializing || isRestaurantLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-(--text-muted) font-medium">
            Loading Dashboard...
          </p>
        </div>
      </div>
    );
  }

  // If the user hasn't created a restaurant profile yet
  if (!restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center max-w-md mx-auto space-y-6">
        <div className="w-20 h-20 bg-(--primary)/10 rounded-full flex items-center justify-center">
          <Store className="w-10 h-10 text-(--primary)" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-(--text)">
            Welcome to Zestra!
          </h2>
          <p className="text-(--text-secondary) mt-2 leading-relaxed">
            Your account is created, but you need to set up your restaurant
            profile before you can manage menus and take orders.
          </p>
        </div>
        <button
          onClick={() => navigate("/dashboard/onboard")}
          className="w-full py-3 bg-(--primary) hover:bg-(--primary-hover) text-white rounded-[14px] font-bold shadow-sm shadow-(--primary)/25 transition-colors flex items-center justify-center gap-2"
        >
          Set Up Restaurant <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Calculate quick stats
  const pendingOrders = orders.filter((o) =>
    ["received", "preparing"].includes(o.status),
  ).length;
  const todayRevenue = analyticsData?.total_sales || 0;

  // Get 3 most recent orders
  const recentOrders = orders.slice(0, 3);

  return (
    <div className="space-y-8 pb-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold text-(--text)">
          Welcome back, {restaurant.name}
        </h1>
        <p className="text-(--text-secondary) text-sm mt-1">
          Here is what is happening at your restaurant today.
        </p>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-(--surface) p-6 rounded-[20px] border border-(--border) shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-(--text-secondary)">
              Today's Revenue
            </span>
            <div className="w-8 h-8 rounded-full bg-[#DCFCE7] text-[#22C55E] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-(--text)">
            ${parseFloat(todayRevenue).toFixed(2)}
          </h3>
        </div>

        <div className="bg-(--surface) p-6 rounded-[20px] border border-(--border) shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-(--text-secondary)">
              Pending Orders
            </span>
            <div className="w-8 h-8 rounded-full bg-[#FEF3C7] text-[#F59E0B] flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-(--text)">{pendingOrders}</h3>
        </div>

        <div className="bg-(--surface) p-6 rounded-[20px] border border-(--border) shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-(--text-secondary)">
              Total Orders
            </span>
            <div className="w-8 h-8 rounded-full bg-[#DBEAFE] text-[#3B82F6] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-(--text)">{orders.length}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-(--surface) rounded-[20px] border border-(--border) shadow-sm p-6">
          <h2 className="text-lg font-bold text-(--text) mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. Add Menu Item */}
            <button
              onClick={() => navigate("/dashboard/menu")}
              className="flex items-center gap-3 p-4 rounded-2xl border border-(--border) bg-(--background) hover:bg-(--surface-secondary) transition-colors text-left"
            >
              <div className="bg-(--primary)/10 p-2 rounded-lg text-(--primary)">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-(--text) text-sm">
                  Add Menu Item
                </div>
                <div className="text-xs text-(--text-muted)">
                  Update your offerings
                </div>
              </div>
            </button>

            {/* 2. Get QR Code */}
            <button
              onClick={() => navigate("/dashboard/qr")}
              className="flex items-center gap-3 p-4 rounded-2xl border border-(--border) bg-(--background) hover:bg-(--surface-secondary) transition-colors text-left"
            >
              <div className="bg-(--primary)/10 p-2 rounded-lg text-(--primary)">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-(--text) text-sm">
                  Get QR Code
                </div>
                <div className="text-xs text-(--text-muted)">
                  Print for your tables
                </div>
              </div>
            </button>

            {/* 3. Manage Live Orders (Removed sm:col-span-2 so it fits cleanly) */}
            <button
              onClick={() => navigate("/dashboard/orders")}
              className="flex items-center gap-3 p-4 rounded-2xl border border-(--border) bg-(--background) hover:bg-(--surface-secondary) transition-colors text-left"
            >
              <div className="bg-[#DBEAFE] p-2 rounded-lg text-[#3B82F6]">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-(--text) text-sm">
                  Manage Live Orders
                </div>
                <div className="text-xs text-(--text-muted)">
                  Jump to kitchen display
                </div>
              </div>
            </button>

            {/* 4. NEW: AI Assistant Button */}
            <button
              onClick={() => navigate("/dashboard/ai")}
              className="flex items-center gap-3 p-4 rounded-2xl border border-(--border) bg-(--background) hover:bg-(--surface-secondary) transition-colors text-left"
            >
              <div className="bg-purple-100 p-2 rounded-lg text-purple-600">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-(--text) text-sm">
                  AI Insights
                </div>
                <div className="text-xs text-(--text-muted)">
                  Ask Gemini to analyze sales
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Recent Orders Preview */}
        <div className="bg-(--surface) rounded-[20px] border border-(--border) shadow-sm p-6 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-(--text)">Recent Orders</h2>
            <button
              onClick={() => navigate("/dashboard/orders")}
              className="text-sm font-semibold text-(--primary) hover:text-(--primary-hover) flex items-center gap-1"
            >
              View All <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3">
            {recentOrders.length === 0 ? (
              <div className="h-full flex items-center justify-center text-(--text-muted) text-sm border-2 border-dashed border-(--border) rounded-[14px]">
                No recent orders found.
              </div>
            ) : (
              recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 rounded-[14px] bg-(--surface-secondary) border border-(--border)"
                >
                  <div>
                    <div className="font-bold text-(--text) text-sm">
                      #{order.order_id?.split("-")[0] || order.id.split("-")[0]}
                    </div>
                    <div className="text-xs text-(--text-secondary) mt-0.5">
                      {order.items.length} items • $
                      {parseFloat(order.total).toFixed(2)}
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${
                      order.status === "served"
                        ? "bg-(--background) text-(--text-muted) border border-(--border)"
                        : order.status === "ready"
                          ? "bg-[#DCFCE7] text-[#22C55E]"
                          : order.status === "preparing"
                            ? "bg-[#FEF3C7] text-[#F59E0B]"
                            : "bg-[#DBEAFE] text-[#3B82F6]"
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
