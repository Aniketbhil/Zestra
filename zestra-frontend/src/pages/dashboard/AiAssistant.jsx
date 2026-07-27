import { useEffect } from 'react';
import { Sparkles, RefreshCw, Bot } from 'lucide-react';
import useAiStore from '../../store/dashboard/useAiStore';

const AiAssistant = () => {
  const { insights, isLoading, fetchInsights } = useAiStore();

  useEffect(() => {
    // Only fetch if we don't already have insights loaded in memory
    if (!insights) {
      fetchInsights();
    }
  }, [insights, fetchInsights]);

  const handleRefresh = () => {
    fetchInsights(true); // Forces backend to bypass Redis cache
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text) flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-(--primary)" />
            AI Operations Assistant
          </h1>
          <p className="text-(--text-secondary) text-sm mt-1">
            Powered by Gemini to analyze your restaurant's performance.
          </p>
        </div>
        
        <button 
          onClick={handleRefresh}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-(--surface) border border-(--border) hover:bg-(--surface-secondary) text-(--text) rounded-[14px] font-semibold text-sm transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 
          {isLoading ? 'Analyzing...' : 'Generate Fresh Insights'}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="bg-(--surface) rounded-3xl border border-(--border) shadow-sm overflow-hidden relative">
        
        {/* Top Accent Bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-(--primary) to-blue-500"></div>

        <div className="p-8">
          {isLoading && !insights ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="relative mb-6">
                <div className="w-16 h-16 bg-(--primary)/10 rounded-full animate-ping absolute inset-0"></div>
                <div className="w-16 h-16 bg-(--surface) border-2 border-(--primary) rounded-full flex items-center justify-center relative z-10">
                  <Bot className="w-8 h-8 text-(--primary) animate-pulse" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-(--text)">Analyzing your data...</h3>
              <p className="text-(--text-muted) text-sm mt-2 max-w-sm">
                Gemini is looking at your sales, top items, and hourly traffic to generate actionable advice.
              </p>
            </div>
          ) : !insights ? (
            <div className="text-center py-12 text-(--text-muted)">
              No insights available. Try refreshing.
            </div>
          ) : (
            <div className="flex gap-6">
              <div className="hidden sm:flex shrink-0 w-12 h-12 bg-(--primary)/10 rounded-full items-center justify-center border border-(--primary)/20">
                <Bot className="w-6 h-6 text-(--primary)" />
              </div>
              
              <div className="flex-1 space-y-4">
                {/* Parse the string and render paragraphs to handle AI formatting */}
                {insights.split('\n').map((paragraph, index) => {
                  if (!paragraph.trim()) return null; // Skip empty lines
                  
                  // Handle bold markdown text (**text**)
                  const formattedText = paragraph.split(/(\*\*.*?\*\*)/g).map((part, i) => {
                    if (part.startsWith('**') && part.endsWith('**')) {
                      return <strong key={i} className="font-bold text-(--text)">{part.slice(2, -2)}</strong>;
                    }
                    return part;
                  });

                  return (
                    <p key={index} className="text-(--text-secondary) leading-relaxed">
                      {formattedText}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

export default AiAssistant;