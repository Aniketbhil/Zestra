import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import useAuthStore from "./store/auth/useAuthStore";

// Pages & Components
import Login from "./pages/auth/Login";
import Register from "./pages/auth/Register";
import OAuthCallback from "./pages/auth/OAuthCallback";
import SkeletonLoader from "./components/SkeletonLoader";
import DashboardLayout from "./layouts/DashboardLayout";

import RestaurantOnboarding from "./pages/dashboard/RestaurantOnboarding";
import Menu from "./pages/dashboard/Menu";
import QrCode from "./pages/dashboard/QrCode";
import Orders from "./pages/dashboard/Orders";
import Inventory from './pages/dashboard/Inventory';

import PublicMenu from "./pages/public/PublicMenu";
import Checkout from "./pages/public/Checkout";
import OrderTracking from "./pages/public/OrderTracking";

// Temporary page components for the nested routes
const DashboardHome = () => (
  <div className="p-6 bg-(--surface) rounded-[20px] shadow-sm border border-(--border)">
    <h1 className="text-xl font-bold text-(--text)">Welcome to Zestra!</h1>
    <p className="text-(--text-secondary) mt-2">
      Select an option from the sidebar to begin.
    </p>
  </div>
);
const OrdersPage = () => (
  <div className="p-6 bg-(--surface) rounded-[20px] border border-(--border)">
    Orders Tracking (Coming Soon)
  </div>
);

function App() {
  const { fetchUser, isAuthenticated } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (localStorage.getItem("access_token")) {
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
            background: "var(--surface)",
            color: "var(--text)",
            border: "1px solid var(--border)",
          },
        }}
      />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route
          path="/login"
          element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/register"
          element={
            !isAuthenticated ? <Register /> : <Navigate to="/dashboard" />
          }
        />

        {/* Public Menu Route (No Auth Required) */}
        <Route path="/menu/:slug" element={<PublicMenu />} />
        <Route path="/checkout/:slug" element={<Checkout />} />
        <Route path="/tracking/:slug/:orderId" element={<OrderTracking />} />

        {/* Google OAuth Callback Catcher - FIX: Changed dash to slash */}
        <Route path="/oauth/callback" element={<OAuthCallback />} />

        {/* Protected Dashboard Routes */}
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <DashboardLayout /> : <Navigate to="/login" />}
        >
          <Route index element={<DashboardHome />} />
          <Route path="onboard" element={<RestaurantOnboarding />} />
          <Route path="menu" element={<Menu />} />
          <Route path="qr" element={<QrCode />} />
          <Route path="orders" element={<Orders />} />
          <Route path="inventory" element={<Inventory />} />
          <Route path="*" element={<DashboardHome />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
