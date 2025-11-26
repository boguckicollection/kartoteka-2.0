import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ThermalReceipt } from '../components/ThermalReceipt';

type Props = { 
  items?: any[];
  apiBase?: string;
}

// Skeleton Loading Component
function OrderSkeleton() {
  return (
    <div className="rounded-xl p-4 bg-[#1f2937] border border-white/10 animate-pulse">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gray-700"></div>
          <div>
            <div className="h-5 w-32 bg-gray-700 rounded mb-2"></div>
            <div className="h-4 w-24 bg-gray-800 rounded"></div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="h-6 w-20 bg-gray-700 rounded"></div>
          <div className="w-6 h-6 bg-gray-800 rounded"></div>
        </div>
      </div>
      <div className="flex justify-between items-center pt-3 border-t border-white/5">
        <div className="h-4 w-24 bg-gray-800 rounded"></div>
        <div className="h-5 w-20 bg-gray-700 rounded"></div>
      </div>
    </div>
  );
}

// Loading Spinner Component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center gap-2 text-gray-400">
      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      <span className="text-sm">Ładowanie...</span>
    </div>
  );
}

export default function OrdersView({ items: initialItems, apiBase }: Props) {
  const [orders, setOrders] = useState<any[]>(initialItems || []);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!initialItems);
  const [hasMore, setHasMore] = useState(true);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);
  const [orderDetails, setOrderDetails] = useState<any | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);
  const observerTarget = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const receiptElement = receiptRef.current;
    if (!receiptElement) return;

    const printWindow = window.open('', '_blank', 'width=227,height=302');
    if (!printWindow) {
      alert('Proszę zezwolić na wyskakujące okienka dla tej strony');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Paragon #${selected?.id || ''}</title>
          <style>
            @page {
              size: 60mm 80mm;
              margin: 0;
            }
            @media print {
              html, body {
                width: 60mm;
                height: 80mm;
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: Consolas, Monaco, "Courier New", monospace;
              font-size: 9pt;
              line-height: 1.3;
              background: white;
              color: black;
            }
          </style>
        </head>
        <body>
          ${receiptElement.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();

    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 100);
    };
  };

  // Load more orders with pagination
  const loadMoreOrders = useCallback(async () => {
    if (loading || !hasMore || !apiBase) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${apiBase}/orders?page=${page}&limit=20&detailed=0`);
      const newOrders = await res.json();
      
      if (newOrders.length < 20) {
        setHasMore(false);
      }
      
      setOrders(prev => [...prev, ...newOrders]);
      setPage(prev => prev + 1);
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setLoading(false);
      setInitialLoading(false);
    }
  }, [page, loading, hasMore, apiBase]);

  // Initial load
  useEffect(() => {
    if (apiBase && !initialItems && initialLoading) {
      loadMoreOrders();
    } else if (initialItems) {
      setInitialLoading(false);
    }
  }, []);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMoreOrders();
        }
      },
      { threshold: 0.5 }
    );
    
    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }
    
    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [loadMoreOrders, hasMore, loading]);

  const onOpen = async (o: any) => {
    setSelected(o);
    setOpen(true);
    
    // Lazy load full details if not already loaded
    if (!o.items || o.items.length === 0) {
      setDetailsLoading(true);
      try {
        const res = await fetch(`${apiBase}/orders?detailed=1&limit=1&page=1`);
        const allOrders = await res.json();
        const fullOrder = allOrders.find((ord: any) => ord.id === o.id);
        if (fullOrder) {
          setOrderDetails(fullOrder);
        } else {
          setOrderDetails(o);
        }
      } catch (err) {
        console.error('Failed to load order details', err);
        setOrderDetails(o);
      } finally {
        setDetailsLoading(false);
      }
    } else {
      setOrderDetails(o);
    }
  };

  const onClose = () => {
    setOpen(false);
    setTimeout(() => {
      setSelected(null);
      setOrderDetails(null);
    }, 250);
  };

  const statusLabel = (o: any) => {
    const t = o?.status?.type;
    if (o?.status?.name) return o.status.name;
    if (t === 1) return 'Nowe';
    if (t === 2) return 'W realizacji';
    if (t === 3) return 'Zakończone';
    if (t === 4) return 'Niekompletne';
    return '—';
  };

  const statusColor = (o: any) => {
    const c = o?.status?.color;
    if (c) return c;
    const t = o?.status?.type;
    if (t === 1) return '#3498DB';
    if (t === 2) return '#F39C12';
    if (t === 3) return '#2ECC71';
    if (t === 4) return '#E74C3C';
    return '#6B7280';
  };

  return (
    <div className="font-display">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-800 px-2 md:px-6 py-3">
        <div className="flex items-center gap-3 text-white">
          <span className="material-symbols-outlined text-primary">receipt_long</span>
          <h2 className="text-lg font-bold">Zamówienia</h2>
          {orders.length > 0 && (
            <span className="text-sm text-gray-400">({orders.length})</span>
          )}
        </div>
      </header>

      <main className="p-4 md:p-6">
        {initialLoading ? (
          <div className="grid gap-3">
            {Array(5).fill(0).map((_, i) => <OrderSkeleton key={i} />)}
          </div>
        ) : !orders.length ? (
          <div className="rounded-xl p-6 bg-[#1f2937] border border-white/10 text-gray-400 text-center">
            <span className="material-symbols-outlined text-5xl text-gray-600 mb-3">receipt_long</span>
            <p>Brak zamówień.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-3">
              {orders.map((o: any, i: number) => (
                <div 
                  key={`${o.id}-${i}`} 
                  className="rounded-xl p-4 bg-[#1f2937] border border-white/10 text-white cursor-pointer transition-all duration-200 hover:bg-white/5 hover:shadow-lg hover:scale-[1.01] hover:border-primary/30"
                  onClick={() => onOpen(o)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <span className="material-symbols-outlined text-primary text-sm">receipt_long</span>
                      </div>
                      <div>
                        <div className="font-semibold text-white">#{o.id}</div>
                        <div className="text-gray-400 text-xs">
                          {o.date ? new Date(o.date).toLocaleString('pl-PL', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : '-'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span 
                        className="px-2 py-1 rounded text-xs font-medium whitespace-nowrap" 
                        style={{ background: statusColor(o) + '33', color: statusColor(o) }}
                      >
                        {statusLabel(o)}
                      </span>
                      <span className="material-symbols-outlined text-gray-400">chevron_right</span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <div className="text-gray-300 text-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">shopping_cart</span>
                      {o.items_count ?? 0} pozycji
                    </div>
                    <div className="text-primary font-bold">
                      {o.total != null ? `${Number(String(o.total).replace(',', '.')).toFixed(2)} PLN` : '-'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Infinite scroll trigger + loading indicator */}
            <div ref={observerTarget} className="h-20 flex items-center justify-center mt-4">
              {loading && <LoadingSpinner />}
              {!hasMore && orders.length > 0 && (
                <p className="text-gray-500 text-sm">Brak więcej zamówień</p>
              )}
            </div>
          </>
        )}
      </main>

      {/* Right drawer - Enhanced with lazy loading */}
      <div className={`fixed inset-0 z-50 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div 
          className={`absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`} 
          onClick={onClose} 
        />
        <div className={`absolute right-0 top-0 h-full w-full md:w-[520px] bg-[#111418] border-l border-white/10 shadow-2xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'} flex flex-col`}>
          <div className="flex items-center justify-between p-4 border-b border-white/10 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="text-white font-semibold">Szczegóły zamówienia {selected ? `#${selected.id}` : ''}</div>
              {!!selected && (
                <span 
                  className="text-xs font-medium px-2 py-1 rounded-full" 
                  style={{ background: statusColor(selected) + '33', color: statusColor(selected) }}
                >
                  {statusLabel(selected)}{selected?.delivery_date ? ' · nadane' : ''}
                </span>
              )}
            </div>
            <button 
              className="text-white/80 hover:text-white transition-colors" 
              onClick={onClose}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto flex-grow">
            {detailsLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <LoadingSpinner />
                <p className="text-gray-400 text-sm">Ładowanie szczegółów...</p>
              </div>
            ) : !orderDetails ? null : (
              <div className="grid gap-4">
                {/* Buyer */}
                <div className="rounded-xl p-4 bg-[#1f2937] border border-white/10">
                  <div className="text-white font-semibold mb-2 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">person</span>
                    Kupujący
                  </div>
                  <div className="text-gray-300 text-sm">{orderDetails?.buyer?.firstname || ''} {orderDetails?.buyer?.lastname || ''}</div>
                  <div className="text-gray-400 text-sm">{orderDetails?.buyer?.email || ''}{orderDetails?.buyer?.phone ? ` · ${orderDetails?.buyer?.phone}` : ''}</div>
                  <div className="text-gray-400 text-sm">{[orderDetails?.buyer?.street1, orderDetails?.buyer?.postcode, orderDetails?.buyer?.city, orderDetails?.buyer?.country].filter(Boolean).join(', ')}</div>
                </div>

                {/* Items */}
                <div className="rounded-xl p-4 bg-[#1f2937] border border-white/10">
                  <div className="text-white font-semibold mb-3 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">shopping_bag</span>
                    Pozycje
                  </div>
                  <div className="grid gap-3">
                    {(orderDetails.items || []).map((it: any, idx: number) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-black/20 hover:bg-black/30 transition-colors">
                        {it.image ? (
                          <img src={it.image} alt={it.name || ''} className="w-12 h-12 object-cover rounded border border-white/10" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-white/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-gray-600 text-sm">image</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white truncate">{it.name || '-'}</div>
                          <div className="text-gray-400 text-xs">{it.code || ''}</div>
                        </div>
                        <div className="text-gray-300 text-sm">x{it.quantity ?? '-'}</div>
                        <div className="text-white text-sm w-24 text-right">{it.price != null ? `${Number(it.price).toFixed(2)} PLN` : '-'}</div>
                        <div className="text-gray-300 text-sm w-28 text-right">{(it.price != null && it.quantity != null) ? `${(Number(it.price) * Number(it.quantity)).toFixed(2)} PLN` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Footer total */}
          <div className="flex items-center justify-between p-4 border-t border-white/10 bg-[#0a0c0e]">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-lg">print</span>
              Drukuj
            </button>
            <div className="text-right">
              <div className="text-gray-300 text-sm">Wartość zamówienia:</div>
              <div className="text-white font-semibold text-lg">{selected?.total != null ? `${Number(String(selected.total).replace(',', '.')).toFixed(2)} PLN` : '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden receipt for printing */}
      <div className="hidden">
        {selected && <ThermalReceipt ref={receiptRef} order={selected} />}
      </div>
    </div>
  );
}
