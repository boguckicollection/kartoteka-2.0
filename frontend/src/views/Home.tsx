import React, { useEffect, useMemo } from 'react'

type Props = { stats: any, onNav: (key: string)=>void, onRefresh: ()=>void }

const welcomeMessages = [
  "Gotowy na podbój rynku kart? Działaj, Boguś!",
  "Każda zeskanowana karta to krok do sukcesu! Naprzód, Boguś!",
  "Twoja kolekcja czeka na wycenę i sprzedaż. Pokaż im, Boguś!",
  "Nowe zamówienia same się nie zrealizują. Do dzieła, Boguś!",
  "Zróbmy dziś coś wielkiego! Czas na skanowanie, Boguś!",
  "Twoje karty to Twój skarb. Dbaj o nie i sprzedawaj z zyskiem, Boguś!",
  "Dzień dobry, Boguś! Czas na kolejne rekordy sprzedaży!",
  "Wyceniaj, skanuj, sprzedawaj! Jesteś najlepszy, Boguś!",
];

export default function Home({ stats, onNav, onRefresh }: Props){
  const welcomeMessage = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * welcomeMessages.length);
    return welcomeMessages[randomIndex];
  }, []);
  useEffect(()=>{
    document.documentElement.classList.add('dark')
    return ()=>{ /* keep dark */ }
  }, [])

  const statItems = useMemo(() => [
    { key: 'total_scans', label: 'Skanów łącznie', value: stats?.total_scans, icon: 'qr_code_scanner', gradient: 'bg-gradient-scans' },
    { key: 'scans_ready', label: 'Gotowe do publikacji', value: stats?.scans_ready, icon: 'publish', gradient: 'bg-gradient-ready' },
    { key: 'scans_published', label: 'Opublikowane', value: stats?.scans_published, icon: 'cloud_done', gradient: 'bg-gradient-published' },
    { key: 'total_products', label: 'Produkty', value: stats?.total_products, icon: 'inventory_2', gradient: 'bg-gradient-products' },
    { key: 'sold_value', label: 'Sprzedane (wartość)', value: stats?.sold_value_pln != null ? `${Math.round(stats.sold_value_pln).toLocaleString('pl-PL')} PLN` : '-', icon: 'account_balance_wallet', gradient: 'bg-gradient-sold-value', nav: 'reports' },
    { key: 'sold_count', label: 'Sprzedane (sztuki)', value: stats?.sold_count, icon: 'shopping_cart', gradient: 'bg-gradient-sold-count', nav: 'reports' },
    { key: 'users', label: 'Użytkownicy', value: stats?.users_count, icon: 'group', gradient: 'bg-gradient-users', nav: 'reports' },
  ], [stats]);

  return (
    <div className="max-w-7xl mx-auto font-display pb-24">
      <header className="mb-6">
        <h1 className="text-white text-3xl font-bold">Witaj, Boguś!</h1>
        <p className="text-gray-400">{welcomeMessage}</p>
      </header>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
        {statItems.map(item => (
          <div 
            key={item.key} 
            className={`h-44 flex flex-col items-center justify-center rounded-xl p-4 text-white transition-all duration-200 ${item.gradient} ${item.nav ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : ''}`}
            onClick={() => item.nav && onNav(item.nav)}
          >
            <span className="material-symbols-outlined text-4xl mb-2">{item.icon}</span>
            <p className="text-3xl font-bold">{item.value ?? '-'}</p>
            <p className="text-xs text-center text-gray-200 mt-1">{item.label}</p>
          </div>
        ))}
      </div>
      {/* Szybkie akcje usunięte */}
      {stats?.recent_scans?.length ? (
        <div className="mt-6 bg-[#2c3e50] rounded-xl p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Ostatnie skany</h2>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {stats.recent_scans.map((r:any)=> (
              <div key={r.id} className="rounded-lg p-4 border border-white/10 bg-[#1f2937]">
                <div className="text-gray-400">#{r.id} · {new Date(r.created_at).toLocaleString()}</div>
                <div className="text-white"><strong>{r.name||'-'}</strong> {r.set?`(${r.set})`:''} {r.number?`#${r.number}`:''}</div>
              </div>
            ))}
          </div>
        </div>
      ): null}
    </div>
  )
}

