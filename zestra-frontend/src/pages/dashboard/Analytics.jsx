import { useEffect, useState, useMemo } from 'react';
import { TrendingUp, ShoppingBag, Award, Activity, AlertCircle } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell 
} from 'recharts';
import useAuthStore from '../../store/auth/useAuthStore';
import useRestaurantStore from '../../store/dashboard/useRestaurantStore';
import useAnalyticsStore from '../../store/dashboard/useAnalyticsStore';
import api from '../../services/api'; // Added API import to fetch full history

const Analytics = () => {
  const { user } = useAuthStore();
  const { restaurant } = useRestaurantStore();
  const { analyticsData, fetchAnalytics } = useAnalyticsStore();
  
  // NEW: Create a dedicated state for ALL orders (including 'served') just for Analytics
  const [allOrders, setAllOrders] = useState([]);

  // --- Real-time Fetching ---
  useEffect(() => {
    // Function to explicitly request ALL statuses from the backend so "served" orders don't vanish
    const fetchAllOrdersForAnalytics = async () => {
      try {
        const response = await api.get('/orders?status=received,preparing,ready,served');
        setAllOrders(response.data);
      } catch (error) {
        console.error("Failed to fetch historical orders for analytics", error);
      }
    };

    if (user?.role === 'restaurant' && restaurant?.slug) {
      fetchAnalytics();
      fetchAllOrdersForAnalytics();
      
      // Poll every 5 seconds for real-time graph updates
      const interval = setInterval(() => {
        fetchAnalytics();
        fetchAllOrdersForAnalytics();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [user?.role, restaurant?.slug, fetchAnalytics]);

  // --- IST Timezone Logic & Data Processing ---
  const { chartData, currentISTHour, todayOrdersCount } = useMemo(() => {
    // 1. Get current time in IST
    const now = new Date();
    const istString = now.toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
    const nowIST = new Date(istString);
    
    const currentHour = nowIST.getHours();
    
    // Create boundaries for "Today in IST"
    const startOfTodayIST = new Date(nowIST);
    startOfTodayIST.setHours(0, 0, 0, 0);
    
    const endOfTodayIST = new Date(nowIST);
    endOfTodayIST.setHours(23, 59, 59, 999);

    // 2. Filter orders that happened TODAY in IST
    const todaysOrders = allOrders.filter(order => {
      const orderDateUTC = new Date(order.created_at);
      const orderDateIST = new Date(orderDateUTC.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      return orderDateIST >= startOfTodayIST && orderDateIST <= endOfTodayIST;
    });

    // 3. Group by exact IST hour (0-23)
    const hourCounts = new Array(24).fill(0);
    todaysOrders.forEach(order => {
      const orderDateUTC = new Date(order.created_at);
      const orderDateIST = new Date(orderDateUTC.toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
      hourCounts[orderDateIST.getHours()]++;
    });

    // 4. Format exactly 24 data points for the graph
    const formattedData = hourCounts.map((count, index) => ({
      hour: index,
      displayTime: `${index.toString().padStart(2, '0')}:00`,
      orders: count
    }));

    return { 
      chartData: formattedData, 
      currentISTHour: currentHour,
      todayOrdersCount: todaysOrders.length
    };
  }, [allOrders]);

  // --- Fallback States ---
  if (!restaurant) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="flex flex-col items-center text-(--text-muted) bg-(--surface) p-8 rounded-4xl border border-(--border)/60 shadow-sm">
          <Activity className="w-12 h-12 mb-4 opacity-30" />
          <p className="font-bold text-lg">Please complete onboarding to view analytics.</p>
        </div>
      </div>
    );
  }

  const topSellingItem = analyticsData?.top_items?.length > 0 
    ? analyticsData.top_items[0].name 
    : "No data yet";

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto px-1 font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-(--text) tracking-tight">Analytics Overview</h1>
        <p className="text-(--text-secondary) font-medium text-sm mt-1.5">Real-time performance metrics synced to your timezone.</p>
      </div>

      {/* --- Key Metrics Grid --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
        
        {/* Total Revenue */}
        <div className="bg-(--surface) p-6 sm:p-8 rounded-4xl border border-(--border)/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-emerald-500/18 rounded-full blur-2xl pointer-events-none group-hover:bg-emerald-500/25 transition-colors"></div>
          <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
            <span className="text-sm font-bold text-(--text-secondary) uppercase tracking-wider">Total Revenue</span>
            <div className="w-12 h-12 rounded-[14px] bg-linear-to-br from-emerald-100 to-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-(--text) tracking-tight relative z-10">
            ₹{parseFloat(analyticsData?.total_sales || 0).toFixed(2)}
          </h3>
        </div>

        {/* Orders Today */}
        <div className="bg-(--surface) p-6 sm:p-8 rounded-4xl border border-(--border)/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-500/20 transition-colors"></div>
          <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
            <span className="text-sm font-bold text-(--text-secondary) uppercase tracking-wider">Orders Today (IST)</span>
            <div className="w-12 h-12 rounded-[14px] bg-linear-to-br from-blue-100 to-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-3xl sm:text-4xl font-black text-(--text) tracking-tight relative z-10">
            {todayOrdersCount}
          </h3>
        </div>

        {/* Top Selling Item */}
        <div className="bg-(--surface) p-6 sm:p-8 rounded-4xl border border-(--border)/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-purple-500/20 transition-colors"></div>
          <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
            <span className="text-sm font-bold text-(--text-secondary) uppercase tracking-wider">Top Selling Item</span>
            <div className="w-12 h-12 rounded-[14px] bg-linear-to-br from-purple-100 to-purple-50 border border-purple-100 text-purple-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500">
              <Award className="w-6 h-6" />
            </div>
          </div>
          <h3 className="text-2xl font-black text-(--text) truncate tracking-tight relative z-10" title={topSellingItem}>
            {topSellingItem}
          </h3>
        </div>

        {/* Business Status */}
        <div className="bg-(--surface) p-6 sm:p-8 rounded-4xl border border-(--border)/60 shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:shadow-[0_15px_40px_rgb(0,0,0,0.06)] hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group relative overflow-hidden">
          <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-colors"></div>
          <div className="flex items-center justify-between gap-4 mb-6 relative z-10">
            <span className="text-sm font-bold text-(--text-secondary) uppercase tracking-wider">Business Status</span>
            <div className="w-12 h-12 rounded-[14px] bg-linear-to-br from-amber-100 to-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-110 transition-transform duration-500">
              <Activity className="w-6 h-6" />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-1 relative z-10">
            <span className="relative flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 shadow-[0_0_8px_#10B981]"></span>
            </span>
            <h3 className="text-3xl font-black text-(--text) tracking-tight">Online</h3>
          </div>
        </div>
      </div>

      {/* --- IST Orders By Hour Chart --- */}
      <div className="bg-(--surface) rounded-4xl border border-(--border)/60 shadow-[0_4px_20px_rgb(0,0,0,0.02)] p-6 sm:p-10">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-4">
          <div>
            <h2 className="text-2xl font-black text-(--text) tracking-tight">Orders by Hour</h2>
            <p className="text-sm font-medium text-(--text-secondary) mt-1.5">Today's hourly traffic distribution</p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-(--background) border border-(--border)/60 text-xs font-bold text-(--text-secondary) tracking-wide shadow-sm">
            <AlertCircle className="w-4 h-4 text-(--primary)" />
            Timezone: IST (Asia/Kolkata)
          </div>
        </div>

        <div className="h-100 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis 
                dataKey="displayTime" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: 600 }} 
                dy={15}
              />
              <YAxis 
                allowDecimals={false} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--text-muted)', fontWeight: 600 }} 
                dx={-10}
              />
              <Tooltip 
                cursor={{ fill: 'var(--surface-secondary)', opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isCurrent = data.hour === currentISTHour;
                    return (
                      <div className="bg-(--surface) border border-(--border)/60 p-4 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)]">
                        <p className="font-black text-(--text) text-lg mb-1 tracking-tight">{data.displayTime} IST</p>
                        <p className="text-(--primary) font-bold flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4" /> {data.orders} Orders
                        </p>
                        {isCurrent && (
                          <div className="mt-3 text-[10px] uppercase font-black tracking-widest bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md inline-block">
                            Current Hour
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="orders" 
                radius={[8, 8, 0, 0]}
                animationDuration={1500}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.hour === currentISTHour ? 'var(--primary)' : 'var(--primary-hover)'} 
                    fillOpacity={entry.hour === currentISTHour ? 1 : 0.25}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Analytics;