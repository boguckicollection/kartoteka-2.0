import React from 'react'

type Item = { key: string; label: string; icon: string }

type Props = {
  active: string
  onChange: (key: string)=>void
}

const items: Item[] = [
  { key: 'scan', label: 'Skanowanie', icon: 'qr_code_scanner' },
  { key: 'inventory', label: 'Magazyn', icon: 'visibility' },
  { key: 'reports', label: 'Statystyki', icon: 'bar_chart' },
  { key: 'pricing', label: 'Wycena', icon: 'sell' },
  { key: 'bidding', label: 'Licytacje', icon: 'gavel' },
  { key: 'orders', label: 'Zamówienia', icon: 'receipt_long' },
]

export default function Sidebar({ active, onChange }: Props){
  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#1e2a3a] min-h-screen">
      <div className="flex items-center justify-center h-16 border-b border-b-[#2c3e50]">
        <img src="/biale-male.png" alt="Logo" className="h-8 object-contain" />
      </div>
      <div className="flex flex-col flex-1 p-4">

        <nav className="flex flex-col gap-2">
          <button onClick={()=>onChange('dashboard')} className={`text-left flex items-center gap-3 px-3 py-2 rounded-lg ${active==='dashboard' ? 'text-white bg-primary' : 'text-gray-300 hover:bg-primary/20 hover:text-white'}`}>
            <span className="material-symbols-outlined">home</span>
            <span className="font-display">Panel</span>
          </button>
          {items.map(it => (
            <button key={it.key} onClick={()=>onChange(it.key)} className={`text-left flex items-center gap-3 px-3 py-2 rounded-lg ${active===it.key ? 'text-white bg-primary' : 'text-gray-300 hover:bg-primary/20 hover:text-white'}`}>
              <span className="material-symbols-outlined" style={active===it.key?{fontVariationSettings:'\'FILL\' 1'}:undefined}>{it.icon}</span>
              <span className="font-display">{it.label}</span>
            </button>
          ))}
        </nav>
      </div>
      <div className="p-4 border-t border-t-[#2c3e50]">
        <button onClick={()=>onChange('settings')} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg ${active==='settings' ? 'text-white bg-primary' : 'text-gray-300 hover:bg-primary/20 hover:text-white'}`}>
          <span className="material-symbols-outlined">settings</span>
          <span className="font-display">Ustawienia</span>
        </button>

      </div>
    </aside>
  )
}
