import { useEffect } from 'react';
import { Sparkles, Plus } from 'lucide-react';
import useAuthStore from '../../store/auth/useAuthStore';
import useAiRecommendationsStore from '../../store/public/useAiRecommendationsStore';

const AiRecommendations = ({ slug, onAddToCart }) => {
  const { isAuthenticated } = useAuthStore();
  const { recommendations, isLoading, fetchRecommendations } = useAiRecommendationsStore();

  useEffect(() => {
    // Only fetch recommendations if the user is logged in (backend requirement)
    if (isAuthenticated && slug) {
      fetchRecommendations(slug);
    }
  }, [isAuthenticated, slug, fetchRecommendations]);

  // If not logged in, loading, or no recommendations, don't show the section
  if (!isAuthenticated || isLoading || !recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mb-12 relative">
      <div className="flex items-center gap-3 mb-6 px-1">
        <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-2xl font-black bg-linear-to-r from-purple-600 to-indigo-500 bg-clip-text text-transparent tracking-tight">
            Curated For You
          </h2>
          <p className="text-sm font-medium text-(--text-muted)">AI insights based on your taste</p>
        </div>
      </div>

      {/* Horizontal Scrolling Wrapper */}
      <div className="flex overflow-x-auto gap-4 sm:gap-6 pb-6 scrollbar-none px-1 -mx-4 sm:mx-0 sm:px-0">
        {/* Padding trick for smooth mobile scrolling edges */}
        <div className="w-2 shrink-0 sm:hidden"></div>
        
        {recommendations.map((item) => (
          <div 
            key={item.id} 
            className="shrink-0 w-72 bg-linear-to-br from-(--surface) to-purple-50/20 border border-purple-500/20 rounded-3xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_15px_40px_rgba(168,85,247,0.15)] hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col"
          >
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-500/10 rounded-full blur-[30px] pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-500"></div>

            <div className="flex justify-between items-start mb-3 relative z-10">
              <h3 className="font-bold text-(--text) text-lg truncate pr-2 tracking-tight">{item.name}</h3>
              <span className="font-black text-purple-600 text-lg">₹{parseFloat(item.price).toFixed(2)}</span>
            </div>
            
            <p className="text-sm font-medium text-(--text-secondary) line-clamp-2 mb-6 h-10 relative z-10 leading-relaxed">
              {item.description || 'A delicious choice recommended just for you based on previous orders.'}
            </p>
            
            <button
              onClick={() => onAddToCart && onAddToCart(item)}
              className="mt-auto w-full py-3 bg-white border-2 border-purple-100 hover:border-purple-500 hover:bg-purple-50 text-purple-700 font-bold rounded-[14px] transition-all duration-300 relative z-10 flex items-center justify-center gap-2 active:scale-95 group-hover:shadow-md"
            >
              <Plus className="w-4 h-4" /> Add to Order
            </button>
          </div>
        ))}
        
        <div className="w-2 shrink-0 sm:hidden"></div>
      </div>
    </div>
  );
};

export default AiRecommendations;