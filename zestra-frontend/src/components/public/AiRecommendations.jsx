import { useEffect } from 'react';
import { Sparkles } from 'lucide-react';
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

  // If not logged in, loading, or no recommendations, don't show the section to keep UI clean
  if (!isAuthenticated || isLoading || !recommendations || recommendations.length === 0) {
    return null;
  }

  return (
    <div className="mb-10">
      <div className="flex items-center gap-2 mb-4 px-2">
        <Sparkles className="w-5 h-5 text-purple-500" />
        <h2 className="text-xl font-bold bg-linear-to-r from-purple-500 to-indigo-500 bg-clip-text text-transparent">
          AI Recommended for You
        </h2>
      </div>

      {/* Horizontal Scrolling Wrapper */}
      <div className="flex overflow-x-auto gap-4 pb-4 scrollbar-thin px-2">
        {recommendations.map((item) => (
          <div 
            key={item.id} 
            className="shrink-0 w-64 bg-(--surface) border border-purple-500/30 rounded-[20px] p-4 shadow-sm relative overflow-hidden"
          >
            {/* Soft purple glow effect in the background */}
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="flex justify-between items-start mb-2 relative z-10">
              <h3 className="font-bold text-(--text) text-lg truncate pr-2">{item.name}</h3>
              <span className="font-bold text-(--primary)">${parseFloat(item.price).toFixed(2)}</span>
            </div>
            
            <p className="text-sm text-(--text-secondary) line-clamp-2 mb-4 h-10 relative z-10">
              {item.description || 'A delicious choice recommended just for you.'}
            </p>
            
            <button
              onClick={() => onAddToCart && onAddToCart(item)}
              className="w-full py-2 bg-purple-50 text-purple-600 hover:bg-purple-100 font-bold rounded-xl transition-colors relative z-10 flex items-center justify-center gap-2"
            >
              <Sparkles className="w-4 h-4" /> Add to Order
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AiRecommendations;