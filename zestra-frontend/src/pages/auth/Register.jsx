import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/auth/useAuthStore';
import { Mail, Lock, UserPlus, Store, User, Phone } from 'lucide-react';
import toast from 'react-hot-toast';

const Register = () => {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer');
  const { register, isLoading } = useAuthStore();
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!email || !password || !confirmPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (phone && phone.length !== 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    // Format phone number with +91 if provided
    const formattedPhone = phone.trim() ? `+91${phone.trim()}` : null;

    const success = await register(email, password, role, formattedPhone);
    if (success) {
      // Redirect to OTP Verification page and pass BOTH email and phone in state
      navigate('/verify-otp', { state: { email, phone: formattedPhone } });
    }
  };

  const handleGoogleSignup = () => {
    const apiBaseUrl =
      import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1";
    window.location.href = `${apiBaseUrl}/auth/google/login?role=${role}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--background) p-4 py-12 font-sans">
      <div className="w-full max-w-md bg-(--surface) p-8 sm:p-10 rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-(--border)/60 relative overflow-hidden">
        
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-(--primary)/5 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-3xl font-black text-(--text) mb-2 tracking-tight">Create Account</h1>
          <p className="text-(--text-secondary) font-medium text-sm">Join Zestra to manage your dining experience</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-6 relative z-10">
          
          <div className="grid grid-cols-2 gap-4 mb-2">
            <button
              type="button"
              onClick={() => setRole('customer')}
              className={`py-4 px-4 border-2 rounded-[20px] flex flex-col items-center justify-center transition-all duration-300 ${
                role === 'customer' 
                ? 'bg-linear-to-b from-(--primary)/10 to-(--primary)/5 text-(--primary) border-(--primary)/30 shadow-inner' 
                : 'bg-(--background) text-(--text-muted) border-(--border)/60 hover:border-(--border) hover:bg-(--surface-secondary)'
              }`}
            >
              <User className="h-6 w-6 mb-2" />
              <span className="font-black text-sm tracking-tight">Customer</span>
            </button>
            
            <button
              type="button"
              onClick={() => setRole('restaurant')}
              className={`py-4 px-4 border-2 rounded-[20px] flex flex-col items-center justify-center transition-all duration-300 ${
                role === 'restaurant' 
                ? 'bg-linear-to-b from-(--primary)/10 to-(--primary)/5 text-(--primary) border-(--primary)/30 shadow-inner' 
                : 'bg-(--background) text-(--text-muted) border-(--border)/60 hover:border-(--border) hover:bg-(--surface-secondary)'
              }`}
            >
              <Store className="h-6 w-6 mb-2" />
              <span className="font-black text-sm tracking-tight">Restaurant</span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2">Email <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-(--text-muted)/70" />
              </div>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 transition-all text-(--text) font-medium placeholder:text-(--text-muted)/50 shadow-sm"
                placeholder="name@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2">Phone Number (Optional)</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Phone className="h-5 w-5 text-(--text-muted)/70" />
                <span className="ml-2.5 font-black text-(--text) text-base mt-0.5">+91</span>
              </div>
              <input
                type="tel"
                maxLength={10}
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-24 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 transition-all text-(--text) font-medium placeholder:text-(--text-muted)/50 shadow-sm"
                placeholder="10-digit number"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2">Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-(--text-muted)/70" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 transition-all text-(--text) font-medium placeholder:text-(--text-muted)/50 shadow-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2">Confirm Password <span className="text-red-500">*</span></label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-(--text-muted)/70" />
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-12 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 transition-all text-(--text) font-medium placeholder:text-(--text-muted)/50 shadow-sm"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center py-4 px-4 border border-emerald-400/50 rounded-2xl shadow-[0_8px_20px_rgba(16,185,129,0.25)] text-white bg-linear-to-r from-(--primary) to-emerald-600 hover:from-(--primary-hover) hover:to-emerald-700 focus:outline-none font-black text-base transition-all active:scale-95 disabled:opacity-70 mt-6"
          >
            {isLoading ? <span className="animate-pulse">Creating account...</span> : (
              <>
                <UserPlus className="mr-2 h-5 w-5" /> Create Account
              </>
            )}
          </button>
        </form>

        <div className="mt-8 relative z-10">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-(--border)/60"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-(--surface) text-(--text-muted) font-bold">Or register with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignup}
            type="button"
            className="mt-6 w-full flex justify-center items-center py-4 px-4 border border-(--border)/80 rounded-2xl bg-(--background) text-(--text) hover:bg-(--surface-secondary) transition-all font-black shadow-sm active:scale-95"
          >
            <svg className="h-5 w-5 mr-3" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign in with Google
          </button>
        </div>

        <p className="mt-8 text-center text-sm font-medium text-(--text-secondary) relative z-10">
          Already have an account?{' '}
          <Link to="/login" className="font-black text-(--primary) hover:text-(--primary-hover) underline decoration-transparent hover:decoration-current transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;