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
      <div className="flex h-full items-center justify-center text-(--text-muted)">
        Please complete onboarding to view analytics.
      </div>
    );
  }

  const topSellingItem = analyticsData?.top_items?.length > 0 
    ? analyticsData.top_items[0].name 
    : "No data yet";

  return (
    <div className="space-y-8 pb-12 max-w-7xl mx-auto px-4 sm:px-6">
      
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Analytics Overview</h1>
        <p className="text-(--text-secondary) text-sm mt-1">Real-time performance metrics synced to your timezone.</p>
      </div>

      {/* --- Key Metrics Grid --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-(--surface) p-6 rounded-3xl border border-(--border) shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#22C55E] flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="font-medium text-(--text-secondary)">Total Revenue</span>
          </div>
          <h3 className="text-3xl font-extrabold text-(--text)">
            ${parseFloat(analyticsData?.total_sales || 0).toFixed(2)}
          </h3>
        </div>

        <div className="bg-(--surface) p-6 rounded-3xl border border-(--border) shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-[#DBEAFE] text-[#3B82F6] flex items-center justify-center shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <span className="font-medium text-(--text-secondary)">Orders Today (IST)</span>
          </div>
          <h3 className="text-3xl font-extrabold text-(--text)">{todayOrdersCount}</h3>
        </div>

        <div className="bg-(--surface) p-6 rounded-3xl border border-(--border) shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <span className="font-medium text-(--text-secondary)">Top Selling Item</span>
          </div>
          <h3 className="text-xl font-extrabold text-(--text) truncate" title={topSellingItem}>
            {topSellingItem}
          </h3>
        </div>

        <div className="bg-(--surface) p-6 rounded-3xl border border-(--border) shadow-sm">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
              <Activity className="w-6 h-6" />
            </div>
            <span className="font-medium text-(--text-secondary)">Business Status</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
            <h3 className="text-xl font-bold text-(--text)">Online</h3>
          </div>
        </div>
      </div>

      {/* --- IST Orders By Hour Chart --- */}
      <div className="bg-(--surface) rounded-3xl border border-(--border) shadow-sm p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div>
            <h2 className="text-xl font-bold text-(--text)">Orders by Hour</h2>
            <p className="text-sm text-(--text-secondary) mt-1">Today's hourly traffic distribution</p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-(--surface-secondary) border border-(--border) text-xs font-bold text-(--text-muted) tracking-wide">
            <AlertCircle className="w-4 h-4 text-(--primary)" />
            Timezone: IST (Asia/Kolkata)
          </div>
        </div>

        <div className="h-100 w-full mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis 
                dataKey="displayTime" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
                dy={10}
              />
              <YAxis 
                allowDecimals={false} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: 'var(--text-muted)' }} 
              />
              <Tooltip 
                cursor={{ fill: 'var(--surface-secondary)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    const isCurrent = data.hour === currentISTHour;
                    return (
                      <div className="bg-(--surface) border border-(--border) p-4 rounded-2xl shadow-xl">
                        <p className="font-bold text-(--text) text-base mb-1">{data.displayTime} IST</p>
                        <p className="text-(--primary) font-semibold flex items-center gap-2">
                          <ShoppingBag className="w-4 h-4" /> {data.orders} Orders
                        </p>
                        {isCurrent && (
                          <div className="mt-2 text-[10px] uppercase font-bold tracking-wider bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md inline-block">
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
                radius={[6, 6, 0, 0]}
                animationDuration={1500}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.hour === currentISTHour ? 'var(--primary)' : 'var(--primary-hover)'} 
                    fillOpacity={entry.hour === currentISTHour ? 1 : 0.4}
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