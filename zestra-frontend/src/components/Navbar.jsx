import { LogOut, User, Menu as MenuIcon } from 'lucide-react';
import useAuthStore from '../store/auth/useAuthStore';
import { useNavigate } from 'react-router-dom';

const Navbar = ({ onMenuClick }) => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-16 bg-(--surface) border-b border-(--border) sticky top-0 z-50 px-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-4">
        {/* Mobile menu button (hidden on desktop) */}
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-(--text-secondary) hover:bg-(--surface-secondary) rounded-lg"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
        {/* If you want the logo visible on mobile top-bar, it would go here */}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--background) border border-(--border)">
          <div className="w-6 h-6 rounded-full bg-(--primary)/20 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-(--primary)" />
          </div>
          <span className="text-sm font-semibold text-(--text) capitalize hidden sm:block">
            {user?.role || 'Guest'}
          </span>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-(--text-secondary) hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors border border-(--border)"
        >
          <span className="hidden sm:inline">Sign Out</span>
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;