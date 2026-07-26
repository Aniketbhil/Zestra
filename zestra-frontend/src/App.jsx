import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';

// Pages & Components
import Login from './pages/Login';
import Register from './pages/Register';
import SkeletonLoader from './components/SkeletonLoader';
import DashboardLayout from './layouts/DashboardLayout';
import RestaurantOnboarding from './pages/RestaurantOnboarding';
import Menu from './pages/Menu';
import QrCode from './pages/QrCode';
import PublicMenu from './pages/PublicMenu';
import OAuthCallback from './pages/OAuthCallback';

// Temporary page components for the nested routes
const DashboardHome = () => <div className="p-6 bg-(--surface) rounded-[20px] shadow-sm border border-(--border)"><h1 className="text-xl font-bold text-(--text)">Welcome to Zestra!</h1><p className="text-(--text-secondary) mt-2">Select an option from the sidebar to begin.</p></div>;
const OrdersPage = () => <div className="p-6 bg-(--surface) rounded-[20px] border border-(--border)">Orders Tracking (Coming Soon)</div>;

function App() {
  const { fetchUser, isAuthenticated } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (localStorage.getItem('access_token')) {
        await fetchUser();
      }
      setIsInitializing(false);
    };

    initializeAuth();
  }, [fetchUser]);

  if (isInitializing) {
    return <SkeletonLoader />;
  }

  return (
    <>
      <Toaster 
        position="top-right" 
        toastOptions={{
          style: {
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} />
        <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} />
        
        {/* Public Menu Route (No Auth Required) */}
        <Route path="/menu/:slug" element={<PublicMenu />} />

        {/* Google OAuth Callback Catcher */}
        <Route path="/oauth-callback" element={<OAuthCallback />} />
        
        {/* Protected Dashboard Routes */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}
        >
          {/* These render inside the <Outlet /> of DashboardLayout */}
          <Route index element={<DashboardHome />} />
          <Route path="onboard" element={<RestaurantOnboarding />} />
          <Route path="menu" element={<Menu />} />
          <Route path="qr" element={<QrCode />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="*" element={<DashboardHome />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;