import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/auth/useAuthStore';
import toast from 'react-hot-toast';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    
    // Parse the hash fragment (e.g., #access_token=...)
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      hasProcessed.current = true;
      
      // Clear the tokens from the browser URL immediately
      window.history.replaceState(null, '', window.location.pathname);
      
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      fetchUser().then(() => {
        toast.success('Successfully logged in with Google!');
        navigate('/dashboard');
      });
    } else {
      toast.error('Google login failed. Missing credentials.');
      navigate('/login');
    }
  }, [navigate, fetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--background)">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-(--text-muted) font-medium">Completing Secure Sign In...</p>
      </div>
    </div>
  );
};

export default OAuthCallback;