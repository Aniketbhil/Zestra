import { Mail, Shield } from 'lucide-react';
import useAuthStore from '../../store/auth/useAuthStore';

const Settings = () => {
  const { user } = useAuthStore();

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Account Settings</h1>
        <p className="text-(--text-secondary) text-sm mt-1">Manage your Zestra profile details</p>
      </div>

      <div className="bg-(--surface) rounded-3xl border border-(--border) shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          
          <div className="flex items-center gap-4 border-b border-(--border) pb-6">
            <div className="w-16 h-16 bg-(--primary)/10 text-(--primary) rounded-full flex items-center justify-center font-bold text-2xl">
              {user?.email?.[0].toUpperCase()}
            </div>
            <div>
              <h2 className="text-xl font-bold text-(--text)">{user?.email}</h2>
              <p className="text-sm font-medium text-(--text-secondary) capitalize flex items-center gap-1.5 mt-1">
                <Shield className="w-4 h-4 text-(--primary)" /> {user?.role} Account
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-(--text-secondary) mb-1">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-(--text-muted)" />
                </div>
                <input 
                  type="text" 
                  disabled 
                  value={user?.email || ''} 
                  className="w-full pl-10 pr-4 py-3 bg-(--surface-secondary) border border-(--border) rounded-[14px] text-(--text-muted) cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-(--text-muted) mt-2">Your email address is managed securely by Zestra and cannot be changed.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Settings;