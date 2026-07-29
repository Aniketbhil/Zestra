import { useEffect, useState } from 'react';
import { Printer, Download, Link as LinkIcon, Loader2, Store, Copy } from 'lucide-react';
import api from '../../services/api';
import useRestaurantStore from '../../store/dashboard/useRestaurantStore';
import toast from 'react-hot-toast';

const QRCode = () => {
  const { restaurant } = useRestaurantStore();
  const [qrData, setQrData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchQRCode = async () => {
      if (!restaurant?.slug) return;
      try {
        const response = await api.get(`/restaurants/${restaurant.slug}/qrcode`);
        setQrData(response.data);
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to load QR Code.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchQRCode();
  }, [restaurant?.slug]);

  // Ensure we append the data URI prefix if the backend only sends raw base64
  const imageSrc = qrData?.qr_code_base64?.startsWith('data:image') 
    ? qrData.qr_code_base64 
    : `data:image/png;base64,${qrData?.qr_code_base64}`;

  // --- BULLETPROOF IFRAME PRINT FUNCTION (Bypasses Pop-up Blockers) ---
  const handlePrintPDF = () => {
    if (!qrData) return;
    
    // Create a hidden iframe in the actual document
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);

    // Write ONLY the Restaurant Name and QR Code into the iframe
    iframe.contentDocument.write(`
      <html>
        <head>
          <title>${restaurant?.name} - QR Code</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              font-family: system-ui, -apple-system, sans-serif;
              text-align: center;
            }
            h1 { 
              font-size: 3rem; 
              margin-bottom: 2rem; 
              color: #000; 
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            img { 
              width: 400px; 
              height: 400px; 
              object-fit: contain; 
            }
          </style>
        </head>
        <body>
          <h1>${restaurant?.name || 'Scan to Order'}</h1>
          <img src="${imageSrc}" />
        </body>
      </html>
    `);
    
    iframe.contentDocument.close();

    // Give the image 250ms to load, then trigger the print dialog inside the iframe
    setTimeout(() => {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
      
      // Clean up the iframe from the document after printing
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 1000);
    }, 250);
  };

  // --- DOWNLOAD PNG FUNCTION (Untouched - Works Perfectly) ---
  const handleDownloadPNG = () => {
    if (!qrData) return;
    const link = document.createElement('a');
    link.href = imageSrc;
    link.download = `${restaurant?.slug || 'restaurant'}-qr.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyLink = () => {
    if (qrData?.menu_url) {
      navigator.clipboard.writeText(qrData.menu_url);
      toast.success("Menu link copied to clipboard!");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center font-sans">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-20 h-20 bg-linear-to-br from-(--primary)/20 to-(--primary)/5 rounded-3xl flex items-center justify-center mb-6 shadow-inner border border-(--primary)/10 relative">
            <div className="absolute inset-0 border-4 border-(--primary) border-t-transparent rounded-3xl animate-spin"></div>
            <Store className="w-8 h-8 text-(--primary) animate-pulse" />
          </div>
          <h3 className="text-2xl font-black text-(--text) mb-2 tracking-tight">Generating Code...</h3>
          <p className="text-(--text-secondary) font-medium">Preparing your digital menu access.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 px-1 font-sans">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black text-(--text) tracking-tight">Your Digital QR Menu</h1>
        <p className="text-(--text-secondary) font-medium text-sm mt-1.5">Place this on your tables for customers to scan and order instantly.</p>
      </div>

      {/* Main Glassmorphism Bento Card */}
      <div className="mt-8 bg-(--surface) rounded-4xl border border-(--border)/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-8 sm:p-14 flex flex-col items-center text-center relative overflow-hidden">
        
        {/* Ambient Glows */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-(--primary)/5 blur-[100px] rounded-full pointer-events-none -mr-20 -mt-20"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none -ml-20 -mb-20"></div>

        {/* Icon Header */}
        <div className="w-20 h-20 bg-linear-to-br from-(--primary)/20 to-emerald-500/10 text-(--primary) rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-(--primary)/20 relative z-10">
          <Store className="w-10 h-10" />
        </div>
        
        <h2 className="text-3xl font-black text-(--text) mb-3 tracking-tight relative z-10">Ready to Print</h2>
        <p className="text-(--text-secondary) font-medium text-base mb-10 max-w-lg relative z-10 leading-relaxed">
          Customers simply scan this code with their phone camera to view your live menu, place orders, and track their food status in real-time. No app download required.
        </p>

        {/* QR Code Display Container */}
        <div className="p-6 bg-white rounded-4xl shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 mb-12 relative z-10 group transition-transform duration-500 hover:scale-105">
          <img 
            src={imageSrc} 
            alt="Restaurant QR Code" 
            className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg mb-12 relative z-10">
          <button 
            onClick={handlePrintPDF}
            className="w-full sm:w-auto px-8 py-4 bg-linear-to-r from-(--primary) to-emerald-600 hover:from-(--primary-hover) hover:to-emerald-700 text-white font-black text-base rounded-2xl transition-all duration-300 flex justify-center items-center gap-2 shadow-[0_8px_20px_rgba(16,185,129,0.25)] active:scale-95 hover:-translate-y-1 border border-emerald-400/50"
          >
            <Printer className="w-5 h-5" /> Print QR
          </button>
          
          <button 
            onClick={handleDownloadPNG}
            className="w-full sm:w-auto px-8 py-4 bg-(--background) hover:bg-(--surface-secondary) border border-(--border)/80 text-(--text) font-black text-base rounded-2xl transition-all duration-300 flex justify-center items-center gap-2 active:scale-95 hover:-translate-y-1 hover:shadow-sm"
          >
            <Download className="w-5 h-5" /> Download PNG
          </button>
        </div>

        {/* Direct Link Section - Premium Snippet Style */}
        <div className="w-full max-w-lg bg-(--background)/50 backdrop-blur-sm p-5 rounded-3xl border border-(--border)/60 text-left relative z-10 shadow-inner">
          <label className="block text-[10px] font-black text-(--text-secondary) uppercase tracking-widest mb-3">Direct Menu Link</label>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-(--surface) border border-(--border)/60 px-4 py-3.5 rounded-2xl truncate text-sm font-mono font-medium text-(--text-secondary) shadow-sm">
              {qrData?.menu_url}
            </div>
            <button 
              onClick={handleCopyLink}
              className="p-3.5 bg-(--surface) hover:bg-(--primary)/10 border border-(--border)/60 hover:border-(--primary)/30 rounded-2xl text-(--text-secondary) hover:text-(--primary) transition-all duration-300 shrink-0 shadow-sm active:scale-95"
              title="Copy Link"
            >
              <Copy className="w-5 h-5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default QRCode;