import { useMemo, useState, useEffect } from 'react'
import { Product } from './types'
import TabBar from './components/TabBar'
import Sidebar from './components/Sidebar'
import Home from './views/Home'
import ReportsView from './views/Reports'
import InventoryView from './views/Inventory'
import OrdersView from './views/Orders'
import PricingView from './views/Pricing'
import ScanView from './views/Scan'

export default function App() {
  const [stats, setStats] = useState<any | null>(null)
  const [products, setProducts] = useState<any[] | null>(null)
  const [orders, setOrders] = useState<any[] | null>(null)
  const [pricingItems, setPricingItems] = useState<any[] | null>(null)
  const [tab, setTab] = useState<'dashboard'|'reports'|'inventory'|'orders'|'pricing'|'scan'>('dashboard')
  const [toast, setToast] = useState<string | null>(null)
  const [scanResult, setScanResult] = useState<any | null>(null)
  const [scanPreview, setScanPreview] = useState<string | null>(null)
  const [scanLoading, setScanLoading] = useState<boolean>(false)
  const [scanSession, setScanSession] = useState<{id: number} | null>(null)
  const [folderFiles, setFolderFiles] = useState<File[]>([])
  const [currentFileIndex, setCurrentFileIndex] = useState<number>(0)

  const isAndroid = useMemo(()=>/Android/i.test(navigator.userAgent||''), [])

  const apiBase = useMemo(() => {
    const env = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined
    if (env) return env
    try {
      const loc = window.location
      // If served over HTTPS, use Vite proxy at /api to avoid mixed content
      if (loc.protocol === 'https:') {
        return '/api'
      }
      const url = new URL(loc.href)
      const port = url.port === '5173' ? '8000' : url.port
      url.port = port || '8000'
      url.pathname = ''
      return `${url.origin.replace(/:\\d+$/, ':' + (port || '8000'))}`
    } catch {
      return 'http://localhost:8000'
    }
  }, [])

  useEffect(()=>{ if(!toast) return; const t = setTimeout(()=> setToast(null), 2500); return ()=> clearTimeout(t) }, [toast])

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  useEffect(()=>{
    if (isAndroid && 'serviceWorker' in navigator && 'PushManager' in window) {
      const registerServiceWorkerAndSubscribe = async () => {
        try {
          const swRegistration = await navigator.serviceWorker.register('/sw.js');
          let subscription = await swRegistration.pushManager.getSubscription();

          if (subscription === null) {
            // VAPID public key - replace with your actual key
            const vapidPublicKey = 'BIPulh12xJ6cGo8iO0t2bA8_3-cAYCg3w_D3fPS2GBl1tS2kYjJzVzGjD_3-cAYCg3w_D3fPS2GBl1tS2kYjJzVzGj';
            const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

            subscription = await swRegistration.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: convertedVapidKey,
            });
          }

          await fetch(`${apiBase}/notifications/subscribe`, {
            method: 'POST',
            body: JSON.stringify(subscription),
            headers: {
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.error('Service Worker Error', error);
        }
      };

      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          registerServiceWorkerAndSubscribe();
        }
      });
    }
  }, [isAndroid, apiBase]);

  const loadStats = async () => { try { const r = await fetch(`${apiBase}/stats`); setStats(await r.json()) } catch {} }
  const loadProducts = async () => { try { const r = await fetch(`${apiBase}/products`); const d = await r.json(); setProducts(Array.isArray(d)? d : d.items||[]) } catch {} }
  const loadOrders = async () => { try { const r = await fetch(`${apiBase}/orders?detailed=1`); setOrders(await r.json()) } catch {} }
  const loadPricing = async () => { try { const r = await fetch(`${apiBase}/scans?limit=50`); const items = await r.json(); const details = await Promise.all((items||[]).slice(0,10).map((x:any)=> fetch(`${apiBase}/scans/${x.id}`).then(m=>m.json()).catch(()=>null))); setPricingItems(details.filter(Boolean)) } catch {} }

  const handleUpdateProduct = async (product: Product) => {
    try {
      const response = await fetch(`${apiBase}/products/${product.shoper_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(product),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update product');
      }
      setToast('Produkt zaktualizowany!');
      loadProducts();
    } catch (error) {
      console.error('Error updating product:', error);
      throw error;
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setScanPreview(URL.createObjectURL(file))
    setScanLoading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      if (scanSession) fd.append('session_id', String(scanSession.id))
      const res = await fetch(`${apiBase}/scan`, { method: 'POST', body: fd })
      const data = await res.json()
      if (res.ok) {
        setScanResult(data)
      } else {
        setToast(data.error || 'Scan failed')
      }
    } catch (err) {
      setToast('Network error during scan')
    } finally {
      setScanLoading(false)
    }
  }

  const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
      setFolderFiles(imageFiles);
      setCurrentFileIndex(0);
      if (imageFiles.length > 0) {
        scanFile(imageFiles[0]);
      }
    }
  };

  const scanFile = async (file: File) => {
    setScanPreview(URL.createObjectURL(file));
    setScanLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (scanSession) fd.append('session_id', String(scanSession.id));
      const res = await fetch(`${apiBase}/scan`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setScanResult(data);
      } else {
        setToast(data.error || 'Scan failed');
      }
    } catch (err) {
      setToast('Network error during scan');
    } finally {
      setScanLoading(false);
    }
  };

  const handleConfirmScan = async (
    formData: any, 
    imageInfo: { 
      primary: { source: string; url: string | null; file?: File | null; }; 
      additional: File[]; 
    }
  ) => {
    if (!scanResult?.scan_id || !scanResult.candidates || scanResult.candidates.length === 0) return;
    
    try {
      const data = new FormData();

      // 1. Append main form data as a JSON string
      data.append('data', JSON.stringify({
          scan_id: scanResult.scan_id,
          candidate_id: scanResult.candidates[0].id,
          detected: formData
      }));

      // 2. Append primary image
      data.append('primary_image_source', imageInfo.primary.source);
      if (imageInfo.primary.source === 'upload' && imageInfo.primary.file) {
          data.append('primary_image', imageInfo.primary.file);
      } else if (imageInfo.primary.url) {
          data.append('primary_image_url', imageInfo.primary.url);
      }

      // 3. Append additional images
      imageInfo.additional.forEach((file, index) => {
          data.append(`additional_image_${index}`, file);
      });

      const res = await fetch(`${apiBase}/scans/${scanResult.scan_id}/publish`, { 
          method: 'POST',
          body: data
      });

      const responseData = await res.json();
      if (res.ok) {
          setToast(`Opublikowano: ${responseData.shoper_id}`);
          // Reset for next scan
          setScanResult(null);
          setScanPreview(null);

          // If there are more files in the folder, scan the next one
          if (folderFiles.length > 0 && currentFileIndex < folderFiles.length - 1) {
            const nextIndex = currentFileIndex + 1;
            setCurrentFileIndex(nextIndex);
            scanFile(folderFiles[nextIndex]);
          } else {
            setFolderFiles([]);
            setCurrentFileIndex(0);
            // Optionally, show a session summary or completion message
            setToast('Skanowanie folderu zakończone!');
          }
      } else {
          const errorText = responseData.details?.text || responseData.error || 'Błąd podczas publikowania';
          setToast(errorText);
      }
    } catch (err) {
        console.error("Failed to publish scan in folder mode", err);
        setToast('Błąd sieci podczas publikowania');
    }
  };

  const startSession = async () => {
    try {
      const res = await fetch(`${apiBase}/sessions/start`, { method: 'POST' });
      const data = await res.json();
      setScanSession(data);
    } catch (err) {
      setToast('Failed to start session');
    }
  };

  const handleCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${apiBase}/import/inventory_csv`, { method: 'POST', body: fd });
      const data = await res.json();
      if (res.ok) {
        setToast(`Imported: ${data.created} created, ${data.updated} updated`);
      } else {
        setToast(data.error || 'CSV import failed');
      }
    } catch (err) {
      setToast('Network error during CSV import');
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <div className="font-display">
      <div className="flex">
        <Sidebar active={tab} onChange={(k)=>{ setTab(k as any); if(k==='dashboard') loadStats(); if(k==='inventory') loadProducts(); if(k==='pricing' && !pricingItems) loadPricing(); if(k==='orders' && !orders) loadOrders(); }} />
        <main className="relative flex-1 p-4 md:p-8 global-app-background">
          {isAndroid && (
            <img 
              src="/białe-male.png" 
              alt="Logo" 
              style={{ 
                position: 'absolute', 
                top: '16px', 
                right: '16px', 
                height: '28px', 
                zIndex: 10,
                filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.5))'
              }} 
            />
          )}
          {tab==='dashboard' && (<Home stats={stats} onNav={(k)=> setTab(k as any)} onRefresh={loadStats} />)}
          {tab==='reports' && (<ReportsView />)}
          {tab==='inventory' && (<InventoryView items={(products||[])} page={1} limit={100} hasNext={false} sort={'updated_at'} order={'asc'} onSearch={()=>{}} onSync={async ()=>{ await fetch(`${apiBase}/sync/shoper`, {method:'POST'}); setToast('Synchronizacja zakończona'); loadProducts(); }} onUpdate={handleUpdateProduct} />)}
          {tab==='orders' && (<OrdersView items={(orders||[])} />)}
          {tab==='pricing' && (<PricingView items={(pricingItems||[])} onRefresh={loadPricing} />)}
          {tab === 'scan' && (
            <ScanView
              session={scanSession}
              preview={scanPreview}
              loading={scanLoading}
              result={scanResult}
              selected={scanResult?.candidates?.[0]?.id || null}
              onFile={handleFileChange}
              onConfirm={handleConfirmScan}
              onFolderChange={handleFolderChange}
              onCsvUpload={handleCsvUpload}
              onStartSession={startSession}
              onPick={(id) => {
                if (scanResult) {
                  const updatedResult = { ...scanResult, candidates: scanResult.candidates.map(c => ({...c, chosen: c.id === id})) };
                  setScanResult(updatedResult);
                }
              }}
              onSubmit={() => {
                // This might be used for folder uploads later
              }}
            />
          )}
          {toast && <div style={{ position: 'fixed', left: '50%', transform: 'translateX(-50%)', bottom: 18, background: '#111', color: '#fff', borderRadius: 10, border: '1px solid #333', padding: '10px 14px' }}>{toast}</div>}
        </main>
      </div>

      {/* Mobile bottom navigation (Android only) */}
      <div className="md:hidden" style={{ display: isAndroid ? 'block' : 'none' }}>
        <TabBar
          tabs={[
            { key: 'dashboard', icon: 'monitoring', label: 'Statystyki' },
            { key: 'scan', icon: 'qr_code_scanner', label: 'Skanuj' },
            { key: 'pricing', icon: 'sell' },
            { key: 'inventory', icon: 'visibility' },
          ]}
          active={tab}
          onChange={(k)=>{ setTab(k as any); if(k==='dashboard') loadStats(); if(k==='inventory') loadProducts(); if(k==='pricing' && !pricingItems) loadPricing(); }}
        />
      </div>
    </div>
  )
}
