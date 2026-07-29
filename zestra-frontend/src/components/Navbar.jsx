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
    <header className="h-16 bg-(--surface)/80 backdrop-blur-xl border-b border-(--border) sticky top-0 z-30 px-4 flex items-center justify-between shadow-sm transition-all">
      <div className="flex items-center gap-4">
        {/* Mobile menu button (hidden on desktop) */}
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 text-(--text-secondary) hover:bg-(--border) active:scale-95 rounded-xl transition-all"
        >
          <MenuIcon className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-(--background) border border-(--border) shadow-inner">
          <div className="w-6 h-6 rounded-full bg-linear-to-br from-(--primary)/30 to-(--primary)/10 flex items-center justify-center border border-(--primary)/20">
            <User className="w-3.5 h-3.5 text-(--primary)" />
          </div>
          <span className="text-sm font-bold text-(--text) capitalize hidden sm:block pr-1">
            {user?.role || 'Guest'}
          </span>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-(--text-secondary) hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-full transition-colors border border-(--border) active:scale-95 shadow-sm"
        >
          <span className="hidden sm:inline">Sign Out</span>
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};

export default Navbar;