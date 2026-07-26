import { useEffect } from 'react';
import { TrendingUp, DollarSign, ShoppingBag, Award } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import useAnalyticsStore from '../../store/dashboard/useAnalyticsStore';

const Analytics = () => {
  const { analyticsData, isLoading, fetchAnalytics } = useAnalyticsStore();

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading || !analyticsData) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-(--text-muted) font-medium">Crunching the numbers...</p>
        </div>
      </div>
    );
  }

  // Transform backend object {"10": 5, "11": 12} into array for Recharts
  const hourlyData = Object.entries(analyticsData.orders_by_hour || {}).map(([hour, count]) => ({
    time: `${hour}:00`,
    orders: count
  }));

  return (
    <div className="space-y-6 pb-6">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Analytics Overview</h1>
        <p className="text-(--text-secondary) text-sm mt-1">Real-time insights into your restaurant's performance</p>
      </div>

      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Total Sales */}
        <div className="bg-(--surface) p-6 rounded-[20px] border border-(--border) shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#DCFCE7] text-[#22C55E] flex items-center justify-center shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-(--text-secondary)">Total Revenue</p>
            <h3 className="text-2xl font-bold text-(--text)">
              ${parseFloat(analyticsData.total_sales || 0).toFixed(2)}
            </h3>
          </div>
        </div>

        {/* Total Orders (Calculated from hourly data for display purposes) */}
        <div className="bg-(--surface) p-6 rounded-[20px] border border-(--border) shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#DBEAFE] text-[#3B82F6] flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-(--text-secondary)">Orders Today</p>
            <h3 className="text-2xl font-bold text-(--text)">
              {hourlyData.reduce((acc, curr) => acc + curr.orders, 0)}
            </h3>
          </div>
        </div>

        {/* Trending Status */}
        <div className="bg-(--surface) p-6 rounded-[20px] border border-(--border) shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-[#FEF3C7] text-[#F59E0B] flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-(--text-secondary)">Business Status</p>
            <h3 className="text-2xl font-bold text-(--text)">Active</h3>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Orders Chart */}
        <div className="lg:col-span-2 bg-(--surface) p-6 rounded-[20px] border border-(--border) shadow-sm">
          <h2 className="text-lg font-bold text-(--text) mb-6">Orders by Hour</h2>
          
          {hourlyData.length > 0 ? (
            <div className="h-75 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                  <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} />
                  <Tooltip 
                    cursor={{ fill: 'var(--surface-secondary)' }}
                    contentStyle={{ borderRadius: '12px', border: '1px solid var(--border)', boxShadow: '0 4px 18px rgba(15,23,42,0.05)' }}
                  />
                  <Bar dataKey="orders" fill="var(--primary)" radius={[6, 6, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-75 w-full flex items-center justify-center text-(--text-muted) border-2 border-dashed border-(--border) rounded-2xl">
              No order data available yet.
            </div>
          )}
        </div>

        {/* Top Items List */}
        <div className="bg-(--surface) p-6 rounded-[20px] border border-(--border) shadow-sm flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-(--primary)" />
            <h2 className="text-lg font-bold text-(--text)">Top Selling Items</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
            {(!analyticsData.top_items || analyticsData.top_items.length === 0) ? (
              <div className="text-center p-6 text-(--text-muted) text-sm border-2 border-dashed border-(--border) rounded-2xl">
                No sales data yet
              </div>
            ) : (
              analyticsData.top_items.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-xl bg-(--surface-secondary) border border-(--border) transition-colors hover:border-(--primary)/30">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-(--background) flex items-center justify-center font-bold text-(--text-muted) text-sm">
                      #{index + 1}
                    </div>
                    <span className="font-semibold text-(--text) text-sm">{item.name}</span>
                  </div>
                  <span className="font-bold text-(--primary) text-sm">{item.count} sold</span>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Analytics;