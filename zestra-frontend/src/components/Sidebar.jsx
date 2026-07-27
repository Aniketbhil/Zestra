import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Menu as MenuIcon, QrCode, ShoppingBag, 
  TrendingUp, Sparkles, Settings, BarChart3, Sun, Moon 
} from 'lucide-react';
import useAuthStore from '../store/auth/useAuthStore';
import useThemeStore from '../store/theme/useThemeStore';
import companyLogo from '../assets/ComponyLogo.png';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();

  const restaurantLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Menu', path: '/dashboard/menu', icon: MenuIcon },
    { name: 'Orders', path: '/dashboard/orders', icon: ShoppingBag },
    { name: 'QR Code', path: '/dashboard/qr', icon: QrCode },
    { name: 'Inventory', path: '/dashboard/inventory', icon: TrendingUp },
    { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    { name: 'AI Assistant', path: '/dashboard/ai', icon: Sparkles },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const customerLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const links = user?.role === 'restaurant' ? restaurantLinks : customerLinks;

  return (
    // FIX: Changed h-[calc(100vh-4rem)] to h-screen and top-16 to top-0
    <aside className="w-64 bg-(--surface) border-r border-(--border) h-screen sticky top-0 hidden md:flex flex-col z-40 shadow-sm">
      
      {/* Brand Header - Now perfectly at the top left corner */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-(--border) shrink-0">
        <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-sm border border-(--border) bg-white flex items-center justify-center">
          <img 
            src={companyLogo} 
            alt="Zestra Brand" 
            className="w-full h-full object-contain"
          />
        </div>
        <span className="text-2xl font-extrabold text-(--text) tracking-tight">Zestra</span>
      </div>

      {/* Navigation Links */}
      <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto scrollbar-thin">
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          const Icon = link.icon;
          
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-[14px] font-medium transition-all duration-200 ${
                isActive 
                  ? 'bg-(--primary)/10 text-(--primary)' 
                  : 'text-(--text-secondary) hover:bg-(--surface-secondary) hover:text-(--text)'
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'text-(--primary)' : 'text-(--text-muted)'}`} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Controls (Theme Toggle) */}
      <div className="p-4 border-t border-(--border) shrink-0 bg-(--surface)">
        <button 
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-4 py-3 rounded-[14px] bg-(--background) border border-(--border) hover:bg-(--surface-secondary) transition-colors text-(--text-secondary) hover:text-(--text)"
        >
          <span className="font-medium text-sm">
            {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          </span>
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;