import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';
import Login from './pages/Login';
import Register from './pages/Register';
import SkeletonLoader from './components/SkeletonLoader';

const DashboardPlaceholder = () => {
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-(--background) text-(--text)">
      <div className="bg-(--surface) p-8 rounded-[20px] shadow-lg border border-(--border) text-center">
        <h1 className="text-2xl font-bold mb-4">Dashboard Area</h1>
        <p className="mb-4 text-(--text-secondary)">Role: <span className="text-(--primary) font-semibold">{user?.role}</span></p>
        <button 
          onClick={logout} 
          className="px-6 py-2 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-[14px] transition-colors font-semibold"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

function App() {
  const { fetchUser, isAuthenticated } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (localStorage.getItem('access_token')) {
        await fetchUser();
      }
      // Wait for auth check to finish before removing the skeleton
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
        <Route path="/" element={<Navigate to="/login" />} />
        
        <Route 
          path="/login" 
          element={!isAuthenticated ? <Login /> : <Navigate to="/dashboard" />} 
        />
        
        <Route 
          path="/register" 
          element={!isAuthenticated ? <Register /> : <Navigate to="/dashboard" />} 
        />
        
        <Route 
          path="/dashboard" 
          element={isAuthenticated ? <DashboardPlaceholder /> : <Navigate to="/login" />} 
        />
      </Routes>
    </>
  );
}

export default App;