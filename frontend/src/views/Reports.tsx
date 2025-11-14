import React, { useEffect, useMemo, useState } from 'react'

type SeriesPoint = { date: string; count: number }
type CategoryItem = { id: number | null; name: string | null; count: number }
type ProductRow = { id: number; code?: string | null; name?: string | null; stock?: number | null; price?: number | null; permalink?: string | null }

type ReportsData = {
  metrics: {
    total_products: number
    inventory_units: number
    inventory_value_pln: number
    total_scans: number
    scans_ready: number
    scans_published: number
    sold_value_pln?: number
    sold_count?: number
    users_count?: number
  }
  products_per_day: SeriesPoint[]
  scans_per_day: SeriesPoint[]
  top_categories: CategoryItem[]
  low_stock: ProductRow[]
  top_value: Array<ProductRow & { value: number }>
}

const Num = ({ v }: { v: number }) => <span>{v.toLocaleString('pl-PL')}</span>

function LineChart({ points, color = '#1173d4' }: { points: SeriesPoint[]; color?: string }){
  const view = 200
  const padding = 8
  const ys = points.map(p => p.count)
  const maxY = Math.max(1, ...ys)
  const step = (view - padding * 2) / Math.max(1, points.length - 1)
  const path = useMemo(() => {
    return points.map((p, i) => {
      const x = padding + i * step
      const y = view - padding - (p.count / maxY) * (view - padding * 2)
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    }).join(' ')
  }, [points, maxY, step])
  return (
    <svg viewBox={`0 0 ${view} ${view}`} className="w-full h-48 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <path d={path} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  )
}

export default function Reports(){
  const [data, setData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(false)
  const [panel, setPanel] = useState<'users'|'sold'|null>(null)
  const [users, setUsers] = useState<any[] | null>(null)
  const [soldAggregated, setSoldAggregated] = useState<Array<{ key: string, name: string, code?: string|null, qty: number, total?: number|null }>>([])

  const apiBase = useMemo(() => {
    const env = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined
    if (env) return env
    try {
      const loc = window.location
      // Gdy frontend działa w HTTPS, użyj proxy '/api' aby uniknąć mixed-content i TLS do backendu HTTP
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

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch(`${apiBase}/reports`)
        const d = await res.json()
        setData(d)
      } catch (e) {
        // noop
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [apiBase])

  // Support deep-linking from Home to open a panel immediately
  useEffect(()=>{
    const toOpen = (window as any).__OPEN_REPORTS_PANEL as ('users'|'sold'|undefined)
    if (toOpen === 'users') { setPanel('users'); loadUsers() }
    if (toOpen === 'sold') { setPanel('sold'); loadSold() }
    try { delete (window as any).__OPEN_REPORTS_PANEL } catch {}
  }, [])

  const loadUsers = async () => {
    try { const r = await fetch(`${apiBase}/users`); const d = await r.json(); setUsers(Array.isArray(d) ? d : []) } catch {}
  }
  const loadSold = async () => {
    try {
      const r = await fetch(`${apiBase}/orders?detailed=1`)
      const orders = await r.json()
      const acc = new Map<string, { key: string, name: string, code?: string|null, qty: number, total?: number|null }>()
      if (Array.isArray(orders)) {
        for (const o of orders) {
          const items = Array.isArray(o.items) ? o.items : []
          for (const it of items) {
            const name = it?.name || '-'
            const code = it?.code || null
            const qty = Number(it?.quantity || 0)
            const price = it?.price != null ? Number(it.price) : null
            const key = (code || name) as string
            const prev: any = acc.get(key) || { key, name, code, qty: 0, total: 0, image: it?.image || null }
            prev.qty += isNaN(qty) ? 0 : qty
            if (price != null) prev.total = (prev.total || 0) + (isNaN(qty) ? 0 : qty) * price
            if (!prev.image && it?.image) prev.image = it.image
            acc.set(key, prev)
          }
        }
      }
      const list = Array.from(acc.values()).sort((a,b)=> (b.total||0) - (a.total||0))
      setSoldAggregated(list)
    } catch {}
  }

  if (loading && !data) return <div className="text-white">Ładowanie raportów…</div>

  return (
    <div className="max-w-7xl mx-auto font-display">
      <header className="mb-6">
        <h1 className="text-white text-3xl font-bold">Statystyki</h1>
        <p className="text-gray-400">Raporty i analityka Twojego sklepu</p>
      </header>

      {/* KPI cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#2c3e50]">
          <p className="text-gray-300">Produkty</p>
          <p className="text-white text-3xl font-bold">{data ? <Num v={data.metrics.total_products} /> : '-'}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#2c3e50]">
          <p className="text-gray-300">Sztuki w magazynie</p>
          <p className="text-white text-3xl font-bold">{data ? <Num v={data.metrics.inventory_units} /> : '-'}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#2c3e50]">
          <p className="text-gray-300">Wartość magazynu (PLN)</p>
          <p className="text-white text-3xl font-bold">{data ? <Num v={Math.round(data.metrics.inventory_value_pln)} /> : '-'}</p>
        </div>
        <div className={`flex flex-col gap-2 rounded-xl p-6 bg-[#2c3e50] cursor-pointer hover:bg-white/10 ${panel==='sold' ? 'ring-2 ring-primary/50' : ''}`} onClick={()=>{ setPanel('sold'); loadSold() }}>
          <p className="text-gray-300">Sprzedane (wartość)</p>
          <p className="text-white text-3xl font-bold">{data?.metrics?.sold_value_pln != null ? (Math.round(data.metrics.sold_value_pln).toLocaleString('pl-PL')+ ' PLN') : '-'}</p>
        </div>
        <div className={`flex flex-col gap-2 rounded-xl p-6 bg-[#2c3e50] cursor-pointer hover:bg-white/10 ${panel==='sold' ? 'ring-2 ring-primary/50' : ''}`} onClick={()=>{ setPanel('sold'); loadSold() }}>
          <p className="text-gray-300">Sprzedane (sztuki)</p>
          <p className="text-white text-3xl font-bold">{data?.metrics?.sold_count != null ? <Num v={data.metrics.sold_count} /> : '-'}</p>
        </div>
        <div className={`flex flex-col gap-2 rounded-xl p-6 bg-[#2c3e50] cursor-pointer hover:bg-white/10 ${panel==='users' ? 'ring-2 ring-primary/50' : ''}`} onClick={()=>{ setPanel('users'); loadUsers() }}>
          <p className="text-gray-300">Użytkownicy</p>
          <p className="text-white text-3xl font-bold">{data?.metrics?.users_count != null ? <Num v={data.metrics.users_count} /> : '-'}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#2c3e50]">
          <p className="text-gray-300">Skanów łącznie</p>
          <p className="text-white text-3xl font-bold">{data ? <Num v={data.metrics.total_scans} /> : '-'}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#2c3e50]">
          <p className="text-gray-300">Gotowe do publikacji</p>
          <p className="text-white text-3xl font-bold">{data ? <Num v={data.metrics.scans_ready} /> : '-'}</p>
        </div>
        <div className="flex flex-col gap-2 rounded-xl p-6 bg-[#2c3e50]">
          <p className="text-gray-300">Opublikowane</p>
          <p className="text-white text-3xl font-bold">{data ? <Num v={data.metrics.scans_published} /> : '-'}</p>
        </div>
      </div>

      {/* Right drawer for users/sold */}
      <div className={`fixed inset-0 z-40 ${panel ? 'pointer-events-auto' : 'pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-black/50 transition-opacity ${panel ? 'opacity-100' : 'opacity-0'}`} onClick={()=>setPanel(null)} />
        <div className={`absolute right-0 top-0 h-full w-full sm:w-[640px] bg-[#111418] border-l border-white/10 shadow-xl transition-transform duration-300 ${panel ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="text-white font-semibold">{panel==='users' ? 'Użytkownicy' : (panel==='sold' ? 'Sprzedane karty' : '')}</div>
            <button className="text-white/80 hover:text-white" onClick={()=>setPanel(null)}><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="p-4 overflow-y-auto h-[calc(100%-56px)]">
            {panel==='users' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="text-xs uppercase text-gray-200">
                    <tr>
                      <th className="px-4 py-2">Email</th>
                      <th className="px-4 py-2">Założono</th>
                      <th className="px-4 py-2">Ostatnia wizyta</th>
                      <th className="px-4 py-2">Aktywny</th>
                      <th className="px-4 py-2">Kupował?</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(users||[]).map((u:any, i:number)=>(
                      <tr key={i} className="border-t border-white/10">
                        <td className="px-4 py-2">{u.email || '-'}</td>
                        <td className="px-4 py-2">{u.date_add ? new Date(u.date_add).toLocaleString() : '-'}</td>
                        <td className="px-4 py-2">{u.lastvisit ? new Date(u.lastvisit).toLocaleString() : '-'}</td>
                        <td className="px-4 py-2">{u.active ? 'tak' : 'nie'}</td>
                        <td className="px-4 py-2">{u.has_orders ? 'tak' : 'nie'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {panel==='sold' && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-gray-300">
                  <thead className="text-xs uppercase text-gray-200">
                    <tr>
                      <th className="px-4 py-2">Miniatura</th>
                      <th className="px-4 py-2">Produkt</th>
                      <th className="px-4 py-2">Kod</th>
                      <th className="px-4 py-2">Ilość</th>
                      <th className="px-4 py-2">Suma (PLN)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {soldAggregated.map((it: any, i)=> (
                      <tr key={i} className="border-t border-white/10">
                        <td className="px-4 py-2">{it.image ? <img src={it.image} alt="thumb" className="w-10 h-10 object-cover rounded border border-white/10" /> : null}</td>
                        <td className="px-4 py-2 text-white">{it.name}</td>
                        <td className="px-4 py-2">{it.code || '-'}</td>
                        <td className="px-4 py-2">{it.qty}</td>
                        <td className="px-4 py-2">{it.total != null ? Math.round(it.total).toLocaleString('pl-PL') : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts and lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#2c3e50] rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Aktualizacje produktów (30 dni)</h3>
          {data?.products_per_day?.length ? (
            <LineChart points={data.products_per_day} />
          ) : (
            <div className="h-48 bg-[#1f2937] rounded-lg flex items-center justify-center text-gray-400">brak danych</div>
          )}
        </div>
        <div className="bg-[#2c3e50] rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Skanów w czasie (30 dni)</h3>
          {data?.scans_per_day?.length ? (
            <LineChart points={data.scans_per_day} color="#2ECC71" />
          ) : (
            <div className="h-48 bg-[#1f2937] rounded-lg flex items-center justify-center text-gray-400">brak danych</div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <div className="bg-[#2c3e50] rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Top kategorie</h3>
          <div className="space-y-3">
            {data?.top_categories?.slice(0,8).map((c, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-2/3 text-gray-300">{c.name || c.id || '—'}</span>
                <div className="w-1/3 bg-gray-700 rounded-full h-2.5">
                  <div className="bg-primary h-2.5 rounded-full" style={{ width: `${Math.min(100, Math.round((c.count / (data.top_categories?.[0]?.count || 1)) * 100))}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-[#2c3e50] rounded-xl p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Najbardziej wartościowe pozycje</h3>
          <div className="space-y-3">
            {data?.top_value?.slice(0,8).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3">
                <div className="text-gray-100 truncate">{p.name || p.code || `#${p.id}`}</div>
                <div className="text-gray-300 text-sm">{p.stock ?? 0} szt</div>
                <div className="text-white font-semibold">{Math.round((p as any).value).toLocaleString('pl-PL')} PLN</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
