import { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Search, X, Package, AlertTriangle } from 'lucide-react';
import useInventoryStore from '../../store/dashboard/useInventoryStore';

const Inventory = () => {
  const { inventoryItems, isLoading, fetchInventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventoryStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: '',
    low_stock_threshold: ''
  });

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ name: '', quantity: '', unit: '', low_stock_threshold: '' });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      low_stock_threshold: item.low_stock_threshold
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      quantity: parseFloat(formData.quantity),
      unit: formData.unit,
      low_stock_threshold: parseFloat(formData.low_stock_threshold)
    };

    let success;
    if (editingItem) {
      success = await updateInventoryItem(editingItem.id, payload);
    } else {
      success = await addInventoryItem(payload);
    }
    
    if (success) {
      setIsModalOpen(false);
      setEditingItem(null);
    }
  };

  const filteredItems = inventoryItems.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8 font-sans pb-8">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 px-1">
        <div>
          <h1 className="text-3xl font-black text-(--text) tracking-tight">Inventory Tracking</h1>
          <p className="text-(--text-secondary) font-medium text-sm mt-1.5">Monitor your ingredients and stock levels</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-4">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search inventory..." 
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

      {/* Inventory Table - Premium Bento Wrapper */}
      <div className="bg-(--surface) rounded-4xl border border-(--border)/60 overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-(--border) scrollbar-track-transparent">
          <table className="w-full text-left border-collapse min-w-175">
            <thead>
              <tr className="bg-(--surface-secondary)/40 border-b border-(--border)/60">
                <th className="px-6 py-5 text-xs font-black text-(--text-secondary) uppercase tracking-widest">Ingredient Name</th>
                <th className="px-6 py-5 text-xs font-black text-(--text-secondary) uppercase tracking-widest">Current Stock</th>
                <th className="px-6 py-5 text-xs font-black text-(--text-secondary) uppercase tracking-widest">Status</th>
                <th className="px-6 py-5 text-xs font-black text-(--text-secondary) uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)/50">
              {isLoading && inventoryItems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-(--text-muted)">
                      <div className="w-10 h-10 border-4 border-(--primary) border-t-transparent rounded-full animate-spin mb-4 shadow-[0_0_15px_var(--primary)]"></div>
                      <span className="font-bold tracking-tight">Loading inventory...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-16 text-center">
                     <div className="flex flex-col items-center justify-center text-(--text-muted) opacity-60">
                        <Package className="w-12 h-12 mb-3 opacity-30" />
                        <span className="font-bold tracking-tight">No items found. Track your first ingredient!</span>
                     </div>
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const qty = parseFloat(item.quantity);
                  const threshold = parseFloat(item.low_stock_threshold);
                  const isLowStock = qty <= threshold;

                  return (
                    <tr key={item.id} className="hover:bg-(--surface-secondary)/40 transition-colors group">
                      <td className="px-6 py-4 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-[14px] bg-(--surface-secondary) border border-(--border)/60 flex items-center justify-center text-(--text-muted) shadow-sm group-hover:scale-105 transition-transform">
                          <Package className="w-5 h-5 opacity-70" />
                        </div>
                        <span className="font-black text-(--text) tracking-tight text-base">{item.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-black text-lg text-(--text)">{qty}</span> <span className="text-(--text-secondary) font-bold text-sm ml-1">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 border border-amber-200 shadow-sm">
                            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-sm">
                            In Stock
                          </span>
                        )}
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
                            onClick={() => deleteInventoryItem(item.id)}
                            className="p-2.5 text-(--text-secondary) hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all active:scale-95"
                            title="Delete Item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
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
              <h2 className="text-xl font-black text-(--text) tracking-tight">{editingItem ? 'Update Stock' : 'Add Ingredient'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full bg-(--background) border border-(--border) text-(--text-muted) hover:text-(--text) transition-colors active:scale-95">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto scrollbar-thin">
              <div>
                <label className="block text-xs font-black text-(--text-secondary) uppercase tracking-wider mb-2">Ingredient Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-(--background) border-2 border-(--border)/60 rounded-2xl font-medium focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 text-(--text) transition-all placeholder:text-(--text-muted)/50" placeholder="e.g. Tomato Paste" />
              </div>
              
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-black text-(--text-secondary) uppercase tracking-wider mb-2">Current Quantity</label>
                  <input required type="number" step="0.01" min="0" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-(--background) border-2 border-(--border)/60 rounded-2xl font-black text-lg focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 text-(--primary) transition-all placeholder:text-(--text-muted)/50 placeholder:font-medium placeholder:text-base" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-xs font-black text-(--text-secondary) uppercase tracking-wider mb-2">Unit</label>
                  <input required type="text" name="unit" value={formData.unit} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-(--background) border-2 border-(--border)/60 rounded-2xl font-medium focus:outline-none focus:border-(--primary) focus:ring-4 focus:ring-(--primary)/10 text-(--text) transition-all placeholder:text-(--text-muted)/50" placeholder="e.g. kg, liters, pcs" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-(--text-secondary) uppercase tracking-wider mb-2">Low Stock Threshold</label>
                <input required type="number" step="0.01" min="0" name="low_stock_threshold" value={formData.low_stock_threshold} onChange={handleInputChange} className="w-full px-5 py-3.5 bg-(--background) border-2 border-(--border)/60 rounded-2xl font-black text-lg focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 text-amber-600 transition-all placeholder:text-(--text-muted)/50 placeholder:font-medium placeholder:text-base" placeholder="Alert below..." />
              </div>

              <div className="pt-6 mt-8 border-t border-(--border)/60 flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 rounded-2xl font-black text-(--text-secondary) bg-(--background) border border-(--border) hover:bg-(--surface-secondary) transition-colors active:scale-95">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-8 py-3.5 rounded-2xl font-black text-white bg-linear-to-r from-(--primary) to-emerald-600 hover:from-(--primary-hover) hover:to-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.2)] transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center min-w-35">
                  {isLoading ? <span className="animate-pulse">Saving...</span> : (editingItem ? 'Update Stock' : 'Save Item')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;