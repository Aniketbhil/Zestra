import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';
import { Mail, Lock, UserPlus, Store, User } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    const success = await register(email, password, role);
    if (success) {
      navigate('/login');
    }
  };

  const handleGoogleSignup = () => {
    window.location.href = `http://localhost:8000/api/v1/auth/google/login?role=${role}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--background) p-4 py-12">
      <div className="w-full max-w-md bg-(--surface) p-8 rounded-[20px] shadow-[0_4px_18px_rgba(15,23,42,0.05)] border border-(--border)">
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-(--text) mb-2">Create Account</h1>
          <p className="text-(--text-muted)">Join Zestra to manage your dining experience</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-5">
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`py-3 px-4 border rounded-[14px] flex flex-col items-center justify-center transition-all ${
                role === 'customer' 
                ? 'bg-(--primary) text-white border-transparent shadow-[0_4px_14px_rgba(16,185,129,0.25)]' 
                : 'bg-(--surface) text-(--text-secondary) border-(--border) hover:bg-(--surface-secondary)'
              }`}
            >
              <User className="h-6 w-6 mb-2" />
              <span className="font-semibold text-sm">Customer</span>
            </button>
            
            <button
              type="button"
              onClick={() => setRole('restaurant')}
              className={`py-3 px-4 border rounded-[14px] flex flex-col items-center justify-center transition-all ${
                role === 'restaurant' 
                ? 'bg-(--primary) text-white border-transparent shadow-[0_4px_14px_rgba(16,185,129,0.25)]' 
                : 'bg-(--surface) text-(--text-secondary) border-(--border) hover:bg-(--surface-secondary)'
              }`}
            >
              <Store className="h-6 w-6 mb-2" />
              <span className="font-semibold text-sm">Restaurant</span>
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium text-(--text-secondary) mb-1">Email</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-(--text-muted)" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-(--surface) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-[rgba(16,185,129,0.15)] transition-all text-(--text) placeholder-(--text-muted)"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-(--text-secondary) mb-1">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-(--text-muted)" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-(--surface) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-[rgba(16,185,129,0.15)] transition-all text-(--text) placeholder-(--text-muted)"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-(--text-secondary) mb-1">Confirm Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-(--text-muted)" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-(--surface) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-[rgba(16,185,129,0.15)] transition-all text-(--text) placeholder-(--text-muted)"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-[14px] shadow-[0_4px_14px_rgba(16,185,129,0.25)] text-white bg-(--primary) hover:bg-(--primary-hover) focus:outline-none font-semibold transition-colors disabled:opacity-70 mt-4"
          >
            {isLoading ? 'Creating account...' : (
              <>
                <UserPlus className="mr-2 h-5 w-5" /> Create Account
              </>
            )}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-(--border)"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-(--surface) text-(--text-muted)">Or register with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignup}
            type="button"
            className="mt-6 w-full flex justify-center items-center py-3 px-4 border border-(--border) rounded-[14px] bg-(--surface) text-(--text) hover:bg-(--surface-secondary) transition-colors font-medium"
          >
            <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm text-(--text-secondary)">
          Already have an account?{' '}
          <Link to="/login" className="font-semibold text-(--primary) hover:text-(--primary-hover)">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;