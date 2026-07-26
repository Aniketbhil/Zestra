import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, Image as ImageIcon } from 'lucide-react';
import useMenuStore from '../store/useMenuStore';

const Menu = () => {
  const { menuItems, isLoading, fetchMenu, addMenuItem, deleteMenuItem } = useMenuStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    is_available: true
  });

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = await addMenuItem({
      ...formData,
      price: parseFloat(formData.price),
      image_url: formData.image_url.trim() === '' ? null : formData.image_url
    });
    
    if (success) {
      setIsModalOpen(false);
      setFormData({ name: '', description: '', price: '', category: '', image_url: '', is_available: true });
    }
  };

  const filteredItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Menu Management</h1>
          <p className="text-(--text-secondary) text-sm mt-1">Manage your restaurant's digital menu</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search items..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-(--surface) border border-(--border) rounded-[14px] text-sm focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text)"
            />
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-(--primary) hover:bg-(--primary-hover) text-white rounded-[14px] font-semibold text-sm transition-colors whitespace-nowrap shadow-sm shadow-(--primary)/25"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Menu Table */}
      <div className="bg-(--surface) rounded-[20px] border border-(--border) overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-(--surface-secondary) border-b border-(--border)">
                <th className="px-6 py-4 text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">Item Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">Category</th>
                <th className="px-6 py-4 text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">Price</th>
                <th className="px-6 py-4 text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-(--text-secondary) uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading && menuItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-(--text-muted)">Loading menu items...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-(--text-muted)">No items found. Add your first dish!</td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-(--surface-secondary)/50 transition-colors">
                    <td className="px-6 py-4 flex items-center gap-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-10 h-10 rounded-lg object-cover border border-(--border)" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-(--surface-secondary) border border-(--border) flex items-center justify-center text-(--text-muted)">
                          <ImageIcon className="w-5 h-5" />
                        </div>
                      )}
                      <div>
                        <div className="font-semibold text-(--text)">{item.name}</div>
                        <div className="text-xs text-(--text-muted) truncate max-w-50">{item.description}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{item.category}</td>
                    <td className="px-6 py-4 font-semibold text-(--primary)">${parseFloat(item.price).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${item.is_available ? 'bg-[#DCFCE7] text-[#22C55E]' : 'bg-[#FEE2E2] text-[#EF4444]'}`}>
                        {item.is_available ? 'Available' : 'Unavailable'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button className="p-2 text-(--text-muted) hover:text-(--primary) hover:bg-(--primary)/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => deleteMenuItem(item.id)}
                        className="p-2 text-(--text-muted) hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Menu Item Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-(--surface) w-full max-w-md rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
            <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-(--text)">Add New Item</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-(--text-muted) hover:text-(--text) transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1">Item Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text)" placeholder="e.g. Classic Cheeseburger" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-(--text-secondary) mb-1">Category</label>
                  <input required type="text" name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text)" placeholder="e.g. Mains" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--text-secondary) mb-1">Price ($)</label>
                  <input required type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text)" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1">Image URL (Optional)</label>
                <input type="url" name="image_url" value={formData.image_url} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text)" placeholder="https://example.com/image.jpg" />
              </div>

              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1">Description (Optional)</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" className="w-full px-4 py-2.5 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text) resize-none" placeholder="Ingredients and details..." />
              </div>

              <div className="flex items-center mt-2">
                <input type="checkbox" id="is_available" name="is_available" checked={formData.is_available} onChange={handleInputChange} className="w-4 h-4 text-(--primary) border-(--border) rounded focus:ring-(--primary)" />
                <label htmlFor="is_available" className="ml-2 block text-sm text-(--text-secondary)">Available for order</label>
              </div>

              <div className="pt-4 mt-6 border-t border-(--border) flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-[14px] font-semibold text-(--text-secondary) hover:bg-(--surface-secondary) transition-colors">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2.5 rounded-[14px] font-semibold text-white bg-(--primary) hover:bg-(--primary-hover) shadow-sm shadow-(--primary)/25 transition-colors disabled:opacity-70">
                  {isLoading ? 'Saving...' : 'Save Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;