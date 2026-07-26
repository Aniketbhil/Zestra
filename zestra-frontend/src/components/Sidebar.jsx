import { NavLink } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { 
  LayoutDashboard, 
  MenuSquare, 
  QrCode, 
  ShoppingBag, 
  Settings,
  Sparkles,
  BarChart3,
  Package
} from 'lucide-react';

const Sidebar = () => {
  const { user } = useAuthStore();

  const restaurantLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Menu', path: '/dashboard/menu', icon: MenuSquare },
    { name: 'Orders', path: '/dashboard/orders', icon: ShoppingBag },
    { name: 'QR Code', path: '/dashboard/qr', icon: QrCode },
    { name: 'Inventory', path: '/dashboard/inventory', icon: Package },
    { name: 'Analytics', path: '/dashboard/analytics', icon: BarChart3 },
    { name: 'AI Assistant', path: '/dashboard/ai', icon: Sparkles },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const customerLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'My Orders', path: '/dashboard/orders', icon: ShoppingBag },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  const links = user?.role === 'restaurant' ? restaurantLinks : customerLinks;

  return (
    <aside className="w-64 bg-(--surface) border-r border-(--border) h-screen hidden md:flex flex-col sticky top-0">
      
      {/* Logo Area */}
      <div className="h-16 flex items-center px-6 border-b border-(--border)">
        <span className="text-2xl font-bold text-(--primary) tracking-tight">Zestra.</span>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.name}
              to={link.path}
              end={link.path === '/dashboard'}
              className={({ isActive }) => 
                `flex items-center gap-3 px-4 py-3 rounded-[14px] transition-all font-medium text-sm ${
                  isActive 
                    ? 'bg-(--primary)/10 text-(--primary) font-semibold' 
                    : 'text-(--text-secondary) hover:bg-(--surface-secondary) hover:text-(--text)'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {link.name}
            </NavLink>
          );
        })}
      </div>
    </aside>
  );
};

export default Sidebar;