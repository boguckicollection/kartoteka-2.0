import React, { useState } from 'react'
import ProductEditSlider from '../components/ProductEditSlider'
import { Product } from '../types'

type Props = {
  items: Product[]
  page: number
  limit: number
  hasNext: boolean
  sort: string
  order: string
  onSearch: (query: string, sort: string, order: string, page: number, limit: number, categoryId?: number)=>void
  onSync: ()=>void
  onUpdate: (product: Product) => Promise<void>
}

const CATEGORIES: { id: number; name: string }[] = [
  {id:38,name:'Karty Pokémon'},{id:39,name:'151'},{id:40,name:'Licytacja'},{id:41,name:'Zestawy'},{id:42,name:'Temporal Forces'},{id:43,name:'Obsidian Flames'},{id:44,name:'Journey Together'},{id:48,name:'Stellar Crown'},{id:49,name:'Twilight Masquerade'},{id:51,name:'Prismatic Evolutions'},{id:53,name:'Destined Rivals'},{id:55,name:'Scarlet & Violet'},{id:56,name:'Paldea Evolved'},{id:57,name:'Paradox Rift'},{id:58,name:'Surging Sparks'},{id:60,name:'Shrouded Fable'},{id:65,name:'Paldean Fates'},{id:66,name:'Evolutions'},{id:70,name:'White Flare'},{id:71,name:'Black Bolt'},{id:72,name:'Scarlet & Violet'},{id:74,name:'XY'},{id:75,name:'Sun & Moon'},{id:80,name:'SVP Black Star Promos'},{id:89,name:'BREAKpoint'},{id:90,name:'Sword & Shield'},{id:91,name:'Vivid Voltage'},{id:92,name:'Pokémon GO'},{id:93,name:'Rebel Clash'},{id:94,name:'Lost Origin'},{id:95,name:'Shining Fates'},{id:96,name:'Chilling Reign'},{id:97,name:'SWSH Black Star Promos'},{id:98,name:'BREAKthrough'},{id:99,name:'Crown Zenith'},{id:100,name:'Astral Radiance'},{id:101,name:'Roaring Skies'},{id:102,name:'Primal Clash'},{id:103,name:'Brilliant Stars'},{id:104,name:'Evolving Skies'},{id:105,name:'Fusion Strike'},{id:106,name:'Celebrations'},{id:107,name:'Silver Tempest'},{id:108,name:'Darkness Ablaze'},{id:109,name:'Generations'},{id:110,name:'Ancient Origins'},{id:111,name:'Steam Siege'}
]

export default function InventoryView({ items, page, limit, hasNext, sort, order, onSearch, onSync, onUpdate }: Props){
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<number | undefined>(undefined)
  const [localLimit, setLocalLimit] = useState<number>(limit)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isSliderOpen, setIsSliderOpen] = useState(false)

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product)
    setIsSliderOpen(true)
  }

  const handleCloseSlider = () => {
    setIsSliderOpen(false)
    setSelectedProduct(null)
  }

  return (
    <div className="font-display">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-800 px-2 md:px-6 py-3">
        <div className="flex items-center gap-3 text-white">
          <span className="material-symbols-outlined text-primary">visibility</span>
          <h2 className="text-lg font-bold">Magazyn</h2>
        </div>
      </header>
      <main className="p-4 md:p-6">
        <div className="flex flex-wrap gap-3 mb-4">
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Szukaj" className="flex-1 min-w-[220px] rounded-md border border-gray-700 bg-[#101922] text-white px-3 py-2" />
          <select value={cat ?? ''} onChange={e=>setCat(e.target.value ? Number(e.target.value) : undefined)} className="rounded-md border border-gray-700 bg-[#101922] text-white px-3 py-2">
            <option value="">Wszystkie kategorie</option>
            {CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
          </select>
          <select value={localLimit} onChange={e=>{ const v=Number(e.target.value); setLocalLimit(v); onSearch(q, sort, order, 1, v, cat) }} className="rounded-md border border-gray-700 bg-[#101922] text-white px-3 py-2">
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>
          <button onClick={()=>onSearch(q, sort, order, 1, localLimit, cat)} className="rounded-lg h-10 px-4 bg-primary text-white text-sm font-bold">Szukaj</button>
          <button onClick={onSync} className="rounded-lg h-10 px-4 bg-[#283039] text-white text-sm font-bold">Sync z Shoper</button>
        </div>
        <div className="overflow-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[680px] table-auto">
            <thead>
              <tr className="bg-[#111827] text-gray-200">
                <Th label="Miniatura" />
                <Th label="Nazwa" sortable current={sort} field="name" order={order} onSort={(f)=>onSearch(q, f, sort===f && order==='asc'?'desc':'asc', 1, localLimit, cat)} />
                <Th label="Kod" sortable current={sort} field="code" order={order} onSort={(f)=>onSearch(q, f, sort===f && order==='asc'?'desc':'asc', 1, localLimit, cat)} />
                <Th label="Kategoria" />
                <Th label="Cena" sortable current={sort} field="price" order={order} onSort={(f)=>onSearch(q, f, sort===f && order==='asc'?'desc':'asc', 1, localLimit, cat)} />
                <Th label="Stan" sortable current={sort} field="stock" order={order} onSort={(f)=>onSearch(q, f, sort===f && order==='asc'?'desc':'asc', 1, localLimit, cat)} />
                <Th label="Link" />
              </tr>
            </thead>
            <tbody>
              {items.map(p => (
                <tr key={p.id} className="border-t border-white/10 cursor-pointer hover:bg-white/5" onClick={() => handleProductClick(p)}>
                  <td className="p-2">
                    {p.image ? (
                      <div className="w-12 h-12 rounded overflow-hidden border border-white/10">
                        <img src={p.image} alt={p.name} className="w-full h-full object-cover object-top" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 border border-white/10 rounded flex items-center justify-center text-gray-500 text-xs">brak</div>
                    )}
                  </td>
                  <td className="p-2 text-white">{p.name || '—'}</td>
                  <td className="p-2 text-gray-300">{p.code || ''}</td>
                  <td className="p-2 text-gray-400 text-sm">{p.category_name || (p.category_id ? `Kategoria ${p.category_id}` : '')}</td>
                  <td className="p-2 text-gray-200">{p.price ?? '-'} PLN</td>
                  <td className="p-2 text-gray-200">{p.stock ?? '-'}</td>
                  <td className="p-2">{p.permalink && <a href={p.permalink} className="text-primary" target="_blank" rel="noreferrer">Permalink</a>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between mt-4">
          <div className="text-gray-400 text-sm">Strona {page} • {items.length} pozycji • Na stronę: {localLimit}</div>
          <div className="flex gap-2">
            <button className="rounded-lg h-9 px-3 bg-[#283039] text-white text-sm font-bold disabled:opacity-50" disabled={page<=1} onClick={()=>onSearch(q, sort, order, page-1, localLimit, cat)}>Poprzednia</button>
            <button className="rounded-lg h-9 px-3 bg-primary text-white text-sm font-bold disabled:opacity-50" disabled={!hasNext} onClick={()=>onSearch(q, sort, order, page+1, localLimit, cat)}>Następna</button>
          </div>
        </div>
      </main>
      {isSliderOpen && selectedProduct && (
        <ProductEditSlider 
          key={selectedProduct.id}
          product={selectedProduct} 
          onClose={handleCloseSlider} 
          onUpdate={onUpdate}
        />
      )}
    </div>
  )
}

function Th({ label, sortable=false, field, current, order, onSort }:{ label:string; sortable?:boolean; field?:string; current?:string; order?:string; onSort?:(f:string)=>void }){
  const active = sortable && field && current===field
  return (
    <th className="text-left px-2 py-2 select-none">
      {!sortable ? (
        <span>{label}</span>
      ) : (
        <button className={`inline-flex items-center gap-1 ${active?'text-primary':'text-gray-200'}`} onClick={()=>field && onSort && onSort(field)}>
          <span>{label}</span>
          {active && <span className="material-symbols-outlined text-sm align-middle">{order==='asc'?'arrow_upward':'arrow_downward'}</span>}
        </button>
      )}
    </th>
  )
}