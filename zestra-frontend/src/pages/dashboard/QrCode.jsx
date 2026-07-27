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
      <div className="flex h-[calc(100vh-8rem)] items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-(--primary) animate-spin mb-4" />
          <p className="text-(--text-muted) font-medium">Generating your QR Code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 px-4 sm:px-6">
      
      <div>
        <h1 className="text-2xl font-bold text-(--text)">Your Digital QR Menu</h1>
        <p className="text-(--text-secondary) text-sm mt-1">Place this on your tables for customers to scan and order instantly.</p>
      </div>

      <div className="mt-8 bg-(--surface) rounded-4xl border border-(--border) shadow-sm p-8 sm:p-12 flex flex-col items-center text-center">
        
        <div className="w-16 h-16 bg-(--primary)/10 text-(--primary) rounded-2xl flex items-center justify-center mb-6">
          <Store className="w-8 h-8" />
        </div>
        
        <h2 className="text-xl font-bold text-(--text) mb-2">Ready to Print</h2>
        <p className="text-(--text-secondary) mb-8 max-w-md">
          Customers simply scan this code with their phone camera to view your live menu, place orders, and track their food status in real-time. No app download required.
        </p>

        {/* QR Code Display Container */}
        <div className="p-4 bg-white rounded-3xl shadow-sm border-2 border-dashed border-gray-200 mb-8 inline-block">
          <img 
            src={imageSrc} 
            alt="Restaurant QR Code" 
            className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-lg mb-8">
          <button 
            onClick={handlePrintPDF}
            className="w-full sm:w-auto px-8 py-3.5 bg-(--primary) hover:bg-(--primary-hover) text-white font-bold rounded-[14px] transition-all flex justify-center items-center gap-2 shadow-lg shadow-(--primary)/25 active:scale-95"
          >
            <Printer className="w-5 h-5" /> Print QR
          </button>
          
          <button 
            onClick={handleDownloadPNG}
            className="w-full sm:w-auto px-8 py-3.5 bg-(--surface-secondary) hover:bg-(--border) border border-(--border) text-(--text) font-bold rounded-[14px] transition-all flex justify-center items-center gap-2 active:scale-95"
          >
            <Download className="w-5 h-5" /> Download PNG
          </button>
        </div>

        {/* Direct Link Section */}
        <div className="w-full max-w-lg bg-(--background) p-4 rounded-[20px] border border-(--border) text-left">
          <label className="block text-xs font-bold text-(--text-muted) uppercase tracking-wider mb-2">Direct Menu Link</label>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-(--surface) border border-(--border) px-4 py-3 rounded-xl truncate text-sm font-medium text-(--text-secondary)">
              {qrData?.menu_url}
            </div>
            <button 
              onClick={handleCopyLink}
              className="p-3 bg-(--surface-secondary) hover:bg-(--border) border border-(--border) rounded-xl text-(--text) transition-colors shrink-0"
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