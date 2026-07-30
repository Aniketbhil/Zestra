import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Shield, User, Lock, Store, MapPin, Phone, Loader2, Image as ImageIcon, Grid3X3, AlertTriangle, Trash2 } from 'lucide-react';
import useAuthStore from '../../store/auth/useAuthStore';
import useRestaurantStore from '../../store/dashboard/useRestaurantStore';
import api from '../../services/api';
import toast from 'react-hot-toast';

const Settings = () => {
  const navigate = useNavigate();
  const { user, fetchUser } = useAuthStore();
  const { restaurant, fetchMyRestaurant, updateMyRestaurant } = useRestaurantStore();

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
    description: '', address: '', contact_number: '', image_url: '', total_tables: 10
  });
  const [isRestSaving, setIsRestSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // --- 4. Modal State ---
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

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
        image_url: currentRestaurant.image_url || '',
        total_tables: currentRestaurant.total_tables || 10
      });
    } else {
      // Clear out the form if there is no valid restaurant for this user
      setRestDetails({ description: '', address: '', contact_number: '', image_url: '', total_tables: 10 });
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
    
    const success = await updateMyRestaurant({
      description: restDetails.description,
      address: restDetails.address,
      contact_number: restDetails.contact_number,
      image_url: restDetails.image_url,
      total_tables: parseInt(restDetails.total_tables, 10)
    });

    if (success) {
      await fetchMyRestaurant();
      toast.success("Restaurant details updated!");
    }
    setIsRestSaving(false);
  };

  // Opens the custom modal
  const handleDeleteRestaurantClick = () => {
    setIsDeleteModalOpen(true);
  };

  // Executes the actual deletion
  const confirmDeleteRestaurant = async () => {
    setIsDeleting(true);
    try {
      await api.delete('/restaurants/me', { data: { confirm: true } });
      toast.success("Restaurant deleted successfully.");
      await fetchUser(); 
      navigate('/dashboard/onboard');
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to delete restaurant");
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false); // Close modal on finish
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 font-sans px-1">
      
      <div>
        <h1 className="text-3xl font-black text-(--text) tracking-tight">Account Settings</h1>
        <p className="text-(--text-secondary) font-medium text-sm mt-1.5">Manage your Zestra profile and preferences</p>
      </div>

      {/* SECTION 1: Personal Information */}
      <section className="bg-(--surface) rounded-4xl border border-(--border)/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden relative">
        <div className="absolute top-0 right-0 w-72 h-72 bg-(--primary)/5 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20"></div>

        <div className="p-6 sm:p-10 border-b border-(--border)/60 flex items-center gap-5 relative z-10 bg-(--surface-secondary)/30">
          <div className="w-20 h-20 bg-linear-to-br from-(--primary)/20 to-emerald-500/10 text-(--primary) border border-(--primary)/20 rounded-3xl flex items-center justify-center font-black text-3xl shrink-0 shadow-sm">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div>
            <h2 className="text-2xl font-black text-(--text) tracking-tight">{user?.email}</h2>
            <div className="inline-flex items-center gap-1.5 mt-2 bg-(--background) border border-(--border)/80 px-3 py-1 rounded-lg text-xs font-bold text-(--text-secondary) uppercase tracking-widest shadow-sm">
              <Shield className="w-3.5 h-3.5 text-(--primary)" /> {user?.role} Account
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="p-6 sm:p-10 space-y-8 relative z-10">
          <h3 className="text-xl font-black text-(--text) flex items-center gap-3 tracking-tight">
            <div className="w-10 h-10 rounded-[14px] bg-(--primary)/10 flex items-center justify-center text-(--primary)">
              <User className="w-5 h-5" />
            </div>
            Personal Details
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <label className="flex text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2 items-center justify-between">Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name" 
                className="w-full px-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 transition-all text-(--text) font-medium text-base shadow-sm"
              />
            </div>
            <div>
              <label className="flex text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2 items-center justify-between">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-(--text-muted)/70" />
                </div>
                <input 
                  type="email" 
                  disabled 
                  value={user?.email || ''} 
                  className="w-full pl-12 pr-5 py-4 bg-(--surface-secondary)/50 border-2 border-(--border)/40 rounded-2xl text-(--text-muted) font-medium text-base cursor-not-allowed shadow-inner"
                />
              </div>
              <p className="text-[11px] font-bold text-(--text-muted) mt-2 uppercase tracking-wide">Email is securely managed and cannot be changed.</p>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-(--border)/60">
            <button 
              type="submit" 
              disabled={isProfileSaving}
              className="w-full sm:w-auto px-8 py-4 bg-linear-to-r from-(--primary) to-emerald-600 hover:from-(--primary-hover) hover:to-emerald-700 text-white font-black text-base rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(16,185,129,0.25)] active:scale-95 disabled:opacity-70 border border-emerald-400/50"
            >
              {isProfileSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : 'Save Profile'}
            </button>
          </div>
        </form>
      </section>

      {/* SECTION 2: Security */}
      {user?.auth_provider === 'local' && (
        <section className="bg-(--surface) rounded-4xl border border-(--border)/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6 sm:p-10 relative">
          <div className="absolute top-0 right-0 w-72 h-72 bg-purple-500/5 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20"></div>

          <h3 className="text-xl font-black text-(--text) flex items-center gap-3 tracking-tight mb-8 relative z-10">
            <div className="w-10 h-10 rounded-[14px] bg-purple-100 flex items-center justify-center text-purple-600">
              <Lock className="w-5 h-5" />
            </div>
            Security & Password
          </h3>
          
          <form onSubmit={handleChangePassword} className="space-y-6 max-w-md relative z-10">
            <div>
              <label className="flex text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2 items-center justify-between">Current Password</label>
              <input 
                type="password" 
                required
                value={passwords.current}
                onChange={(e) => setPasswords({...passwords, current: e.target.value})}
                className="w-full px-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-(--text) font-medium text-base shadow-sm"
              />
            </div>
            <div>
              <label className="flex text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2 items-center justify-between">New Password</label>
              <input 
                type="password" 
                required
                minLength={8}
                value={passwords.new}
                onChange={(e) => setPasswords({...passwords, new: e.target.value})}
                className="w-full px-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-(--text) font-medium text-base shadow-sm"
              />
            </div>
            <div>
              <label className="flex text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2 items-center justify-between">Confirm New Password</label>
              <input 
                type="password" 
                required
                minLength={8}
                value={passwords.confirm}
                onChange={(e) => setPasswords({...passwords, confirm: e.target.value})}
                className="w-full px-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-500/10 transition-all text-(--text) font-medium text-base shadow-sm"
              />
            </div>
            
            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isPasswordSaving}
                className="w-full sm:w-auto px-8 py-4 bg-(--text) hover:bg-gray-800 border border-gray-700 text-(--background) font-black text-base rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(0,0,0,0.15)] active:scale-95 disabled:opacity-70"
              >
                {isPasswordSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Updating...</> : 'Update Password'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SECTION 3: Restaurant Profile */}
      {user?.role === 'restaurant' && currentRestaurant && (
        <section className="bg-(--surface) rounded-4xl border border-(--border)/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6 sm:p-10 relative">
          <div className="absolute top-0 right-0 w-72 h-72 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4 relative z-10">
            <h3 className="text-xl font-black text-(--text) flex items-center gap-3 tracking-tight">
              <div className="w-10 h-10 rounded-[14px] bg-linear-to-br from-amber-100 to-amber-50 flex items-center justify-center text-amber-600 border border-amber-200/50 shadow-sm">
                <Store className="w-5 h-5" />
              </div>
              Restaurant Profile
            </h3>
            <span className="bg-amber-50 text-amber-600 border border-amber-200 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm self-start sm:self-auto">Public Details</span>
          </div>
          
          <form onSubmit={handleUpdateRestaurant} className="space-y-6 sm:space-y-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
              <div className="md:col-span-2">
                <label className="flex text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2 items-center justify-between">Description</label>
                <textarea 
                  rows="3"
                  value={restDetails.description}
                  onChange={(e) => setRestDetails({...restDetails, description: e.target.value})}
                  placeholder="Tell customers about your restaurant's vibe and cuisine..."
                  className="w-full px-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-(--text) font-medium text-base shadow-sm resize-none placeholder:text-(--text-muted)/50"
                />
              </div>

              <div>
                <label className="flex text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2 items-center justify-between">Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <MapPin className="h-5 w-5 text-(--text-muted)/70" />
                  </div>
                  <input 
                    type="text" 
                    value={restDetails.address}
                    onChange={(e) => setRestDetails({...restDetails, address: e.target.value})}
                    placeholder="123 Main St, Food City..."
                    className="w-full pl-12 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-(--text) font-medium text-base shadow-sm placeholder:text-(--text-muted)/50"
                  />
                </div>
              </div>

              <div>
                <label className="flex text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2 items-center justify-between">Contact Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Phone className="h-5 w-5 text-(--text-muted)/70" />
                  </div>
                  <input 
                    type="text" 
                    value={restDetails.contact_number}
                    onChange={(e) => setRestDetails({...restDetails, contact_number: e.target.value})}
                    placeholder="(555) 123-4567"
                    className="w-full pl-12 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-(--text) font-medium text-base shadow-sm placeholder:text-(--text-muted)/50"
                  />
                </div>
              </div>

              <div>
                <label className="flex text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2 items-center justify-between">Cover Image URL</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <ImageIcon className="h-5 w-5 text-(--text-muted)/70" />
                  </div>
                  <input 
                    type="url" 
                    value={restDetails.image_url}
                    onChange={(e) => setRestDetails({...restDetails, image_url: e.target.value})}
                    placeholder="https://example.com/cover-image.jpg"
                    className="w-full pl-12 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-(--text) font-medium text-base shadow-sm placeholder:text-(--text-muted)/50"
                  />
                </div>
              </div>

              <div>
                <label className="flex text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2 items-center justify-between">Total Table Capacity</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Grid3X3 className="h-5 w-5 text-(--text-muted)/70" />
                  </div>
                  <input 
                    type="number" 
                    min="1"
                    max="100"
                    value={restDetails.total_tables}
                    onChange={(e) => setRestDetails({...restDetails, total_tables: e.target.value})}
                    className="w-full pl-12 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all text-(--text) font-medium text-base shadow-sm"
                  />
                </div>
                <p className="text-[11px] font-bold text-(--text-muted) mt-2 uppercase tracking-wide">How many tables are in your restaurant?</p>
              </div>

            </div>

            <div className="flex justify-end pt-6 border-t border-(--border)/60">
              <button 
                type="submit" 
                disabled={isRestSaving}
                className="w-full sm:w-auto px-8 py-4 bg-linear-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-base rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 shadow-[0_8px_20px_rgba(245,158,11,0.25)] active:scale-95 disabled:opacity-70 border border-amber-400/50"
              >
                {isRestSaving ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving...</> : 'Save Restaurant Details'}
              </button>
            </div>
          </form>
        </section>
      )}

      {/* SECTION 4: Danger Zone (Delete Restaurant) */}
      {user?.role === 'restaurant' && currentRestaurant && (
        <section className="bg-(--surface) rounded-4xl border border-red-500/30 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden p-6 sm:p-10 relative mt-8">
          <div className="absolute top-0 right-0 w-72 h-72 bg-red-500/5 blur-[80px] rounded-full pointer-events-none -mr-20 -mt-20"></div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
            <div>
              <h3 className="text-xl font-black text-red-500 flex items-center gap-3 tracking-tight mb-2">
                <div className="w-10 h-10 rounded-[14px] bg-red-100 flex items-center justify-center text-red-600 border border-red-200/50 shadow-sm">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                Danger Zone
              </h3>
              <p className="text-sm font-medium text-(--text-secondary) max-w-md">
                Permanently delete your restaurant profile, menu, and inventory. This action cannot be undone.
              </p>
            </div>
            
            <button 
              onClick={handleDeleteRestaurantClick}
              disabled={isDeleting}
              className="w-full sm:w-auto px-6 py-3.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 font-black text-sm rounded-2xl transition-all duration-300 flex items-center justify-center gap-2 border border-red-200 hover:border-red-500 shadow-sm active:scale-95 disabled:opacity-70 shrink-0"
            >
              <Trash2 className="w-5 h-5" /> Delete Restaurant
            </button>
          </div>
        </section>
      )}

      {/* Custom Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-(--surface) rounded-4xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-(--border)/60 scale-in zoom-in-95 duration-200 relative">
            
            <div className="w-20 h-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-sm border border-red-200">
              <AlertTriangle className="w-10 h-10" />
            </div>
            
            <h3 className="text-2xl font-black text-(--text) text-center mb-3 tracking-tight">Delete Restaurant?</h3>
            <p className="text-(--text-secondary) font-medium text-center mb-8">
              This action is <span className="font-bold text-red-500">permanent</span>. All your menu items, inventory, and analytics will be erased completely.
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="flex-1 py-4 bg-(--background) hover:bg-(--surface-secondary) border-2 border-(--border) text-(--text) font-black rounded-2xl transition-all active:scale-95 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteRestaurant}
                disabled={isDeleting}
                className="flex-1 py-4 bg-red-500 hover:bg-red-600 text-white font-black rounded-2xl transition-all shadow-[0_8px_20px_rgba(239,68,68,0.25)] active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 border border-red-400"
              >
                {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Yes, Delete'}
              </button>
            </div>
            
          </div>
        </div>
      )}

    </div>
  );
};

export default Settings;