import React, { useState, useRef } from 'react';
import { useReactToPrint } from 'react-to-print';
import { OrderReceipt } from '../components/OrderReceipt';

type Props = { items: any[] }

export default function OrdersView({ items }: Props){
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<any | null>(null)
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    content: () => receiptRef.current,
  });

  const onOpen = (o: any) => { setSelected(o); setOpen(true) }
  const onClose = () => { setOpen(false); setTimeout(()=>setSelected(null), 250) }
  const statusLabel = (o: any) => {
    const t = o?.status?.type
    if (o?.status?.name) return o.status.name
    if (t === 1) return 'Nowe'
    if (t === 2) return 'W realizacji'
    if (t === 3) return 'Zakończone'
    if (t === 4) return 'Niekompletne'
    return '—'
  }
  const statusColor = (o: any) => {
    const c = o?.status?.color
    if (c) return c
    const t = o?.status?.type
    if (t === 1) return '#3498DB'
    if (t === 2) return '#F39C12'
    if (t === 3) return '#2ECC71'
    if (t === 4) return '#E74C3C'
    return '#6B7280'
  }
  return (
    <div className="font-display">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-800 px-2 md:px-6 py-3">
        <div className="flex items-center gap-3 text-white">
          <span className="material-symbols-outlined text-primary">receipt_long</span>
          <h2 className="text-lg font-bold">Zamówienia</h2>
        </div>
      </header>
      <main className="p-4 md:p-6">
        {!items.length ? (
          <div className="rounded-xl p-6 bg-[#1f2937] border border-white/10 text-gray-400">Brak danych zamówień.</div>
        ) : (
          <div className="grid gap-3">
            {items.map((o:any, i:number)=>(
              <div key={i} className="rounded-xl p-4 bg-[#1f2937] border border-white/10 text-white flex items-center justify-between hover:bg-white/5 cursor-pointer" onClick={()=>onOpen(o)}>
                <div>
                  <div className="font-semibold">Zamówienie #{o.id}</div>
                  <div className="text-gray-400 text-sm">{o.date ? new Date(o.date).toLocaleString() : '-'}</div>
                </div>
                <div className="text-right">
                  <div className="text-primary font-bold">{o.total != null ? `${Number(String(o.total).replace(',', '.')).toFixed(2)} PLN` : '-'}</div>
                  <div className="text-gray-300 text-sm">pozycji: {o.items_count ?? '-'}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Right drawer */}
      <div className={`fixed inset-0 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={onClose} />
        <div className={`absolute right-0 top-0 h-full w-full sm:w-[520px] bg-[#111418] border-l border-white/10 shadow-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="text-white font-semibold">Szczegóły zamówienia {selected ? `#${selected.id}` : ''}</div>
              {!!selected && (
                <span className="text-xs font-medium px-2 py-1 rounded-full" style={{ background: statusColor(selected)+'33', color: statusColor(selected) }}>
                  {statusLabel(selected)}{selected?.delivery_date ? ' · nadane' : ''}
                </span>
              )}
            </div>
            <button className="text-white/80 hover:text-white" onClick={onClose}><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100%-104px)]">
            {!selected ? null : (
              <div className="grid gap-4">
                {/* Buyer */}
                <div className="rounded-xl p-4 bg-[#1f2937] border border-white/10">
                  <div className="text-white font-semibold mb-2">Kupujący</div>
                  <div className="text-gray-300 text-sm">{selected?.buyer?.firstname || ''} {selected?.buyer?.lastname || ''}</div>
                  <div className="text-gray-400 text-sm">{selected?.buyer?.email || ''}{selected?.buyer?.phone ? ` · ${selected?.buyer?.phone}` : ''}</div>
                  <div className="text-gray-400 text-sm">{[selected?.buyer?.street1, selected?.buyer?.postcode, selected?.buyer?.city, selected?.buyer?.country].filter(Boolean).join(', ')}</div>
                </div>

                {/* Items */}
                <div className="rounded-xl p-4 bg-[#1f2937] border border-white/10">
                  <div className="text-white font-semibold mb-3">Pozycje</div>
                  <div className="grid gap-3">
                    {(selected.items||[]).map((it:any, idx:number)=> (
                      <div key={idx} className="flex items-center gap-3">
                        {it.image ? (
                          <img src={it.image} alt={it.name||''} className="w-12 h-12 object-cover rounded border border-white/10" />
                        ) : (
                          <div className="w-12 h-12 rounded bg-white/10" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-white truncate">{it.name || '-'}</div>
                          <div className="text-gray-400 text-xs">{it.code || ''}</div>
                        </div>
                        <div className="text-gray-300 text-sm">x{it.quantity ?? '-'}</div>
                        <div className="text-white text-sm w-24 text-right">{it.price != null ? `${Number(it.price).toFixed(2)} PLN` : '-'}</div>
                        <div className="text-gray-300 text-sm w-28 text-right">{(it.price!=null && it.quantity!=null) ? `${(Number(it.price)*Number(it.quantity)).toFixed(2)} PLN` : ''}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Footer total */}
          <div className="flex items-center justify-between p-4 border-t border-white/10">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800/50 rounded-lg border border-gray-700/50 hover:bg-gray-700 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-lg">print</span>
              Drukuj
            </button>
            <div className="text-right">
              <div className="text-gray-300 text-sm">Wartość zamówienia:</div>
              <div className="text-white font-semibold">{selected?.total != null ? `${Number(String(selected.total).replace(',', '.')).toFixed(2)} PLN` : '-'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden receipt for printing */}
      <div className="hidden">
        {selected && <OrderReceipt ref={receiptRef} order={selected} />}
      </div>
    </div>
  )
}
