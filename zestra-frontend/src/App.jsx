import { useEffect } from 'react';
import useAuthStore from './store/useAuthStore';
import { Toaster } from 'react-hot-toast';

function App() {
  const { user, login, logout, fetchUser } = useAuthStore();

  useEffect(() => {
    // Attempt to fetch user if token exists on load
    if (localStorage.getItem('access_token')) {
      fetchUser();
    }
  }, [fetchUser]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <Toaster position="top-right" />
      <h1 className="text-2xl font-bold">Zestra Auth Test</h1>
      
      {user ? (
        <div className="p-4 bg-(--surface) border border-(--border) rounded-xl shadow-lg">
          <p>Logged in as: <strong>{user.email}</strong></p>
          <p>Role: <span className="text-(--primary) font-bold">{user.role}</span></p>
          <button onClick={logout} className="mt-4 px-4 py-2 bg-(--error) text-white rounded-lg">Logout</button>
        </div>
      ) : (
        <button 
          // Replace with a valid test credential from your database
          onClick={() => login('xyz@example.com', 'Xyz@123456')} 
          className="px-4 py-2 bg-(--primary) text-white rounded-lg hover:bg-(--primary-hover) transition-colors"
        >
          Test Login
        </button>
      )}
    </div>
  );
}

export default App;