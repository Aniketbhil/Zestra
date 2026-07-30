import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import useAuthStore from '../../store/auth/useAuthStore';
import { ShieldCheck, Loader2, ArrowRight } from 'lucide-react';
import toast from 'react-hot-toast';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;
  const originalPhone = location.state?.phone;

  const { verifyOtp, resendOtp, isLoading } = useAuthStore();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendCooldown, setResendCooldown] = useState(60);
  
  // Manage dynamic UI state for where the code was sent
  const [sentTarget, setSentTarget] = useState(originalPhone ? 'phone no.' : 'email');
  const [targetValue, setTargetValue] = useState(originalPhone ? originalPhone : email);
  
  const inputRefs = useRef([]);

  // If there's no email in state, they shouldn't be here. Send them to register.
  if (!email) {
    return <Navigate to="/register" replace />;
  }

  // Handle countdown timer for Resend OTP
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    // Only allow numbers
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-advance to next input
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace auto-retreat
    if (e.key === 'Backspace' && otp[index] === '' && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).replace(/\D/g, '');
    if (pastedData) {
      const newOtp = [...otp];
      for (let i = 0; i < pastedData.length; i++) {
        newOtp[i] = pastedData[i];
      }
      setOtp(newOtp);
      // Focus the next empty input, or the last one
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex].focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    
    if (otpString.length !== 6) {
      toast.error('Please enter all 6 digits');
      return;
    }

    const success = await verifyOtp(email, otpString);
    if (success) {
      // Redirect strictly to Login page upon successful verification
      navigate('/login', { replace: true });
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    
    const success = await resendOtp(email);
    if (success) {
      setResendCooldown(60); // Reset timer to 60 seconds
      // Force UI to show it was sent to email (since SMS costs money)
      setSentTarget('email');
      setTargetValue(email);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-(--background) p-4 py-12 font-sans relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-(--primary)/5 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full"></div>
      </div>

      <div className="w-full max-w-md bg-(--surface) p-8 sm:p-12 rounded-4xl shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-(--border)/60 relative z-10 animate-in fade-in zoom-in-95 duration-500">
        
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-20 h-20 bg-linear-to-br from-(--primary)/20 to-(--primary)/5 rounded-3xl border border-(--primary)/20 flex items-center justify-center mb-6 shadow-inner">
            <ShieldCheck className="w-10 h-10 text-(--primary)" />
          </div>
          <h1 className="text-3xl font-black text-(--text) mb-2 tracking-tight">
            Check your {sentTarget === 'email' ? 'email' : 'phone'}
          </h1>
          <p className="text-(--text-secondary) font-medium text-sm">
            We sent a 6-digit verification code to your {sentTarget}<br/>
            <span className="font-bold text-(--text) block mt-1">{targetValue}</span>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          <div className="flex justify-between gap-2 sm:gap-3" onPaste={handlePaste}>
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className="w-12 h-14 sm:w-14 sm:h-16 text-center text-2xl font-black bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 transition-all text-(--text) shadow-sm"
              />
            ))}
          </div>

          <button
            type="submit"
            disabled={isLoading || otp.join('').length !== 6}
            className="w-full flex justify-center items-center py-4 px-4 border border-emerald-400/50 rounded-2xl shadow-[0_8px_20px_rgba(16,185,129,0.25)] text-white bg-linear-to-r from-(--primary) to-emerald-600 hover:from-(--primary-hover) hover:to-emerald-700 focus:outline-none font-black text-base transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 disabled:shadow-none disabled:border-transparent group"
          >
            {isLoading ? <span className="animate-pulse flex items-center gap-2"><Loader2 className="w-5 h-5 animate-spin" /> Verifying...</span> : (
              <>
                Verify Account <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-sm font-medium text-(--text-secondary)">
            Didn't receive the code?{' '}
            {resendCooldown > 0 ? (
              <span className="font-bold text-(--text-muted)">Resend in {resendCooldown}s</span>
            ) : (
              <button 
                type="button" 
                onClick={handleResend}
                className="font-black text-(--primary) hover:text-(--primary-hover) underline decoration-transparent hover:decoration-current transition-colors"
              >
                Resend OTP
              </button>
            )}
          </p>
        </div>
        
      </div>
    </div>
  );
};

export default VerifyOTP;