import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import useAuthStore from './store/useAuthStore';
import Login from './pages/Login';
import Register from './pages/Register';

// A temporary placeholder for the dashboard until we build it
const DashboardPlaceholder = () => {
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard Area</h1>
      <p className="mb-4">Role: {user?.role}</p>
      <button onClick={logout} className="px-4 py-2 bg-(--error) text-white rounded-lg">Sign Out</button>
    </div>
  );
};

function App() {
  const { fetchUser, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (localStorage.getItem('access_token')) {
      fetchUser();
    }
  }, [fetchUser]);

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <>
      <Toaster position="top-right" />
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