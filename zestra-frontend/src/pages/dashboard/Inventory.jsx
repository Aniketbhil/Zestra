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
    <div className="space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text)">Inventory Tracking</h1>
          <p className="text-(--text-secondary) text-sm mt-1">Monitor your ingredients and stock levels</p>
        </div>
        
        <div className="flex w-full sm:w-auto items-center gap-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-(--text-muted)" />
            <input 
              type="text" 
              placeholder="Search inventory..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-(--surface) border border-(--border) rounded-[14px] text-sm focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text)"
            />
          </div>
          <button 
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 bg-(--primary) hover:bg-(--primary-hover) text-white rounded-[14px] font-semibold text-sm transition-colors whitespace-nowrap shadow-sm shadow-(--primary)/25"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-(--surface) rounded-[20px] border border-(--border) overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-(--surface-secondary) border-b border-(--border)">
                <th className="px-6 py-4 text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">Ingredient Name</th>
                <th className="px-6 py-4 text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-4 text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-semibold text-(--text-secondary) uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading && inventoryItems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-(--text-muted)">Loading inventory...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-8 text-center text-(--text-muted)">No items found. Track your first ingredient!</td>
                </tr>
              ) : (
                filteredItems.map(item => {
                  const qty = parseFloat(item.quantity);
                  const threshold = parseFloat(item.low_stock_threshold);
                  const isLowStock = qty <= threshold;

                  return (
                    <tr key={item.id} className="hover:bg-(--surface-secondary)/50 transition-colors">
                      <td className="px-6 py-4 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-(--surface-secondary) border border-(--border) flex items-center justify-center text-(--text-muted)">
                          <Package className="w-5 h-5" />
                        </div>
                        <span className="font-semibold text-(--text)">{item.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-bold text-(--text)">{qty}</span> <span className="text-(--text-secondary) text-sm">{item.unit}</span>
                      </td>
                      <td className="px-6 py-4">
                        {isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#FEF3C7] text-[#F59E0B] border border-[#F59E0B]/20">
                            <AlertTriangle className="w-3.5 h-3.5" /> Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-[#DCFCE7] text-[#22C55E]">
                            In Stock
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button 
                          onClick={() => handleOpenEdit(item)}
                          className="p-2 text-(--text-muted) hover:text-(--primary) hover:bg-(--primary)/10 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => deleteInventoryItem(item.id)}
                          className="p-2 text-(--text-muted) hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-(--surface) w-full max-w-md rounded-3xl shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-(--border) flex items-center justify-between shrink-0">
              <h2 className="text-lg font-bold text-(--text)">{editingItem ? 'Update Stock' : 'Add Ingredient'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-(--text-muted) hover:text-(--text) transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1">Ingredient Name</label>
                <input required type="text" name="name" value={formData.name} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text)" placeholder="e.g. Tomato Paste" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-(--text-secondary) mb-1">Current Quantity</label>
                  <input required type="number" step="0.01" min="0" name="quantity" value={formData.quantity} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text)" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-(--text-secondary) mb-1">Unit</label>
                  <input required type="text" name="unit" value={formData.unit} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text)" placeholder="e.g. kg, liters, pcs" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-(--text-secondary) mb-1">Low Stock Warning Threshold</label>
                <input required type="number" step="0.01" min="0" name="low_stock_threshold" value={formData.low_stock_threshold} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-(--background) border border-(--border) rounded-[14px] focus:outline-none focus:border-(--primary) focus:ring-2 focus:ring-(--primary)/20 text-(--text)" placeholder="Alert me when stock falls below..." />
              </div>

              <div className="pt-4 mt-6 border-t border-(--border) flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-[14px] font-semibold text-(--text-secondary) hover:bg-(--surface-secondary) transition-colors">Cancel</button>
                <button type="submit" disabled={isLoading} className="px-5 py-2.5 rounded-[14px] font-semibold text-white bg-(--primary) hover:bg-(--primary-hover) shadow-sm shadow-(--primary)/25 transition-colors disabled:opacity-70">
                  {isLoading ? 'Saving...' : (editingItem ? 'Update Stock' : 'Save Item')}
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