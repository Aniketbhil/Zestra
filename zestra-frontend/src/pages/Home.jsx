import { Link } from 'react-router-dom';
import { QrCode, Sparkles, TrendingUp, Clock, ChevronRight, UtensilsCrossed } from 'lucide-react';
import useAuthStore from '../store/auth/useAuthStore';

const Home = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-(--background) flex flex-col font-sans selection:bg-(--primary) selection:text-white">
      
      {/* Navigation Bar */}
      <nav className="w-full bg-(--surface)/80 backdrop-blur-md border-b border-(--border) sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-(--primary) flex items-center justify-center text-white font-bold shadow-sm shadow-(--primary)/20">
              Z.
            </div>
            <span className="text-xl font-bold text-(--text) tracking-tight">Zestra</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link 
                to="/dashboard" 
                className="text-sm font-bold text-white bg-(--primary) hover:bg-(--primary-hover) px-5 py-2 rounded-full transition-all shadow-sm shadow-(--primary)/20"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="text-sm font-semibold text-(--text-secondary) hover:text-(--text) transition-colors hidden sm:block">
                  Sign In
                </Link>
                <Link 
                  to="/register" 
                  className="text-sm font-bold text-white bg-(--primary) hover:bg-(--primary-hover) px-5 py-2 rounded-full transition-all shadow-sm shadow-(--primary)/20"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col">
        <section className="pt-24 pb-16 px-6 max-w-5xl mx-auto text-center flex-1 flex flex-col justify-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--surface) border border-(--border) text-sm font-medium text-(--text-secondary) mb-8 mx-auto shadow-sm">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <span>Now with Gemini AI Insights</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold text-(--text) tracking-tight leading-[1.1] mb-6">
            The intelligent operating <br className="hidden md:block" />
            system for <span className="text-transparent bg-clip-text bg-linear-to-r from-(--primary) to-teal-400">restaurants.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-(--text-secondary) max-w-2xl mx-auto mb-10 leading-relaxed">
            Ditch the physical menus. Zestra gives you digital QR ordering, real-time kitchen displays, inventory tracking, and AI-powered sales insights—all in one place.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link 
              to="/register" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-(--primary) hover:bg-(--primary-hover) text-white text-lg font-bold px-8 py-4 rounded-full transition-all shadow-lg shadow-(--primary)/25"
            >
              Start for free <ChevronRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/login" 
              className="w-full sm:w-auto flex items-center justify-center bg-(--surface) hover:bg-(--surface-secondary) border border-(--border) text-(--text) text-lg font-bold px-8 py-4 rounded-full transition-colors shadow-sm"
            >
              Sign In
            </Link>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="px-6 pb-24 max-w-7xl mx-auto w-full">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-(--surface) p-8 rounded-3xl border border-(--border) shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--text) mb-3">Scan & Order</h3>
              <p className="text-(--text-secondary) leading-relaxed text-sm">
                Instant digital menus. Customers scan a QR code at their table and order directly from their phones.
              </p>
            </div>

            <div className="bg-(--surface) p-8 rounded-3xl border border-(--border) shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--text) mb-3">Live Kitchen</h3>
              <p className="text-(--text-secondary) leading-relaxed text-sm">
                Real-time WebSocket Kanban board. See orders pop up instantly and drag them through preparation stages.
              </p>
            </div>

            <div className="bg-(--surface) p-8 rounded-3xl border border-(--border) shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--text) mb-3">AI Powered</h3>
              <p className="text-(--text-secondary) leading-relaxed text-sm">
                Google Gemini analyzes your sales to provide actionable insights, and personalizes menus for your customers.
              </p>
            </div>

            <div className="bg-(--surface) p-8 rounded-3xl border border-(--border) shadow-sm hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--text) mb-3">Inventory</h3>
              <p className="text-(--text-secondary) leading-relaxed text-sm">
                Track ingredient stock levels and get automated alerts when items are running low before the dinner rush.
              </p>
            </div>

          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-(--border) py-8 text-center bg-(--surface)">
        <p className="text-sm font-medium text-(--text-muted)">
          Built for the Hackathon © 2026 Zestra
        </p>
      </footer>
    </div>
  );
};

export default Home;