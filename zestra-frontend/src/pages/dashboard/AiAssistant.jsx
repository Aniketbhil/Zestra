import { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, Zap, Bot, Loader2, ArrowRight, AlertCircle } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AiAssistant = () => {
  const [insights, setInsights] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch the insights summary from the backend
  const fetchInsights = async (forceRefresh = false) => {
    if (forceRefresh) setIsRefreshing(true);
    else setIsLoading(true);

    try {
      // Use the refresh=true query parameter to bypass the Redis cache when requested
      const endpoint = forceRefresh ? '/ai/insights?refresh=true' : '/ai/insights';
      const response = await api.get(endpoint);
      setInsights(response.data.summary);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to load AI Insights");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, []);

  // --- Dynamic Formatting Engine ---
  // This takes the raw LLM text block and turns it into a beautiful, scannable dashboard list.
  const formatInsights = (text) => {
    if (!text) return [];

    // 1. Clean up Markdown and split into distinct sentences/points
    const rawItems = text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="text-(--text) font-black">$1</strong>') // Convert markdown bold
      .split(/(?:\n|\.\s+)/) // Split by newline or periods followed by a space
      .map(s => s.replace(/^\s*[-*]\s*/, '').trim()) // Remove markdown bullets
      .filter(s => s.length > 10); // Filter out empty strings or random artifacts

    // 2. Wrap important values and keywords in colorful HTML badges
    return rawItems.map(sentence => {
      let formatted = sentence
        // Highlight Revenue & Money (e.g., ₹434.05)
        .replace(/((?:₹|\$)\d+(?:,\d{3})*(?:\.\d{2})?)/g, '<span class="text-emerald-700 font-extrabold bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-sm">$1</span>')
        // Highlight Times & Peak Hours (e.g., 18:00, 7:00 PM)
        .replace(/\b((?:1[0-2]|0?[1-9])(?::[0-5][0-9])?\s*[AaPp][Mm]|(?:[01][0-9]|2[0-3]):[0-5][0-9])\b/g, '<span class="text-amber-700 font-extrabold bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 shadow-sm">$1</span>')
        // Keyword Accent: Sales & Revenue
        .replace(/\b(revenue|sales|profit|income)\b/gi, '<span class="text-emerald-600 font-black">$1</span>')
        // Keyword Accent: Items & Popularity
        .replace(/\b(top-selling|best-selling|popular|top items?)\b/gi, '<span class="text-purple-600 font-black">$1</span>')
        // Keyword Accent: Busy periods
        .replace(/\b(peak hour|busy|rush|traffic)\b/gi, '<span class="text-amber-600 font-black">$1</span>')
        // Keyword Accent: Actions & Suggestions
        .replace(/\b(recommendation|recommend|suggest|strategy|action)\b/gi, '<span class="text-blue-600 font-black">$1</span>');

      // Ensure the line ends with proper punctuation
      if (!formatted.endsWith('.') && !formatted.endsWith('!') && !formatted.endsWith('?') && !formatted.endsWith('>')) {
          formatted += '.';
      }

      return formatted;
    });
  };

  const formattedLines = formatInsights(insights);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 font-sans px-1">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black text-(--text) flex items-center gap-3 tracking-tight">
          <Bot className="w-8 h-8 text-purple-600" /> Executive AI Assistant
        </h1>
        <p className="text-(--text-secondary) font-medium text-sm mt-1.5">
          Powered by Gemini. Instantly analyze your restaurant's performance.
        </p>
      </div>

      {/* Main Insights Card */}
      <div className="bg-(--surface) rounded-4xl border border-(--border)/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-12 min-h-125 relative overflow-hidden flex flex-col">
        
        {/* Decorative Background Glows */}
        <div className="absolute top-0 right-0 w-125 h-125 bg-purple-500/10 blur-[100px] rounded-full pointer-events-none -mr-40 -mt-40"></div>
        <div className="absolute bottom-0 left-0 w-100 h-100 bg-indigo-500/5 blur-[80px] rounded-full pointer-events-none -ml-20 -mb-20"></div>

        {/* Card Header & Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10 relative z-10 border-b border-(--border)/60 pb-8">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-linear-to-br from-purple-100 to-indigo-50 text-purple-600 rounded-[20px] flex items-center justify-center shrink-0 shadow-sm border border-purple-200/50">
              <Sparkles className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-(--text) tracking-tight">Operational Insights</h2>
              <p className="text-(--text-muted) font-medium mt-1">Real-time analysis of today's menu and sales data</p>
            </div>
          </div>

          <button 
            onClick={() => fetchInsights(true)}
            disabled={isRefreshing || isLoading}
            className="w-full sm:w-auto px-6 py-3.5 bg-white border border-gray-200 hover:border-purple-300 text-gray-800 hover:text-purple-600 font-black rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 group shadow-sm hover:shadow-md active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-600' : 'group-hover:text-purple-600 transition-colors'}`} />
            {isRefreshing ? 'Analyzing Data...' : 'Refresh Analysis'}
          </button>
        </div>

        {/* Content Area */}
        <div className="relative z-10 flex-1 flex flex-col justify-center">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in zoom-in-95 duration-500">
              <div className="w-20 h-20 bg-linear-to-br from-purple-100 to-indigo-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-purple-200/50 relative">
                <div className="absolute inset-0 border-4 border-purple-500 border-t-transparent rounded-3xl animate-spin"></div>
                <Bot className="w-10 h-10 text-purple-600 animate-pulse" />
              </div>
              <h3 className="text-2xl font-black text-(--text) mb-2 tracking-tight">Gemini is thinking...</h3>
              <p className="text-(--text-secondary) font-medium">Crunching your numbers to find actionable insights.</p>
            </div>
          ) : formattedLines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
              <div className="w-20 h-20 bg-(--surface-secondary) rounded-3xl flex items-center justify-center mb-5 border border-(--border)/60">
                <AlertCircle className="w-10 h-10 text-(--text-muted)" />
              </div>
              <h3 className="text-2xl font-black text-(--text) mb-2 tracking-tight">Not enough data</h3>
              <p className="text-(--text-secondary) font-medium">We need a few more orders to generate meaningful insights today.</p>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-8 fade-in duration-700 max-w-4xl mx-auto w-full">
              {formattedLines.map((line, index) => (
                <div key={index} className="flex gap-4 sm:gap-6 items-start group bg-(--background)/60 border border-(--border)/50 p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:border-purple-500/20 transition-all duration-300">
                  <div className="mt-1 shrink-0">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-100 to-indigo-100 text-purple-600 flex items-center justify-center border border-purple-200 shadow-sm group-hover:scale-110 group-hover:bg-linear-to-br group-hover:from-purple-600 group-hover:to-indigo-600 group-hover:text-white group-hover:border-transparent transition-all duration-500 ease-out">
                      <Zap className="w-5 h-5" />
                    </div>
                  </div>
                  {/* Using dangerouslySetInnerHTML because we strictly control the formatting engine above */}
                  <p 
                    className="text-[1.1rem] sm:text-[1.15rem] leading-relaxed text-(--text-secondary) font-medium pt-1.5"
                    dangerouslySetInnerHTML={{ __html: line }}
                  ></p>
                </div>
              ))}
              
              {/* Closing actionable statement */}
              <div className="mt-12 pt-8 border-t border-(--border)/60 flex items-center justify-center sm:justify-start gap-3 text-purple-600 font-black text-lg">
                <ArrowRight className="w-6 h-6" /> Ready to optimize your kitchen?
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default AiAssistant;