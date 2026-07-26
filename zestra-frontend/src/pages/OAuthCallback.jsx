import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import toast from 'react-hot-toast';

const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchUser } = useAuthStore();
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent React 18 strict mode double-firing
    if (hasProcessed.current) return;
    
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');

    if (accessToken && refreshToken) {
      hasProcessed.current = true;
      
      // 1. Save tokens to local storage
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      
      // 2. Fetch user profile with new token, then redirect
      fetchUser().then(() => {
        toast.success('Successfully logged in with Google!');
        navigate('/dashboard');
      });
    } else {
      toast.error('Google login failed. Missing credentials.');
      navigate('/login');
    }
  }, [searchParams, navigate, fetchUser]);

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