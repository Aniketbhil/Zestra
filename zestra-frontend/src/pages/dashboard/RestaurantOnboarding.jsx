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
    <div className="max-w-2xl mx-auto mt-10">
      <div className="bg-(--surface) p-8 rounded-[20px] shadow-sm border border-(--border)">
        
        <div className="mb-8">
          <div className="w-12 h-12 bg-(--primary)/10 rounded-full flex items-center justify-center mb-4">
            <Store className="w-6 h-6 text-(--primary)" />
          </div>
          <h1 className="text-2xl font-bold text-(--text)">Set up your restaurant</h1>
          <p className="text-(--text-secondary) mt-1">
            Let's get the basic details down. You can always change these later.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          <div>
            <label className="block text-sm font-medium text-(--text-secondary) mb-1">
              Restaurant Name <span className="text-(--error)">*</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Store className="h-5 w-5 text-(--text-muted)" />
              </div>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-3 bg-(--surface) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-[rgba(16,185,129,0.15)] transition-all text-(--text) placeholder-(--text-muted)"
                placeholder="e.g. The Emerald Cafe"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-(--text-secondary) mb-1">
              Description (Optional)
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <AlignLeft className="h-5 w-5 text-(--text-muted)" />
              </div>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows="3"
                className="w-full pl-10 pr-4 py-3 bg-(--surface) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-[rgba(16,185,129,0.15)] transition-all text-(--text) placeholder-(--text-muted) resize-none"
                placeholder="Briefly describe your restaurant's vibe and cuisine..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-(--text-secondary) mb-1">
              Address (Optional)
            </label>
            <div className="relative">
              <div className="absolute top-3 left-3 pointer-events-none">
                <MapPin className="h-5 w-5 text-(--text-muted)" />
              </div>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="2"
                className="w-full pl-10 pr-4 py-3 bg-(--surface) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-[rgba(16,185,129,0.15)] transition-all text-(--text) placeholder-(--text-muted) resize-none"
                placeholder="123 Culinary Street, Food City"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-(--border) flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="flex justify-center items-center py-3 px-6 border border-transparent rounded-[14px] shadow-[0_4px_14px_rgba(16,185,129,0.25)] text-white bg-(--primary) hover:bg-(--primary-hover) focus:outline-none font-semibold transition-colors disabled:opacity-70"
            >
              {isLoading ? 'Saving...' : (
                <>
                  Continue <ArrowRight className="ml-2 h-5 w-5" />
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