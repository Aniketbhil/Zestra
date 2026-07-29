import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Menu as MenuIcon, QrCode, ShoppingBag, 
  TrendingUp, Sparkles, Settings, BarChart3, Sun, Moon, X
} from 'lucide-react';
import useAuthStore from '../store/auth/useAuthStore';
import useThemeStore from '../store/theme/useThemeStore';
import companyLogo from '../assets/ComponyLogo.png';

// Accept the new props from DashboardLayout
const Sidebar = ({ isOpen, onClose }) => {
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
    <aside 
      className={`fixed md:relative inset-y-0 left-0 w-64 bg-(--surface) border-r border-(--border) h-screen flex flex-col z-50 shadow-2xl md:shadow-sm transform transition-transform duration-300 ease-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } md:translate-x-0`}
    >
      
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center justify-between border-b border-(--border) shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl overflow-hidden shrink-0 shadow-sm border border-(--border) bg-white flex items-center justify-center">
            <img 
              src={companyLogo} 
              alt="Zestra Brand" 
              className="w-full h-full object-contain"
            />
          </div>
          <span className="text-2xl font-extrabold text-(--text) tracking-tight">Zestra</span>
        </div>
        
        {/* Mobile Close Button */}
        <button 
          onClick={onClose}
          className="md:hidden p-2 text-(--text-muted) hover:text-(--text) hover:bg-(--surface-secondary) rounded-lg transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
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
              onClick={onClose} // Auto-close sidebar on mobile when a link is clicked
              className={`flex items-center gap-3 px-4 py-3 rounded-[14px] font-medium transition-all duration-200 active:scale-95 ${
                isActive 
                  ? 'bg-(--primary)/10 text-(--primary) shadow-sm' 
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
          className="w-full flex items-center justify-between px-4 py-3 rounded-[14px] bg-(--background) border border-(--border) hover:bg-(--surface-secondary) transition-colors text-(--text-secondary) hover:text-(--text) active:scale-95"
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