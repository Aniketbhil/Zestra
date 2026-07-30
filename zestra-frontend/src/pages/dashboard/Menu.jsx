import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, Image as ImageIcon } from 'lucide-react';
import useMenuStore from '../../store/dashboard/useMenuStore';

const Menu = () => {
  const { menuItems, isLoading, fetchMenu, addMenuItem, updateMenuItem, deleteMenuItem } = useMenuStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
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

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', description: '', price: '', category: '', image_url: '', is_available: true });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price,
      category: item.category,
      image_url: item.image_url || '',
      is_available: item.is_available
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      price: parseFloat(formData.price),
      image_url: formData.image_url.trim() === '' ? null : formData.image_url
    };

    let success;
    if (editingItem) {
      success = await updateMenuItem(editingItem.id, payload);
    } else {
      success = await addMenuItem(payload);
    }
    
    if (success) {
      setIsModalOpen(false);
      setEditingItem(null);
      setFormData({ name: '', description: '', price: '', category: '', image_url: '', is_available: true });
    }
  };

  const filteredItems = menuItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans pb-8">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 px-1">
        <div>
          <h1 className="text-3xl font-black text-(--text) tracking-tight">Menu Management</h1>
          <p className="text-(--text-secondary) font-medium text-sm mt-1.5">Manage your restaurant's digital menu ({menuItems.length} items)</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-4">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search items or categories..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-(--surface) border-2 border-(--border)/60 rounded-2xl text-sm font-medium focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 text-(--text) transition-all placeholder:text-(--text-muted)/70"
            />
          </div>
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-5 py-3 bg-linear-to-r from-(--primary) to-emerald-600 hover:from-(--primary-hover) hover:to-emerald-700 text-white rounded-2xl font-black text-sm transition-all shadow-[0_8px_20px_rgba(16,185,129,0.25)] hover:shadow-[0_12px_25px_rgba(16,185,129,0.35)] hover:-translate-y-0.5 active:scale-95 whitespace-nowrap border border-emerald-400/50"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Menu Table - Premium Bento Wrapper */}
      <div className="bg-(--surface) rounded-4xl border border-(--border)/60 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-(--border) scrollbar-track-transparent">
          <table className="w-full text-left border-collapse min-w-175">
            <thead>
              <tr className="bg-(--surface-secondary)/40 border-b border-(--border)/60">
                <th className="px-6 py-5 text-xs font-black text-(--text-secondary) uppercase tracking-widest">Item Name</th>
                <th className="px-6 py-5 text-xs font-black text-(--text-secondary) uppercase tracking-widest">Category</th>
                <th className="px-6 py-5 text-xs font-black text-(--text-secondary) uppercase tracking-widest">Price</th>
                <th className="px-6 py-5 text-xs font-black text-(--text-secondary) uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-xs font-black text-(--text-secondary) uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)/50">
              {isLoading && menuItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-(--text-muted)">
                      <div className="w-10 h-10 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_var(--primary)]"></div>
                      <span className="font-bold tracking-tight">Loading menu items...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-16 text-center">
                     <div className="flex flex-col items-center justify-center text-(--text-muted) opacity-60">
                        <Search className="w-12 h-12 mb-3 opacity-30" />
                        <span className="font-bold tracking-tight">No items found.</span>
                     </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-(--surface-secondary)/40 transition-colors group">
                    <td className="px-6 py-4 flex items-center gap-4">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-[14px] object-cover border border-(--border)/60 shadow-sm group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-12 h-12 rounded-[14px] bg-(--surface-secondary) border border-(--border)/60 flex items-center justify-center text-(--text-muted) shadow-sm">
                          <ImageIcon className="w-5 h-5 opacity-50" />
                        </div>
                      )}
                      <div>
                        <div className="font-black text-(--text) tracking-tight text-base">{item.name}</div>
                        <div className="text-xs font-medium text-(--text-muted) truncate max-w-50 mt-0.5">{item.description || 'No description added'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-(--text-secondary)">
                      <span className="bg-(--background) border border-(--border)/60 px-3 py-1.5 rounded-lg shadow-sm">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-black text-lg text-(--text)">₹{parseFloat(item.price).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm border ${item.is_available ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                        {item.is_available ? 'Available' : 'Sold Out'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEdit(item)}
                          className="p-2.5 text-(--text-secondary) hover:text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-100 rounded-xl transition-all active:scale-95"
                          title="Edit Item"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteMenuItem(item.id)}
                          className="p-2.5 text-(--text-secondary) hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all active:scale-95"
                          title="Delete Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal - Floating Glassmorphism */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-(--surface) w-full max-w-lg rounded-4xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300 flex flex-col border border-(--border)/60 max-h-[90vh]">
            
            <div className="px-8 py-6 border-b border-(--border)/60 flex items-center justify-between shrink-0 bg-(--surface-secondary)/30">
              <h2 className="text-xl font-black text-(--text) tracking-tight">{editingItem ? 'Edit Menu Item' : 'Add New Item'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-(--background) border border-(--border) text-(--text-muted) hover:text-(--text) transition-colors active:scale-95">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto scrollbar-thin">
              <div>
                <label className="block text-xs font-black text-(--text-secondary) uppercase tracking-wider mb-2">Item Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-(--background) border-2 border-(--border)/60 rounded-2xl font-medium focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 text-(--text) transition-all placeholder:text-(--text-muted)/50" placeholder="e.g. Classic Cheeseburger" />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-(--text-secondary) uppercase tracking-wider mb-2">Category</label>
                  <input required type="text" name="category" value={formData.category} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-(--background) border-2 border-(--border)/60 rounded-2xl font-medium focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 text-(--text) transition-all placeholder:text-(--text-muted)/50" placeholder="e.g. Mains" />
                </div>
                <div>
                  <label className="block text-xs font-black text-(--text-secondary) uppercase tracking-wider mb-2">Price (₹)</label>
                  <input required type="number" step="0.01" min="0" name="price" value={formData.price} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-(--background) border-2 border-(--border)/60 rounded-2xl font-black text-lg focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 text-(--primary) transition-all placeholder:text-(--text-muted)/50 placeholder:font-medium placeholder:text-base" placeholder="0.00" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-(--text-secondary) uppercase tracking-wider mb-2">Image URL (Optional)</label>
                <input type="url" name="image_url" value={formData.image_url} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-(--background) border-2 border-(--border)/60 rounded-2xl font-medium focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 text-(--text) transition-all placeholder:text-(--text-muted)/50" placeholder="https://example.com/image.jpg" />
              </div>

              <div>
                <label className="block text-xs font-black text-(--text-secondary) uppercase tracking-wider mb-2">Description (Optional)</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange} rows="3" className="w-full px-5 py-3.5 bg-(--background) border-2 border-(--border)/60 rounded-2xl font-medium focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 text-(--text) resize-none transition-all placeholder:text-(--text-muted)/50" placeholder="Ingredients and delicious details..." />
              </div>

              <div className="flex items-center mt-2 bg-(--background) p-4 border border-(--border)/60 rounded-2xl">
                <input type="checkbox" id="is_available" name="is_available" checked={formData.is_available} onChange={handleInputChange} className="w-5 h-5 text-(--primary) bg-(--surface) border-2 border-(--border) rounded-md focus:ring-(--primary) focus:ring-offset-0 cursor-pointer transition-colors" />
                <label htmlFor="is_available" className="ml-3 block text-sm font-bold text-(--text) cursor-pointer select-none">Available for order</label>
              </div>

              <div className="pt-6 mt-8 border-t border-(--border)/60 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 rounded-2xl font-black text-(--text-secondary) bg-(--background) border border-(--border) hover:bg-(--surface-secondary) transition-colors active:scale-95">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-8 py-3.5 rounded-2xl font-black text-white bg-linear-to-r from-(--primary) to-emerald-600 hover:from-(--primary-hover) hover:to-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.2)] transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center min-w-35">
                  {isLoading ? <span className="animate-pulse">Saving...</span> : (editingItem ? 'Update Item' : 'Save Item')}
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