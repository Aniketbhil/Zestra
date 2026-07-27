import { useState, useEffect } from 'react';
import { Mail, Shield, User, Lock, Store, MapPin, Phone, Loader2, Image as ImageIcon } from 'lucide-react';
import useAuthStore from '../../store/auth/useAuthStore';
import useRestaurantStore from '../../store/dashboard/useRestaurantStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user, fetchUser } = useAuthStore();
  const { restaurant, fetchMyRestaurant } = useRestaurantStore();

  // SECURITY FIX: Prevent stale data from previous logins
  const currentRestaurant = restaurant?.owner_id === user?.id ? restaurant : null;

  // --- 1. User Profile State ---
  const [fullName, setFullName] = useState('');
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // --- 2. Security / Password State ---
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });
  const [isPasswordSaving, setIsPasswordSaving] = useState(false);

  // --- 3. Restaurant Profile State ---
  const [restDetails, setRestDetails] = useState({
    description: '', address: '', contact_number: '', image_url: ''
  });
  const [isRestSaving, setIsRestSaving] = useState(false);

  // Always fetch fresh restaurant data when user ID changes
  useEffect(() => {
    if (user?.role === 'restaurant') {
      fetchMyRestaurant();
    }
  }, [user?.id, fetchMyRestaurant]);

  // Sync state safely
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
    }
    
    // Only load restaurant details if they belong to the CURRENT user
    if (currentRestaurant) {
      setRestDetails({
        description: currentRestaurant.description || '',
        address: currentRestaurant.address || '',
        contact_number: currentRestaurant.contact_number || '',
        image_url: currentRestaurant.image_url || ''
      });
    } else {
      // Clear out the form if there is no valid restaurant for this user
      setRestDetails({ description: '', address: '', contact_number: '', image_url: '' });
    }
  }, [user, currentRestaurant]);

  // --- Handlers ---

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setIsProfileSaving(true);
    try {
      await api.patch('/users/me/profile', { full_name: fullName });
      await fetchUser();
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update profile");
    } finally {
      setIsProfileSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwords.new !== passwords.confirm) {
      return toast.error("New passwords do not match!");
    }
    setIsPasswordSaving(true);
    try {
      await api.patch('/auth/change-password', {
        current_password: passwords.current,
        new_password: passwords.new
      });
      setPasswords({ current: '', new: '', confirm: '' });
      toast.success("Password changed successfully!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to change password");
    } finally {
      setIsPasswordSaving(false);
    }
  };

  const handleUpdateRestaurant = async (e) => {
    e.preventDefault();
    setIsRestSaving(true);
    try {
      await api.patch('/restaurants/me', {
        description: restDetails.description,
        address: restDetails.address,
        contact_number: restDetails.contact_number,
        image_url: restDetails.image_url
      });
      await fetchMyRestaurant();
      toast.success("Restaurant details updated!");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to update restaurant");
    } finally {
      setIsRestSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Account Settings</h1>
        <p className="text-(--text-secondary) text-sm mt-1">Manage your Zestra profile and preferences</p>
      </div>

      {/* SECTION 1: Personal Information */}
      <section className="bg-(--surface) rounded-3xl border border-(--border) shadow-sm overflow-hidden">
        <div className="p-6 sm:p-8 border-b border-(--border) flex items-center gap-4">
          <div className="w-16 h-16 bg-(--primary)/10 text-(--primary) rounded-full flex items-center justify-center font-bold text-2xl shrink-0">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-(--text)">{user?.email}</h2>
            <p className="text-sm font-medium text-(--text-secondary) capitalize flex items-center gap-1.5 mt-1">
              <Shield className="w-4 h-4 text-(--primary)" /> {user?.role} Account
            </p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-6 sm:p-8 space-y-6">
          <h3 className="text-lg font-bold text-(--text) flex items-center gap-2">
            <User className="w-5 h-5 text-(--primary)" /> Personal Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-(--text-secondary) mb-2">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name" 
                className="w-full px-4 py-3 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) text-(--text)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text-secondary) mb-2">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-(--text-muted)" />
                </div>
                <input 
                  type="email" 
                  disabled 
                  value={user?.email || ''} 
                  className="w-full pl-10 pr-4 py-3 bg-(--surface-secondary) border border-(--border) rounded-[14px] text-(--text-muted) cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-(--text-muted) mt-2">Email is managed securely and cannot be changed.</p>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              disabled={isProfileSaving}
              className="px-6 py-3 bg-(--primary) hover:bg-(--primary-hover) text-white font-bold rounded-[14px] transition-colors flex items-center gap-2"
            >
              {isProfileSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2: Security */}
      {user?.auth_provider === 'local' && (
        <section className="bg-(--surface) rounded-3xl border border-(--border) shadow-sm overflow-hidden p-6 sm:p-8">
          <h3 className="text-lg font-bold text-(--text) flex items-center gap-2 mb-6">
            <Lock className="w-5 h-5 text-(--primary)" /> Security & Password
          </h3>
          
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-(--text-secondary) mb-2">Current Password</label>
              <input 
                type="password" 
                required
                value={passwords.current}
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                className="w-full px-4 py-3 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) text-(--text)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text-secondary) mb-2">New Password</label>
              <input 
                type="password" 
                required
                minLength={8}
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                className="w-full px-4 py-3 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) text-(--text)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-(--text-secondary) mb-2">Confirm New Password</label>
              <input 
                type="password" 
                required
                minLength={8}
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                className="w-full px-4 py-3 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) text-(--text)"
              />
            </div>
            
            <div className="pt-2">
              <button 
                type="submit" 
                disabled={isPasswordSaving}
                className="px-6 py-3 bg-(--surface-secondary) hover:bg-(--border) border border-(--border) text-(--text) font-bold rounded-[14px] transition-colors flex items-center gap-2"
              >
                {isPasswordSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Updating...</> : 'Update Password'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SECTION 3: Restaurant Profile */}
      {user?.role === 'restaurant' && (
        <section className="bg-(--surface) rounded-3xl border border-(--border) shadow-sm overflow-hidden p-6 sm:p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-(--text) flex items-center gap-2">
              <Store className="w-5 h-5 text-amber-500" /> Restaurant Profile
            </h3>
            <span className="bg-amber-100 text-amber-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Public Details</span>
          </div>
          
          <form onSubmit={handleUpdateRestaurant} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-(--text-secondary) mb-2">Description</label>
                <textarea 
                  rows="3"
                  value={restDetails.description}
                  onChange={(e) => setRestDetails({...restDetails, description: e.target.value})}
                  placeholder="Tell customers about your restaurant..."
                  className="w-full px-4 py-3 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-amber-500 text-(--text) resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-2">Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-(--text-muted)" />
                  </div>
                  <input 
                    type="text" 
                    value={restDetails.address}
                    onChange={(e) => setRestDetails({...restDetails, address: e.target.value})}
                    placeholder="123 Main St..."
                    className="w-full pl-10 pr-4 py-3 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-amber-500 text-(--text)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-2">Contact Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-(--text-muted)" />
                  </div>
                  <input 
                    type="text" 
                    value={restDetails.contact_number}
                    onChange={(e) => setRestDetails({...restDetails, contact_number: e.target.value})}
                    placeholder="(555) 123-4567"
                    className="w-full pl-10 pr-4 py-3 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-amber-500 text-(--text)"
                  />
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-(--text-secondary) mb-2">Cover Image URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ImageIcon className="h-5 w-5 text-(--text-muted)" />
                  </div>
                  <input 
                    type="url" 
                    value={restDetails.image_url}
                    onChange={(e) => setRestDetails({...restDetails, image_url: e.target.value})}
                    placeholder="https://example.com/image.jpg"
                    className="w-full pl-10 pr-4 py-3 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-amber-500 text-(--text)"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-(--border)">
              <button 
                type="submit" 
                disabled={isRestSaving}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-[14px] transition-colors flex items-center gap-2 shadow-md shadow-amber-500/20"
              >
                {isRestSaving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Restaurant Details'}
              </button>
            </div>
          </form>
        </section>
      )}
    </div>
  );
};

export default Settings;