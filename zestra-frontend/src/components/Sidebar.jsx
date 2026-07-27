import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Menu as MenuIcon, 
  QrCode, 
  ShoppingBag, 
  TrendingUp, 
  Sparkles, 
  Settings,
  BarChart3
} from 'lucide-react';
import useAuthStore from '../store/auth/useAuthStore';

const Sidebar = () => {
  const location = useLocation();
  const { user } = useAuthStore();

  // 1. Define links strictly for Restaurant Owners
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

  // 2. Define minimal links for Customers
  const customerLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  // 3. Choose the right array based on the user's role
  const links = user?.role === 'restaurant' ? restaurantLinks : customerLinks;

  return (
    <aside className="w-64 bg-(--surface) border-r border-(--border) h-[calc(100vh-4rem)] sticky top-16 overflow-y-auto hidden md:block">
      <nav className="p-4 space-y-1.5">
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
    </aside>
  );
};

export default Sidebar;