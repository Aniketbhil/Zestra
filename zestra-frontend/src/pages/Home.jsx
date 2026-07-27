import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { QrCode, Sparkles, TrendingUp, Clock, ChevronRight, UtensilsCrossed, CheckCircle2, ArrowRight } from 'lucide-react';
import useAuthStore from '../store/auth/useAuthStore';
import companyLogo from '../assets/ComponyLogo.png';

// Custom component for Scroll-Triggered Animations (No external libraries needed!)
const FadeInSection = ({ children, delay = 0, className = "" }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Trigger animation when 10% of the element is visible
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
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
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
    <div className="min-h-screen bg-(--background) flex flex-col font-sans selection:bg-(--primary) selection:text-white overflow-hidden">
      
      {/* Navigation Bar */}
      <nav className="w-full bg-(--surface)/80 backdrop-blur-md border-b border-(--border) sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* UPDATED: Brand Image & Text */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-white shadow-sm border border-(--border) flex items-center justify-center">
              <img 
                src={companyLogo} 
                alt="Zestra Brand" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="text-xl font-extrabold text-(--text) tracking-tight pt-0.5">Zestra</span>
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

      <main className="flex-1 flex flex-col relative">
        {/* Background Ambient Glow */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-200 h-100 bg-(--primary)/10 blur-[120px] rounded-full pointer-events-none"></div>

        {/* Hero Section */}
        <section className="pt-20 pb-20 px-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
          
          <FadeInSection delay={100} className="text-left flex flex-col items-start">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--surface) border border-(--border) text-sm font-medium text-(--text-secondary) mb-8 shadow-sm hover:border-(--primary)/30 transition-colors cursor-default">
              <Sparkles className="w-4 h-4 text-purple-500" />
              <span>Now with Gemini AI Insights</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-extrabold text-(--text) tracking-tight leading-[1.1] mb-6">
              The intelligent OS <br />
              for <span className="text-transparent bg-clip-text bg-linear-to-r from-(--primary) to-teal-400">restaurants.</span>
            </h1>
            
            <p className="text-lg md:text-xl text-(--text-secondary) max-w-lg mb-10 leading-relaxed">
              Ditch the physical menus. Zestra gives you digital QR ordering, real-time kitchen displays, inventory tracking, and AI-powered sales insights—all in one place.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
              <Link 
                to="/register" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-(--primary) hover:bg-(--primary-hover) text-white text-lg font-bold px-8 py-4 rounded-full transition-all hover:scale-105 active:scale-95 shadow-lg shadow-(--primary)/25"
              >
                Start for free <ChevronRight className="w-5 h-5" />
              </Link>
              <Link 
                to="/login" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-(--surface) hover:bg-(--surface-secondary) border border-(--border) text-(--text) text-lg font-bold px-8 py-4 rounded-full transition-colors shadow-sm"
              >
                Sign In
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm font-medium text-(--text-muted)">
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-(--primary)" /> No credit card required</span>
              <span className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-(--primary)" /> Setup in 2 minutes</span>
            </div>
          </FadeInSection>

          {/* Right Column: Visual Composition */}
          <FadeInSection delay={300} className="relative w-full h-112.5 lg:h-137.5 hidden lg:block">
            {/* Main Image */}
            <div className="absolute top-0 right-0 w-[85%] h-[85%] rounded-4xl overflow-hidden shadow-2xl border-4 border-(--surface) hover:-translate-y-2 transition-transform duration-700 z-10">
              <img 
                src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=1000" 
                alt="Restaurant interior" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"></div>
              <div className="absolute bottom-6 left-6 text-white">
                <p className="font-bold text-xl">S. G. Dhaba</p>
                <p className="text-white/80 text-sm flex items-center gap-1.5 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span> 
                  System Online
                </p>
              </div>
            </div>

            {/* Floating Card 1: AI Insight */}
            <div className="absolute top-12 -left-4 bg-(--surface) p-4 rounded-[20px] shadow-2xl border border-(--border) w-64 z-20 hover:scale-105 transition-transform duration-300">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="font-bold text-(--text) text-sm">Gemini Insight</span>
              </div>
              <p className="text-xs text-(--text-secondary) leading-relaxed">
                Garlic Bread sales peak around 7 PM. Consider running a combo special to maximize revenue.
              </p>
            </div>

            {/* Floating Card 2: Live Order */}
            <div className="absolute bottom-12 left-4 bg-(--surface) p-4 rounded-[20px] shadow-2xl border border-(--border) w-60 z-20 hover:scale-105 transition-transform duration-300">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-(--text-muted)">ORDER #1024</span>
                <span className="text-[10px] font-bold bg-[#FEF3C7] text-[#F59E0B] px-2 py-0.5 rounded-full">PREPARING</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#DBEAFE] flex items-center justify-center border border-blue-100">
                  <UtensilsCrossed className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-bold text-(--text)">Table 4</p>
                  <p className="text-xs text-(--text-secondary)">3 items • $42.50</p>
                </div>
              </div>
            </div>
          </FadeInSection>
        </section>

        {/* BENTO BOX Feature Section */}
        <section className="px-6 py-24 max-w-7xl mx-auto w-full relative z-10">
          
          <FadeInSection delay={100} className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold text-(--text) mb-6 tracking-tight">
              Built for modern kitchens.
            </h2>
            <p className="text-(--text-secondary) text-lg max-w-2xl mx-auto">
              Zestra brings enterprise-level tools to local restaurants in an incredibly simple, beautiful interface.
            </p>
          </FadeInSection>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:auto-rows-75">
            
            {/* Bento Box 1: Live Kitchen (Wide) */}
            <FadeInSection delay={200} className="md:col-span-2 bg-(--surface) rounded-4xl p-8 border border-(--border) shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden group">
              <div className="relative z-10 w-2/3">
                <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6">
                  <Clock className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-(--text) mb-3">Real-time Kitchen Display</h3>
                <p className="text-(--text-secondary) leading-relaxed">
                  WebSockets stream orders instantly to a digital Kanban board. Drag and drop from 'Received' to 'Served' with zero lag.
                </p>
              </div>
              
              {/* Decorative Background Element */}
              <div className="absolute right-[-10%] bottom-[-20%] w-[60%] h-[120%] bg-blue-50/50 rounded-l-3xl border-l border-t border-blue-100 shadow-inner group-hover:-translate-x-4 transition-transform duration-700 p-6 flex flex-col gap-4">
                 <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 opacity-80">
                   <div className="h-2 w-1/3 bg-gray-200 rounded-full mb-2"></div>
                   <div className="h-2 w-1/2 bg-gray-100 rounded-full"></div>
                 </div>
                 <div className="bg-white p-3 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-[#F59E0B] opacity-100">
                   <div className="h-2 w-2/3 bg-gray-200 rounded-full mb-2"></div>
                   <div className="h-2 w-1/4 bg-gray-100 rounded-full"></div>
                 </div>
              </div>
            </FadeInSection>

            {/* Bento Box 2: AI Powered (Tall) */}
            <FadeInSection delay={300} className="md:col-span-1 md:row-span-2 bg-(--surface) rounded-4xl p-8 border border-(--border) shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden flex flex-col justify-between group">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-500">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-2xl font-bold text-(--text) mb-3">Google Gemini Inside</h3>
                <p className="text-(--text-secondary) leading-relaxed">
                  Your very own digital operations manager. 
                  Zestra analyzes your historical data to write daily performance summaries and curates personalized menu recommendations for your logged-in guests.
                </p>
              </div>

              {/* Decorative AI Chat bubble */}
              <div className="mt-8 bg-purple-50 border border-purple-100 p-4 rounded-2xl rounded-tr-sm relative z-10 group-hover:-translate-y-2 transition-transform duration-500">
                <p className="text-sm font-medium text-purple-900 leading-snug">
                  "Based on yesterday's traffic, you should prepare extra tomatoes for the dinner rush."
                </p>
              </div>
              
              <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-purple-400/10 blur-3xl rounded-full"></div>
            </FadeInSection>

            {/* Bento Box 3: QR Ordering (Square) */}
            <FadeInSection delay={400} className="md:col-span-1 bg-(--surface) rounded-4xl p-8 border border-(--border) shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-center group relative overflow-hidden">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-4">
                <QrCode className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--text) mb-2">Scan & Order</h3>
              <p className="text-(--text-secondary) text-sm leading-relaxed">
                Customers scan a QR code at their table and order directly from their phones.
              </p>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:scale-110 transition-transform duration-700">
                <QrCode className="w-32 h-32" />
              </div>
            </FadeInSection>

            {/* Bento Box 4: Inventory (Square) */}
            <FadeInSection delay={500} className="md:col-span-1 bg-(--surface) rounded-4xl p-8 border border-(--border) shadow-sm hover:shadow-xl transition-shadow flex flex-col justify-center group relative overflow-hidden">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-(--text) mb-2">Smart Inventory</h3>
              <p className="text-(--text-secondary) text-sm leading-relaxed">
                Track ingredients down to the gram. Get low-stock alerts before you run out.
              </p>
            </FadeInSection>

          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-(--border) py-10 bg-(--background) relative z-10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-(--primary) flex items-center justify-center text-white font-bold text-xs">
              Z.
            </div>
            <span className="font-bold text-(--text)">Zestra</span>
          </div>
          <p className="text-sm font-medium text-(--text-muted)">
            Built for the Hackathon © 2026
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Home;