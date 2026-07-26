import { useEffect } from 'react';
import { Download, Printer, Share2 } from 'lucide-react';
import useRestaurantStore from '../../store/dashboard/useRestaurantStore';

const QrCode = () => {
  const { qrData, fetchQrCode, isLoading } = useRestaurantStore();

  useEffect(() => {
    fetchQrCode();
  }, [fetchQrCode]);

  const handleDownload = () => {
    if (!qrData) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${qrData.qr_code_base64}`;
    link.download = 'zestra-menu-qr.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Your Digital QR Menu</h1>
        <p className="text-(--text-secondary) text-sm mt-1">Place this on your tables for customers to scan and order instantly.</p>
      </div>

      <div className="bg-(--surface) rounded-[20px] border border-(--border) p-8 shadow-sm flex flex-col md:flex-row items-center gap-12">
        
        {/* QR Display Area */}
        <div className="shrink-0 bg-white p-4 rounded-2xl shadow-[0_8px_24px_rgba(15,23,42,0.08)] border border-(--border)">
          {isLoading || !qrData ? (
            <div className="w-48 h-48 bg-(--surface-secondary) animate-pulse rounded-xl flex items-center justify-center text-(--text-muted) text-sm text-center px-4">
              Generating your unique QR Code...
            </div>
          ) : (
            <img 
              src={`data:image/png;base64,${qrData.qr_code_base64}`} 
              alt="Restaurant Menu QR Code" 
              className="w-48 h-48 object-contain"
            />
          )}
        </div>

        {/* Actions Area */}
        <div className="flex-1 space-y-6 w-full text-center md:text-left">
          <div>
            <h3 className="text-lg font-bold text-(--text)">Ready to Print</h3>
            <p className="text-(--text-secondary) mt-2 text-sm leading-relaxed">
              Customers simply scan this code with their phone camera to view your live menu, place orders, and track their food status in real-time. No app download required.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-start">
            <button 
              onClick={handlePrint}
              disabled={!qrData}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-(--primary) hover:bg-(--primary-hover) text-white rounded-[14px] font-semibold transition-colors shadow-sm shadow-(--primary)/25 disabled:opacity-50"
            >
              <Printer className="w-4 h-4" /> Print QR
            </button>
            
            <button 
              onClick={handleDownload}
              disabled={!qrData}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-(--surface) hover:bg-(--surface-secondary) text-(--text) border border-(--border) rounded-[14px] font-semibold transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Download PNG
            </button>
          </div>

          {qrData && (
            <div className="pt-4 border-t border-(--border)">
              <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wider mb-2">Direct Menu Link</p>
              <div className="flex items-center gap-2 bg-(--background) border border-(--border) p-2 rounded-xl">
                <input 
                  type="text" 
                  readOnly 
                  value={qrData.menu_url} 
                  className="bg-transparent border-none outline-none flex-1 text-sm text-(--text-muted) px-2"
                />
                <button 
                  onClick={() => navigator.clipboard.writeText(qrData.menu_url)}
                  className="p-2 bg-(--surface) border border-(--border) hover:bg-(--surface-secondary) rounded-lg transition-colors text-(--text)"
                  title="Copy Link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default QrCode;