import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, MapPin, AlignLeft, ArrowRight } from 'lucide-react';
import useRestaurantStore from '../../store/dashboard/useRestaurantStore';
import toast from 'react-hot-toast';

const RestaurantOnboarding = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: ''
  });
  
  const { onboardRestaurant, isLoading } = useRestaurantStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Restaurant name is required');
      return;
    }

    const success = await onboardRestaurant({
      name: formData.name,
      description: formData.description || null,
      address: formData.address || null
    });

    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-8 sm:mt-16 mb-12 px-4 font-sans relative z-10">
      
      <div className="bg-(--surface) p-8 sm:p-12 rounded-4xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-(--border)/60 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-700">
        
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-(--primary)/10 blur-[100px] rounded-full pointer-events-none -mr-20 -mt-20"></div>

        <div className="mb-10 relative z-10">
          <div className="w-16 h-16 bg-linear-to-br from-(--primary)/20 to-emerald-500/10 rounded-[20px] border border-(--primary)/20 flex items-center justify-center mb-6 shadow-sm">
            <Store className="w-8 h-8 text-(--primary)" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-(--text) tracking-tight">Set up your restaurant</h1>
          <p className="text-(--text-secondary) font-medium mt-2 text-base">
            Let's get the basic details down. You can always change these later in settings.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          
          <div>
            <label className="block text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2">
              Restaurant Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Store className="h-5 w-5 text-(--text-muted)" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-12 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 transition-all text-(--text) font-bold text-base placeholder:text-(--text-muted)/50 placeholder:font-medium shadow-sm"
                placeholder="e.g. The Emerald Cafe"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2">
              Description (Optional)
            </label>
            <div className="relative">
              <div className="absolute top-4 left-4 pointer-events-none">
                <AlignLeft className="h-5 w-5 text-(--text-muted)" />
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full pl-12 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 transition-all text-(--text) font-medium text-base placeholder:text-(--text-muted)/50 shadow-sm resize-none"
                placeholder="Briefly describe your restaurant's vibe and cuisine..."
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-black text-(--text-secondary) uppercase tracking-widest mb-2">
              Address (Optional)
            </label>
            <div className="relative">
              <div className="absolute top-4 left-4 pointer-events-none">
                <MapPin className="h-5 w-5 text-(--text-muted)" />
              </div>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="2"
                className="w-full pl-12 pr-5 py-4 bg-(--background) border-2 border-(--border)/60 rounded-2xl focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 transition-all text-(--text) font-medium text-base placeholder:text-(--text-muted)/50 shadow-sm resize-none"
                placeholder="123 Culinary Street, Food City"
              />
            </div>
          </div>

          <div className="pt-6 mt-8 border-t border-(--border)/60 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full sm:w-auto flex justify-center items-center py-4 px-10 border border-emerald-400/50 rounded-2xl shadow-[0_8px_20px_rgba(16,185,129,0.25)] text-white bg-linear-to-r from-(--primary) to-emerald-600 hover:from-(--primary-hover) hover:to-emerald-700 focus:outline-none font-black text-base transition-all active:scale-95 disabled:opacity-70 group"
            >
              {isLoading ? (
                <span className="animate-pulse">Saving...</span>
              ) : (
                <>
                  Continue <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default RestaurantOnboarding;