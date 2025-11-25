import React, { useState, useEffect, useRef } from 'react';
import { useLivePricingScan } from '../hooks/useLivePricingScan';

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

const ManualEntryView = ({ onBack }: { onBack: () => void }) => {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    setSelectedVariant(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/pricing/manual_search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, number }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Nie znaleziono karty');
      }

      const data = await response.json();
      setResult(data);
      if (data.pricing.variants && data.pricing.variants.length > 0) {
        const normalVariant = data.pricing.variants.find((v: any) => v.label === 'Normal') || data.pricing.variants[0];
        setSelectedVariant(normalVariant);
      }
    } catch (err: any) {
      setError(err.message || 'Wystąpił błąd');
    } finally {
      setLoading(false);
    }
  };

  const getOverlayClass = () => {
    const rarity = result?.card?.rarity?.toLowerCase() || '';
    const variant = selectedVariant?.label?.toLowerCase() || '';

    if (rarity.includes('rainbow')) return 'rainbow-overlay';
    if (rarity.includes('gold') || rarity.includes('hyper')) return 'gold-overlay';
    if (rarity.includes('amazing')) return 'amazing-rare-overlay';
    if (rarity.includes('shiny')) return 'shiny-overlay';
    if (rarity.includes('illustration') || rarity.includes('full art')) return 'full-art-overlay';
    if (rarity.includes('double rare')) return 'double-rare-overlay';
    if (variant.includes('holo') && !variant.includes('reverse')) return 'holo-overlay';
    if (variant.includes('reverse')) return 'reverse-holo-overlay';
    return '';
  };

  const getFinishBadge = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('holo') && !l.includes('reverse')) return { letter: 'H', label: 'Holo', color: 'bg-purple-600' };
    if (l.includes('reverse')) return { letter: 'R', label: 'Reverse', color: 'bg-blue-600' };
    if (l.includes('normal')) return null;
    return { letter: '?', label: label, color: 'bg-gray-600' };
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
            <span className="material-symbols-outlined">arrow_back</span> 
            <span>Powrót</span>
        </button>
        
        <div className="bg-gray-800 rounded-2xl p-6 shadow-lg border border-gray-700/50">
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">search</span>
                Szukaj karty
            </h3>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
                <label className="text-xs text-gray-400 ml-1 mb-1 block">Nazwa karty</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="np. Charizard"
                    className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 focus:border-primary focus:outline-none transition-colors text-white"
                />
            </div>
            <div>
                <label className="text-xs text-gray-400 ml-1 mb-1 block">Numer karty</label>
                <input
                    type="text"
                    value={number}
                    onChange={(e) => setNumber(e.target.value)}
                    placeholder="np. 4/102"
                    className="w-full p-3 rounded-lg bg-gray-900 border border-gray-700 focus:border-primary focus:outline-none transition-colors text-white"
                />
            </div>
            <button 
                type="submit" 
                disabled={loading || !name} 
                className="mt-2 p-3 rounded-lg bg-gradient-to-r from-primary to-blue-600 text-white font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none hover:brightness-110 transition-all"
            >
                {loading ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        Szukanie...
                    </span>
                ) : 'Wyceń kartę'}
            </button>
            </form>
        </div>
      </div>
      
      <div className="md:col-span-2">
        {loading && (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
                <span className="material-symbols-outlined text-4xl mb-2 animate-bounce">search</span>
                <p>Przeszukuję bazę kart...</p>
            </div>
        )}
        
        {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-3">
                <span className="material-symbols-outlined">error</span>
                {error}
            </div>
        )}

        {result && (
          <div className="bg-gray-800 rounded-2xl p-6 shadow-xl border border-gray-700/50 relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row gap-8 relative z-10">
                {/* Card Image */}
                <div className="flex-shrink-0 mx-auto md:mx-0">
                    <div className={`relative w-64 h-auto rounded-xl overflow-hidden shadow-2xl transition-transform duration-300 hover:scale-105 group`}>
                    {result.card.image ? (
                        <img src={result.card.image} alt={result.card.name} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-64 h-80 bg-gray-700 flex items-center justify-center text-gray-500 flex-col gap-2">
                            <span className="material-symbols-outlined text-4xl">image_not_supported</span>
                            <span>Brak obrazka</span>
                        </div>
                    )}
                    <div className={`absolute inset-0 ${getOverlayClass()} opacity-40 group-hover:opacity-60 transition-opacity`}></div>
                    
                    {/* Rarity Badge on Image */}
                    {result.card.rarity && (
                        <div className="absolute bottom-2 left-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs py-1 px-2 rounded text-center border border-white/10">
                            {result.card.rarity}
                        </div>
                    )}
                    </div>
                </div>

                {/* Card Details */}
                <div className="flex-grow flex flex-col">
                    <div>
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-3xl font-black text-white mb-1">{result.card.name}</h2>
                                <p className="text-gray-400 text-lg flex items-center gap-2">
                                    <span className="text-primary font-bold">{result.card.set}</span>
                                    <span>#{result.card.number}</span>
                                </p>
                            </div>
                            <div className="text-right">
                                <span className="inline-block px-3 py-1 bg-gray-900 rounded-lg text-xs text-gray-500 border border-gray-700">
                                    ID: {result.card.id}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Variants */}
                    {result.pricing.variants && result.pricing.variants.length > 0 && (
                        <div className="mt-6">
                            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-3 block">Warianty</label>
                            <div className="flex flex-wrap gap-2">
                                {result.pricing.variants.map((variant: any) => {
                                    const badge = getFinishBadge(variant.label);
                                    const isSelected = selectedVariant?.label === variant.label;
                                    return (
                                        <button 
                                            key={variant.label} 
                                            onClick={() => setSelectedVariant(variant)} 
                                            className={`
                                                relative px-4 py-2 rounded-xl text-sm font-bold transition-all border
                                                ${isSelected 
                                                    ? 'bg-primary text-white border-primary shadow-lg shadow-primary/25 scale-105' 
                                                    : 'bg-gray-900 text-gray-400 border-gray-700 hover:border-gray-500 hover:text-gray-200'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2">
                                                {badge && (
                                                    <span className={`w-2 h-2 rounded-full ${badge.color}`}></span>
                                                )}
                                                {variant.label}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Pricing Grid */}
                    <div className="mt-6 grid grid-cols-2 gap-4">
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-4xl">payments</span>
                            </div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Cena rynkowa</p>
                            <p className="text-3xl font-black text-white">
                                {(selectedVariant?.price_pln_final || result.pricing.price_pln_final)?.toFixed(2)} <span className="text-lg text-gray-500 font-normal">PLN</span>
                            </p>
                            {selectedVariant?.estimated && (
                                <p className="text-yellow-500 text-xs flex items-center gap-1 mt-1">
                                    <span className="material-symbols-outlined text-xs">warning</span>
                                    Cena szacunkowa
                                </p>
                            )}
                        </div>
                        <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700/50 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
                                <span className="material-symbols-outlined text-4xl">shopping_cart</span>
                            </div>
                            <p className="text-gray-400 text-xs uppercase tracking-wider font-bold mb-1">Cena skupu (80%)</p>
                            <p className="text-3xl font-black text-green-400">
                                {((selectedVariant?.price_pln_final * 0.8) || (result.pricing.purchase_price_pln))?.toFixed(2)} <span className="text-lg text-green-500/50 font-normal">PLN</span>
                            </p>
                        </div>
                    </div>

                    {/* Additional Prices */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {result.pricing.cardmarket && (
                            <div>
                                <h5 className="font-bold text-sm text-gray-300 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-blue-400">storefront</span>
                                    Cardmarket
                                </h5>
                                <div className="bg-gray-900 rounded-lg p-3 space-y-2 text-sm border border-gray-700">
                                    {result.pricing.cardmarket['7d_average'] && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">Średnia 7 dni</span>
                                            <span className="font-mono text-white">{result.pricing.cardmarket['7d_average'].pln_final?.toFixed(2)} PLN</span>
                                        </div>
                                    )}
                                    {result.pricing.cardmarket['30d_average'] && (
                                        <div className="flex justify-between items-center pt-2 border-t border-gray-800">
                                            <span className="text-gray-500">Średnia 30 dni</span>
                                            <span className="font-mono text-white">{result.pricing.cardmarket['30d_average'].pln_final?.toFixed(2)} PLN</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        
                        {result.pricing.graded && (
                            <div>
                                <h5 className="font-bold text-sm text-gray-300 mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-purple-400">workspace_premium</span>
                                    Grading
                                </h5>
                                <div className="bg-gray-900 rounded-lg p-3 space-y-2 text-sm border border-gray-700">
                                    {result.pricing.graded.psa?.psa10 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">PSA 10</span>
                                            <span className="font-mono text-white">{result.pricing.graded.psa.psa10.pln_final?.toFixed(2)} PLN</span>
                                        </div>
                                    )}
                                    {result.pricing.graded.psa?.psa9 && (
                                        <div className="flex justify-between items-center">
                                            <span className="text-gray-500">PSA 9</span>
                                            <span className="font-mono text-white">{result.pricing.graded.psa.psa9.pln_final?.toFixed(2)} PLN</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
const LiveScanView = ({ onBack }: { onBack: () => void }) => {
  const [result, setResult] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const successAudioRef = useRef<HTMLAudioElement>(null);
  const failAudioRef = useRef<HTMLAudioElement>(null);

  const { analyzing, status, initStatus, videoRef, canvasRef, setZoom, zoomCaps } = useLivePricingScan({
    enabled: true,
    apiBase: import.meta.env.VITE_API_BASE_URL || '',
    onResult: (data) => {
      setResult(data);
      if (data.pricing.variants && data.pricing.variants.length > 0) {
        const normalVariant = data.pricing.variants.find((v: any) => v.label === 'Normal') || data.pricing.variants[0];
        setSelectedVariant(normalVariant);
      }
    },
    onSound: (sound) => {
        if (sound === 'success' && successAudioRef.current) {
            successAudioRef.current.play();
        } else if (sound === 'fail' && failAudioRef.current) {
            failAudioRef.current.play();
        }
    }
  });

  const getOverlayClass = () => {
    const rarity = result?.card?.rarity?.toLowerCase() || '';
    const variant = selectedVariant?.label?.toLowerCase() || '';

    if (rarity.includes('rainbow')) return 'rainbow-overlay';
    if (rarity.includes('gold') || rarity.includes('hyper')) return 'gold-overlay';
    if (rarity.includes('amazing')) return 'amazing-rare-overlay';
    if (rarity.includes('shiny')) return 'shiny-overlay';
    if (rarity.includes('illustration') || rarity.includes('full art')) return 'full-art-overlay';
    if (rarity.includes('double rare')) return 'double-rare-overlay';
    if (variant.includes('holo') && !variant.includes('reverse')) return 'holo-overlay';
    if (variant.includes('reverse')) return 'reverse-holo-overlay';
    return '';
  };

  const getFinishBadge = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('holo') && !l.includes('reverse')) return { letter: 'H', label: 'Holo', color: 'bg-purple-600' };
    if (l.includes('reverse')) return { letter: 'R', label: 'Reverse', color: 'bg-blue-600' };
    if (l.includes('normal')) return null;
    return { letter: '?', label: label, color: 'bg-gray-600' };
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-primary flex items-center gap-2">
            <span className="material-symbols-outlined">arrow_back</span> Powrót
        </button>
        <h3 className="text-xl font-bold">Skanowanie na żywo</h3>
        <div className="w-8"></div> {/* Spacer */}
      </div>

      <div className="flex-grow flex flex-col items-center">
        <div className="w-full max-w-sm aspect-[63/88] bg-gray-900 rounded-2xl overflow-hidden relative shadow-2xl border border-gray-800">
            <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover"></video>
            <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none"></canvas>
            
            {/* Overlay UI elements inside camera view */}
            {zoomCaps && (
                <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 bg-black/50 backdrop-blur-md p-2 rounded-full">
                    <span className="material-symbols-outlined text-sm">zoom_out</span>
                    <input 
                        type="range" 
                        min={zoomCaps.min} 
                        max={zoomCaps.max} 
                        step={zoomCaps.step} 
                        defaultValue={1}
                        onChange={(e) => setZoom(parseFloat(e.target.value))} 
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="material-symbols-outlined text-sm">zoom_in</span>
                </div>
            )}
            
            {analyzing && (
                <div className="absolute top-4 right-4">
                    <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-primary"></span>
                    </span>
                </div>
            )}
            
            <div className="absolute top-4 left-4 right-12 text-center">
                <div className="text-white font-bold text-shadow">{status}</div>
                <div className="text-xs text-gray-300 text-shadow">{initStatus}</div>
            </div>
        </div>

        {/* Result Card Overlay */}
        {result && (
            <div className="w-full max-w-md mt-4 animate-in slide-in-from-bottom duration-300">
                <div className="bg-gray-800 rounded-2xl p-4 shadow-xl border border-gray-700/50">
                    <div className="flex gap-4">
                        <div className="relative w-20 h-28 flex-shrink-0 rounded-lg overflow-hidden shadow-md">
                            {result.card.image ? (
                                <img src={result.card.image} alt={result.card.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xs text-gray-500">Brak foto</div>
                            )}
                            <div className={`absolute inset-0 ${getOverlayClass()} opacity-40`}></div>
                        </div>
                        <div className="flex-grow min-w-0">
                            <h4 className="text-lg font-bold truncate">{result.card.name}</h4>
                            <p className="text-gray-400 text-sm">{result.card.set} #{result.card.number}</p>
                            
                            <div className="mt-2 flex items-baseline gap-2">
                                <span className="text-2xl font-black text-white">{(selectedVariant?.price_pln_final || result.pricing.price_pln_final)?.toFixed(2)}</span>
                                <span className="text-sm text-gray-500">PLN</span>
                            </div>
                        </div>
                    </div>
                    
                    {/* Variants Chips */}
                    {result.pricing.variants && result.pricing.variants.length > 0 && (
                        <div className="mt-3 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {result.pricing.variants.map((variant: any) => {
                                const badge = getFinishBadge(variant.label);
                                const isSelected = selectedVariant?.label === variant.label;
                                return (
                                    <button 
                                        key={variant.label} 
                                        onClick={() => setSelectedVariant(variant)} 
                                        className={`
                                            flex-shrink-0 px-3 py-1 rounded-full text-xs font-bold transition-all border flex items-center gap-1.5
                                            ${isSelected 
                                                ? 'bg-primary text-white border-primary' 
                                                : 'bg-gray-900 text-gray-400 border-gray-700'
                                            }
                                        `}
                                    >
                                        {badge && <span className={`w-1.5 h-1.5 rounded-full ${badge.color}`}></span>}
                                        {variant.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        )}
      </div>

      <audio ref={successAudioRef} src="/beep.mp3" />
      <audio ref={failAudioRef} src="/beep.mp3" />
    </div>
  );
};

const CsvUploadView = ({ onBack }: { onBack: () => void }) => (
  <div className="flex flex-col items-center justify-center min-h-[50vh]">
    <div className="text-center max-w-md p-8 bg-gray-800 rounded-2xl border border-gray-700/50 shadow-2xl">
      <div className="inline-flex items-center justify-center w-20 h-20 mb-6 bg-gray-700/50 rounded-full">
        <span className="material-symbols-outlined text-5xl text-gray-500">construction</span>
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Funkcja w budowie</h3>
      <p className="text-gray-400 mb-6">Moduł importu CSV jest obecnie w trakcie przygotowania. Zajrzyj tu ponownie wkrótce!</p>
      <button 
        onClick={onBack} 
        className="px-6 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white font-bold transition-colors"
      >
        Wróć do wyboru
      </button>
    </div>
  </div>
);

type View = 'SELECT' | 'MANUAL' | 'SCAN' | 'CSV';

export default function PricingView() {
  const [currentView, setCurrentView] = useState<View>('SELECT');
  const isMobile = useIsMobile();

  const renderContent = () => {
    switch (currentView) {
      case 'MANUAL':
        return <ManualEntryView onBack={() => setCurrentView('SELECT')} />;
      case 'SCAN':
        return <LiveScanView onBack={() => setCurrentView('SELECT')} />;
      case 'CSV':
        return <CsvUploadView onBack={() => setCurrentView('SELECT')} />;
      case 'SELECT':
      default:
        return (
          <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 mb-4 bg-gradient-to-br from-yellow-500/20 to-orange-600/20 rounded-full border border-yellow-500/30">
                <span className="material-symbols-outlined text-3xl text-yellow-400">sell</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Wycena kart</h3>
              <p className="text-gray-400 text-sm">Sprawdź wartość swoich kart jedną z metod</p>
            </div>

            <div className="flex flex-wrap justify-center gap-6">
              {/* Wpisz ręcznie */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>
                <button 
                  onClick={() => setCurrentView('MANUAL')} 
                  className="relative flex flex-col items-center justify-center w-52 h-56 p-6 bg-[#0f172a] border border-gray-700/50 rounded-2xl shadow-xl hover:border-yellow-500/50 transition-all duration-300 group-hover:shadow-yellow-500/10"
                >
                  <div className="relative mb-4">
                    <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="relative w-20 h-20 flex items-center justify-center bg-gradient-to-br from-yellow-500/10 to-orange-600/10 rounded-full border border-yellow-500/30">
                      <span className="material-symbols-outlined text-4xl text-yellow-400">keyboard</span>
                    </div>
                  </div>
                  <span className="text-lg font-bold text-white mb-1">Wpisz ręcznie</span>
                  <span className="text-xs text-gray-400 text-center px-2">Wyszukaj po nazwie i numerze</span>
                </button>
              </div>

              {/* Skanowanie na żywo (Mobile) */}
              {isMobile && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-500/30 to-cyan-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <button 
                    onClick={() => setCurrentView('SCAN')} 
                    className="relative flex flex-col items-center justify-center w-52 h-56 p-6 bg-[#0f172a] border border-gray-700/50 rounded-2xl shadow-xl hover:border-blue-500/50 transition-all duration-300 group-hover:shadow-blue-500/10"
                  >
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative w-20 h-20 flex items-center justify-center bg-gradient-to-br from-blue-500/10 to-cyan-600/10 rounded-full border border-blue-500/30">
                        <span className="material-symbols-outlined text-4xl text-blue-400">qr_code_scanner</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-white mb-1">Skanuj kamerą</span>
                    <span className="text-xs text-gray-400 text-center px-2">Szybka wycena kamerą telefonu</span>
                  </button>
                </div>
              )}

              {/* CSV (Desktop) */}
              {!isMobile && (
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition duration-500"></div>
                  <button 
                    onClick={() => setCurrentView('CSV')} 
                    className="relative flex flex-col items-center justify-center w-52 h-56 p-6 bg-[#0f172a] border border-gray-700/50 rounded-2xl shadow-xl hover:border-green-500/50 transition-all duration-300 group-hover:shadow-green-500/10"
                  >
                    <div className="relative mb-4">
                      <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
                      <div className="relative w-20 h-20 flex items-center justify-center bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-full border border-green-500/30">
                        <span className="material-symbols-outlined text-4xl text-green-400">table_view</span>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-white mb-1">Import CSV</span>
                    <span className="text-xs text-gray-400 text-center px-2">Wyceń wiele kart naraz</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <div className="font-display text-white">
      <header className="flex items-center justify-between whitespace-nowrap border-b border-gray-800 px-2 md:px-6 py-3">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary">sell</span>
          <h2 className="text-lg font-bold">Wycena</h2>
        </div>
      </header>
      <main className="p-4 md:p-6">
        {renderContent()}
      </main>
    </div>
  );
}
