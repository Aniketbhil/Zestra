import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Sparkles, TrendingUp, Clock, ChevronRight, UtensilsCrossed, CheckCircle2 } from 'lucide-react';
import useAuthStore from '../store/auth/useAuthStore';
import companyLogo from '../assets/ComponyLogo.png';

// Custom component for Scroll-Triggered Animations with a slight scale effect
const FadeInSection = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setVisible(true);
        });
      },
      { threshold: 0.1 }
    );
    
    if (domRef.current) observer.observe(domRef.current);
    return () => {
      if (domRef.current) observer.unobserve(domRef.current);
    };
  }, []);

  return (
    <div
      ref={domRef}
      className={`transition-all duration-1000 ease-out ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95'
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

const Home = () => {
  const { isAuthenticated } = useAuthStore();

  return (
    <div className="min-h-screen bg-(--background) flex flex-col font-sans selection:bg-(--primary) selection:text-white overflow-hidden relative">
      
      {/* Ambient Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none mix-blend-multiply"></div>
      <div className="absolute top-[20%] right-[-10%] w-[30%] h-[40%] bg-(--primary)/10 blur-[120px] rounded-full pointer-events-none mix-blend-multiply"></div>
      
      {/* Navigation Bar - Glassmorphism */}
      <nav className="w-full bg-(--background)/60 backdrop-blur-xl border-b border-(--border)/50 sticky top-0 z-50 transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          
          {/* Brand */}
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] border border-gray-100 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
              <img 
                src={companyLogo} 
                alt="Zestra Brand" 
                className="w-full h-full object-contain p-1"
              />
            </div>
            <span className="text-2xl font-black text-(--text) tracking-tighter">Zestra</span>
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-6">
            {isAuthenticated ? (
              <Link 
                to="/dashboard" 
                className="text-sm font-bold text-white bg-(--text) hover:bg-gray-800 px-6 py-2.5 rounded-full transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
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
                  className="text-sm font-bold text-white bg-(--text) hover:bg-gray-800 px-6 py-2.5 rounded-full transition-all duration-300 shadow-[0_8px_30px_rgb(0,0,0,0.12)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col relative z-10">
        
        {/* Hero Section */}
        <section className="pt-24 pb-32 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          <FadeInSection delay={100} className="lg:col-span-6 text-left flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-linear-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 text-sm font-bold text-purple-700 mb-8 shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]">
              <Sparkles className="w-4 h-4" />
              <span>Powered by Gemini 2.0 Flash</span>
            </div>
            
            <h1 className="text-6xl lg:text-[5rem] font-black text-(--text) tracking-tighter leading-[1.05] mb-6">
              The intelligent OS <br />
              for <span className="text-transparent bg-clip-text bg-linear-to-r from-(--primary) via-blue-500 to-purple-500 animate-gradient-x">restaurants.</span>
            </h1>
            
            <p className="text-xl font-medium text-(--text-secondary) max-w-lg mb-10 leading-relaxed">
              Ditch the physical menus. Zestra gives you digital QR ordering, real-time kitchen displays, inventory tracking, and AI-powered sales insights—all in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link 
                to="/register" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-(--primary) hover:bg-(--primary-hover) text-white text-lg font-bold px-8 py-4 rounded-full transition-all duration-300 hover:shadow-[0_0_40px_-10px_var(--primary)] hover:-translate-y-1"
              >
                Start for free <ChevronRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/login" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-transparent hover:bg-(--surface) border-2 border-(--border) text-(--text) text-lg font-bold px-8 py-4 rounded-full transition-all duration-300"
              >
                Sign in
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-8 text-sm font-bold text-(--text-muted)">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> No credit card required</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Setup in 2 minutes</span>
            </div>
          </FadeInSection>

          {/* Right Column: Visual Composition */}
          <FadeInSection delay={300} className="lg:col-span-6 relative w-full h-125 lg:h-150 hidden lg:block">
            {/* Main Image Container */}
            <div className="absolute top-4 right-0 w-[85%] h-[90%] rounded-4xl overflow-hidden shadow-[0_20px_50px_rgba(8,112,184,0.07)] border border-white/50 z-10 bg-(--surface-secondary) transform perspective-1000 rotate-y-[-5deg] rotate-x-[5deg]">
              <img 
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000" 
                alt="Restaurant interior" 
                className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity duration-700"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent"></div>
              <div className="absolute bottom-8 left-8 text-white">
                <p className="font-black text-3xl tracking-tight drop-shadow-md">Zestra Live</p>
                <p className="text-white/90 font-bold text-sm flex items-center gap-2 mt-2 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_#34d399]"></span> 
                  System Online
                </p>
              </div>
            </div>

            {/* Floating Card 1: AI Insight */}
            <div className="absolute top-16 -left-8 bg-white/90 backdrop-blur-xl p-5 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white w-72 z-20 hover:-translate-y-2 transition-transform duration-500">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-purple-100 to-purple-50 flex items-center justify-center text-purple-600 border border-purple-200/50 shadow-inner">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="font-black text-gray-900 text-sm tracking-tight">Gemini Insight</span>
              </div>
              <p className="text-sm font-medium text-gray-600 leading-relaxed">
                Garlic Bread sales peak around <span className="text-purple-600 font-bold">7 PM</span>. Consider running a combo special to maximize revenue.
              </p>
            </div>

            {/* Floating Card 2: Live Order */}
            <div className="absolute bottom-20 -left-4 bg-white/90 backdrop-blur-xl p-5 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] border border-white w-72 z-20 hover:-translate-y-2 transition-transform duration-500">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-black text-gray-400 tracking-wider">ORDER #1024</span>
                <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2.5 py-1 rounded-lg tracking-tight shadow-sm border border-amber-200/50">PREPARING</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-100 to-blue-50 flex items-center justify-center border border-blue-200/50 shadow-inner">
                  <UtensilsCrossed className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-base font-black text-gray-900 tracking-tight">Table 4</p>
                  <p className="text-sm font-bold text-gray-500 mt-0.5">3 items • <span className="text-gray-900">₹42.50</span></p>
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>

        {/* BENTO BOX Feature Section */}
        <section className="px-6 py-32 max-w-7xl mx-auto w-full relative z-10">
          
          <FadeInSection delay={100} className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black text-(--text) mb-6 tracking-tighter">
              Built for modern kitchens.
            </h2>
            <p className="text-(--text-secondary) font-medium text-xl max-w-2xl mx-auto leading-relaxed">
              Zestra brings enterprise-level tools to local restaurants in an incredibly simple, beautiful interface.
            </p>
          </FadeInSection>

          {/* Advanced Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:auto-rows-80">
            
            {/* Bento Box 1: Live Kitchen (Wide) */}
            <FadeInSection delay={200} className="md:col-span-2 bg-linear-to-br from-(--surface) to-(--surface-secondary) rounded-4xl p-10 border border-(--border)/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden group">
              <div className="relative z-10 w-full md:w-3/5">
                <div className="w-14 h-14 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-inner border border-blue-200/50">
                  <Clock className="w-7 h-7" />
                </div>
                <h3 className="text-3xl font-black text-(--text) mb-4 tracking-tighter">Real-time Kitchen Display</h3>
                <p className="text-(--text-secondary) font-medium text-lg leading-relaxed">
                  WebSockets stream orders instantly to a <br /> digital Kanban board. Drag and drop from <br /> 'Received' to 'Served' with zero lag.
                </p>
              </div>
              
              {/* Decorative Abstract Kanban */}
              <div className="absolute right-[-5%] bottom-[-15%] w-[55%] h-[110%] bg-white/40 backdrop-blur-md rounded-tl-[40px] border-l border-t border-white shadow-2xl p-8 flex flex-col gap-5 transform group-hover:-translate-x-4 group-hover:-translate-y-4 transition-transform duration-700 ease-out">
                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/50 opacity-90">
                   <div className="h-3 w-1/3 bg-gray-100 rounded-full mb-4"></div>
                   <div className="h-2 w-2/3 bg-gray-50 rounded-full"></div>
                 </div>
                 <div className="bg-white p-5 rounded-2xl shadow-md border border-gray-100 border-l-4 border-l-amber-400 scale-105 transform -translate-x-2">
                   <div className="h-3 w-2/3 bg-gray-200 rounded-full mb-4"></div>
                   <div className="h-2 w-1/4 bg-gray-100 rounded-full"></div>
                 </div>
                 <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100/50 opacity-60">
                   <div className="h-3 w-1/2 bg-gray-100 rounded-full mb-4"></div>
                   <div className="h-2 w-3/4 bg-gray-50 rounded-full"></div>
                 </div>
              </div>
            </FadeInSection>

            {/* Bento Box 2: AI Powered (Tall) */}
            <FadeInSection delay={300} className="md:col-span-1 md:row-span-2 bg-linear-to-b from-purple-50/50 to-(--surface) rounded-4xl p-10 border border-purple-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(168,85,247,0.1)] hover:-translate-y-1 transition-all duration-500 relative overflow-hidden flex flex-col group">
              <div className="relative z-10">
                <div className="w-14 h-14 bg-linear-to-br from-purple-500 to-purple-700 text-white rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-purple-500/30 group-hover:scale-110 group-hover:rotate-6 transition-transform duration-500">
                  <Sparkles className="w-7 h-7" />
                </div>
                <h3 className="text-3xl font-black text-(--text) mb-4 tracking-tight">Google Gemini Inside</h3>
                <p className="text-(--text-secondary) font-medium text-lg leading-relaxed">
                  Your very own digital operations manager. Zestra analyzes historical data to write daily summaries and curate personalized menu recommendations.
                </p>
              </div>

              {/* Decorative AI Chat bubble */}
              <div className="mt-auto pt-8 relative z-10">
                <div className="bg-white border border-purple-100/80 p-6 rounded-2xl rounded-tr-sm shadow-xl shadow-purple-900/5 group-hover:-translate-y-3 transition-transform duration-700 ease-out">
                  <div className="flex gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce"></div>
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                  <p className="text-sm font-bold text-gray-700 leading-relaxed">
                    "Based on yesterday's traffic, prepare extra tomatoes for the dinner rush."
                  </p>
                </div>
              </div>
              
              <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-purple-500/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-purple-500/20 transition-colors duration-700"></div>
            </FadeInSection>

            {/* Bento Box 3: QR Ordering (Square) */}
            <FadeInSection delay={400} className="md:col-span-1 bg-linear-to-tr from-(--surface) to-emerald-50/30 rounded-4xl p-10 border border-(--border)/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(16,185,129,0.08)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-center group relative overflow-hidden">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 relative z-10 border border-emerald-200/50">
                <QrCode className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-(--text) mb-3 tracking-tight relative z-10">Scan & Order</h3>
              <p className="text-(--text-secondary) text-base font-medium leading-relaxed relative z-10">
                Customers scan a QR code at their table and order directly from their phones.
              </p>
              <div className="absolute -right-6 -bottom-6 opacity-[0.03] text-emerald-900 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-700">
                <QrCode className="w-48 h-48" />
              </div>
            </FadeInSection>

            {/* Bento Box 4: Inventory (Square) */}
            <FadeInSection delay={500} className="md:col-span-1 bg-linear-to-tl from-(--surface) to-amber-50/30 rounded-4xl p-10 border border-(--border)/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_50px_rgba(245,158,11,0.08)] hover:-translate-y-1 transition-all duration-500 flex flex-col justify-center group relative overflow-hidden">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-6 border border-amber-200/50">
                <TrendingUp className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-black text-(--text) mb-3 tracking-tight">Smart Inventory</h3>
              <p className="text-(--text-secondary) text-base font-medium leading-relaxed">
                Track ingredients down to the gram. Get low-stock alerts before you run out.
              </p>
            </FadeInSection>

          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-(--border)/60 py-12 bg-(--background) relative z-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg border-2 border-(--text) bg-transparent flex items-center justify-center text-(--text) font-black text-sm">
              Z.
            </div>
            <span className="font-black text-(--text) text-lg tracking-tight">Zestra</span>
          </div>
          <p className="text-sm font-bold text-(--text-muted)">
            Zestra © 2026
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;