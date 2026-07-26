import { LogOut, User as UserIcon } from 'lucide-react';
import useAuthStore from '../store/auth/useAuthStore';
import { useNavigate } from 'react-router-dom';

const Navbar = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="h-16 bg-(--surface)/80 backdrop-blur-xl border-b border-(--border) flex items-center justify-between px-6 sticky top-0 z-10">
      
      {/* Left side: Dashboard Title */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-bold text-(--text)">
          {user?.role === 'restaurant' ? 'Restaurant Dashboard' : 'Customer Dashboard'}
        </h2>
      </div>

      {/* Right side: Role & Sign Out */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-(--surface-secondary) rounded-full border border-(--border)">
          <UserIcon className="w-4 h-4 text-(--primary)" />
          <span className="text-sm font-semibold text-(--text) capitalize">
            {user?.role || 'Guest'}
          </span>
        </div>

        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-(--surface) border border-(--border) hover:bg-[#FEE2E2] hover:text-[#EF4444] hover:border-[#EF4444] text-(--text-secondary) rounded-[14px] transition-colors text-sm font-semibold shadow-sm"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </nav>
  );
};

export default Navbar;