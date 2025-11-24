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

// Stat card configuration with colors
const statConfig: Record<string, { icon: string; color: string; glowColor: string }> = {
  total_scans: { icon: 'qr_code_scanner', color: 'from-cyan-500/20 to-blue-600/20', glowColor: 'cyan-500' },
  scans_ready: { icon: 'publish', color: 'from-amber-500/20 to-orange-600/20', glowColor: 'amber-500' },
  scans_published: { icon: 'cloud_done', color: 'from-green-500/20 to-emerald-600/20', glowColor: 'green-500' },
  total_products: { icon: 'inventory_2', color: 'from-purple-500/20 to-pink-600/20', glowColor: 'purple-500' },
  sold_value: { icon: 'account_balance_wallet', color: 'from-emerald-500/20 to-teal-600/20', glowColor: 'emerald-500' },
  sold_count: { icon: 'shopping_cart', color: 'from-blue-500/20 to-indigo-600/20', glowColor: 'blue-500' },
  users: { icon: 'group', color: 'from-rose-500/20 to-pink-600/20', glowColor: 'rose-500' },
};

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
    { key: 'total_scans', label: 'Skanów łącznie', value: stats?.total_scans },
    { key: 'scans_ready', label: 'Gotowe do publikacji', value: stats?.scans_ready },
    { key: 'scans_published', label: 'Opublikowane', value: stats?.scans_published },
    { key: 'total_products', label: 'Produkty w sklepie', value: stats?.total_products },
    { key: 'sold_value', label: 'Sprzedane (wartość)', value: stats?.sold_value_pln != null ? `${Math.round(stats.sold_value_pln).toLocaleString('pl-PL')} zł` : '-', nav: 'reports' },
    { key: 'sold_count', label: 'Sprzedane (sztuki)', value: stats?.sold_count, nav: 'reports' },
    { key: 'users', label: 'Użytkownicy', value: stats?.users_count, nav: 'reports' },
  ], [stats]);

  return (
    <div className="max-w-7xl mx-auto font-display pb-24">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full border border-cyan-500/30">
            <span className="material-symbols-outlined text-2xl text-cyan-400">waving_hand</span>
          </div>
          <div>
            <h1 className="text-white text-2xl font-bold">Witaj, Boguś!</h1>
            <p className="text-gray-400 text-sm">{welcomeMessage}</p>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
        {statItems.map(item => {
          const config = statConfig[item.key] || statConfig.total_scans;
          return (
            <div 
              key={item.key} 
              className={`relative group ${item.nav ? 'cursor-pointer' : ''}`}
              onClick={() => item.nav && onNav(item.nav)}
            >
              {/* Glow effect on hover */}
              {item.nav && (
                <div className={`absolute -inset-0.5 bg-gradient-to-r ${config.color} rounded-xl blur opacity-0 group-hover:opacity-75 transition duration-300`}></div>
              )}
              
              <div className={`relative h-24 flex items-center rounded-xl p-4 bg-[#0f172a] border border-gray-700/50 transition-all duration-300 ${item.nav ? 'hover:border-gray-600 group-hover:shadow-lg' : ''}`}>
                {/* Icon */}
                <div className={`flex-shrink-0 w-12 h-12 flex items-center justify-center bg-gradient-to-br ${config.color} rounded-lg border border-gray-700/50 mr-4`}>
                  <span className="material-symbols-outlined text-2xl text-white/80">{config.icon}</span>
                </div>
                
                <div className="flex-grow">
                  {/* Label */}
                  <p className="text-xs text-gray-400 leading-tight">{item.label}</p>
                  {/* Value */}
                  <p className="text-xl font-bold text-white">{item.value ?? '-'}</p>
                </div>
                
                {/* Click indicator */}
                {item.nav && (
                  <span className="absolute top-2 right-2 material-symbols-outlined text-xs text-gray-600 group-hover:text-cyan-400 transition-colors">open_in_new</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Scans */}
      {stats?.recent_scans?.length ? (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-cyan-400">history</span>
              Ostatnie skany
            </h2>
            <button 
              onClick={onRefresh}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-cyan-400 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">refresh</span>
              Odśwież
            </button>
          </div>
          
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {stats.recent_scans.map((r:any)=> (
              <div 
                key={r.id} 
                className="relative group"
              >
                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-hover:opacity-75 transition duration-300"></div>
                
                <div className="relative flex gap-3 p-3 bg-[#0f172a] border border-gray-700/50 rounded-xl hover:border-gray-600 transition-all">
                  {/* Thumbnail */}
                  <div className="flex-shrink-0 w-16 h-22 rounded-lg overflow-hidden bg-gray-800 border border-gray-700/50">
                    {r.image ? (
                      <img 
                        src={r.image} 
                        alt={r.name || 'Skan'} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`w-full h-full flex items-center justify-center ${r.image ? 'hidden' : ''}`}>
                      <span className="material-symbols-outlined text-2xl text-gray-600">image</span>
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium text-sm truncate">{r.name || 'Nieznana karta'}</p>
                    <p className="text-gray-400 text-xs truncate">{r.set || '-'}</p>
                    {r.number && <p className="text-gray-500 text-xs">#{r.number}</p>}
                    
                    <div className="flex items-center gap-2 mt-1.5">
                      {r.price_pln_final ? (
                        <span className="text-xs font-medium text-green-400">{r.price_pln_final.toFixed(2)} zł</span>
                      ) : (
                        <span className="text-xs text-gray-500">Brak ceny</span>
                      )}
                      
                      {r.priced && (
                        <span className="material-symbols-outlined text-xs text-green-400">check_circle</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ): (
        <div className="mt-8 p-8 bg-[#0f172a] border border-gray-700/50 rounded-xl text-center">
          <span className="material-symbols-outlined text-4xl text-gray-600 mb-2">qr_code_scanner</span>
          <p className="text-gray-400">Brak ostatnich skanów</p>
          <p className="text-gray-500 text-sm mt-1">Rozpocznij skanowanie, aby zobaczyć tutaj swoje karty</p>
        </div>
      )}
    </div>
  )
}
