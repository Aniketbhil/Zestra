import { QrCode, Search, UtensilsCrossed } from 'lucide-react';

const CustomerHome = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] text-center max-w-lg mx-auto space-y-8 px-4">
      <div className="relative">
        <div className="absolute inset-0 bg-(--primary)/20 blur-3xl rounded-full"></div>
        <div className="w-24 h-24 bg-(--surface) border-2 border-(--primary)/20 rounded-full flex items-center justify-center relative z-10 shadow-xl">
          <UtensilsCrossed className="w-10 h-10 text-(--primary)" />
        </div>
      </div>
      
      <div>
        <h2 className="text-3xl font-extrabold text-(--text) mb-2">Ready to order?</h2>
        <p className="text-(--text-secondary) text-lg leading-relaxed">
          Scan a Zestra QR code at your table to instantly view the menu, get AI recommendations, and place your order.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full mt-8">
        <div className="bg-(--surface) p-6 rounded-[20px] border border-(--border) shadow-sm flex flex-col items-center text-center">
          <QrCode className="w-8 h-8 text-(--primary) mb-3" />
          <h3 className="font-bold text-(--text)">Scan a QR Code</h3>
          <p className="text-sm text-(--text-muted) mt-1">Found on your restaurant table</p>
        </div>
        <div className="bg-(--surface) p-6 rounded-[20px] border border-(--border) shadow-sm flex flex-col items-center text-center">
          <Search className="w-8 h-8 text-blue-500 mb-3" />
          <h3 className="font-bold text-(--text)">Track Order</h3>
          <p className="text-sm text-(--text-muted) mt-1">View your active kitchen status</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerHome;