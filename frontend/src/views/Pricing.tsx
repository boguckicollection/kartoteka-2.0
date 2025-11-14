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

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="md:col-span-1">
        <button onClick={onBack} className="btn btn-ghost mb-4"><span className="material-symbols-outlined">arrow_back</span> Powrót</button>
        <h3 className="text-xl font-bold mb-4">Wpisz ręcznie</h3>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nazwa karty (np. Charizard)"
            className="p-2 rounded bg-gray-700 text-white"
          />
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Numer karty (np. 4/102)"
            className="p-2 rounded bg-gray-700 text-white"
          />
          <button type="submit" disabled={loading} className="p-2 rounded bg-primary text-white font-bold disabled:bg-gray-500">
            {loading ? 'Szukanie...' : 'Wycena'}
          </button>
        </form>
      </div>
      <div className="md:col-span-2">
        {loading && <div className="text-center">Ładowanie...</div>}
        {error && <div className="text-red-500">{error}</div>}
        {result && (
          <div className="p-4 rounded-lg bg-gray-800 flex flex-col items-center">
            <div className={`relative w-48 h-auto rounded-lg overflow-hidden`}>
              {result.card.image ? (
                  <img src={result.card.image} alt={result.card.name} className="w-full h-full" />
              ) : (
                  <div className="w-48 h-64 bg-gray-700 flex items-center justify-center text-gray-500">Brak obrazka</div>
              )}
              <div className={`absolute inset-0 ${getOverlayClass()} opacity-30`}></div>
            </div>
            <h4 className="text-xl font-bold mt-4">{result.card.name}</h4>
            <p className="text-gray-400">{result.card.set} #{result.card.number} - {result.card.rarity}</p>

            {result.pricing.variants && result.pricing.variants.length > 1 && (
              <div className="mt-4 flex gap-2 bg-gray-900/50 p-1 rounded-full">
                {result.pricing.variants.map((variant: any) => (
                  <button key={variant.label} onClick={() => setSelectedVariant(variant)} className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${selectedVariant?.label === variant.label ? 'bg-primary text-white' : 'bg-transparent text-gray-300 hover:bg-gray-700'}`}>
                    {variant.label}
                  </button>
                ))}
              </div>
            )}
            
            <div className="mt-4 w-full grid grid-cols-2 gap-4 text-center">
                <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-sm text-gray-400 flex items-center justify-center">Cena sprzedaży {selectedVariant?.estimated && <span className="material-symbols-outlined text-xs ml-1" title="Cena szacunkowa">help</span>}</p>
                    <p className="text-2xl font-bold">{(selectedVariant?.price_pln_final || result.pricing.price_pln_final)?.toFixed(2) || 'Brak'} PLN</p>
                </div>
                <div className="bg-gray-700 p-3 rounded-lg">
                    <p className="text-sm text-gray-400 flex items-center justify-center">Cena zakupu (80%) {selectedVariant?.estimated && <span className="material-symbols-outlined text-xs ml-1" title="Cena szacunkowa">help</span>}</p>
                    <p className="text-2xl font-bold">{((selectedVariant?.price_pln_final * 0.8) || (result.pricing.purchase_price_pln))?.toFixed(2) || 'Brak'} PLN</p>
                </div>
            </div>

            {result.pricing.cardmarket && (
            <div className="mt-4 w-full text-sm">
                <h5 className="font-bold mb-2">Ceny Cardmarket</h5>
                {result.pricing.cardmarket['7d_average'] && <div className="flex justify-between border-b border-gray-700 py-1"><span className="text-gray-400">Średnia 7 dni:</span><span>{result.pricing.cardmarket['7d_average'].pln_final?.toFixed(2)} PLN</span></div>}
                {result.pricing.cardmarket['30d_average'] && <div className="flex justify-between border-b border-gray-700 py-1"><span className="text-gray-400">Średnia 30 dni:</span><span>{result.pricing.cardmarket['30d_average'].pln_final?.toFixed(2)} PLN</span></div>}
            </div>
            )}

            {result.pricing.graded && (
                 <div className="mt-4 w-full text-sm">
                    <h5 className="font-bold mb-2">Ceny gradowane</h5>
                    {result.pricing.graded.psa?.psa10 && <div className="flex justify-between py-1"><span className="text-gray-400">PSA 10:</span><span>{result.pricing.graded.psa.psa10.pln_final?.toFixed(2)} PLN</span></div>}
                    {result.pricing.graded.psa?.psa9 && <div className="flex justify-between py-1"><span className="text-gray-400">PSA 9:</span><span>{result.pricing.graded.psa.psa9.pln_final?.toFixed(2)} PLN</span></div>}
                    {result.pricing.graded.bgs?.bgs9 && <div className="flex justify-between py-1"><span className="text-gray-400">BGS 9:</span><span>{result.pricing.graded.bgs.bgs9.pln_final?.toFixed(2)} PLN</span></div>}
                    {result.pricing.graded.cgc?.cgc10 && <div className="flex justify-between py-1"><span className="text-gray-400">CGC 10:</span><span>{result.pricing.graded.cgc.cgc10.pln_final?.toFixed(2)} PLN</span></div>}
                    {result.pricing.graded.cgc?.cgc9 && <div className="flex justify-between py-1"><span className="text-gray-400">CGC 9:</span><span>{result.pricing.graded.cgc.cgc9.pln_final?.toFixed(2)} PLN</span></div>}
                </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
const LiveScanView = ({ onBack }: { onBack: () => void }) => {
  const [result, setResult] = useState<any>(null);
  const successAudioRef = useRef<HTMLAudioElement>(null);
  const failAudioRef = useRef<HTMLAudioElement>(null);

  const { analyzing, status, initStatus, videoRef, canvasRef, setZoom, zoomCaps } = useLivePricingScan({
    enabled: true,
    apiBase: import.meta.env.VITE_API_BASE_URL || '',
    onResult: (data) => {
      setResult(data);
    },
    onSound: (sound) => {
        if (sound === 'success' && successAudioRef.current) {
            successAudioRef.current.play();
        } else if (sound === 'fail' && failAudioRef.current) {
            failAudioRef.current.play();
        }
    }
  });

  return (
    <div>
      <button onClick={onBack} className="text-primary mb-4">&larr; Powrót</button>
      <h3 className="text-xl font-bold mb-4">Skanowanie na żywo</h3>
      <div className="w-full max-w-xs aspect-[63/88] bg-gray-900 rounded-lg overflow-hidden mx-auto relative">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover"></video>
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none"></canvas>
      </div>
      <div className="text-center mt-2 font-bold min-h-[1.5em]">{status}</div>
      <div className="text-center mt-1 text-sm text-gray-400 min-h-[1.5em]">{initStatus}</div>

      {zoomCaps && (
        <div className="mt-4 flex items-center gap-2">
            <span className="material-symbols-outlined">zoom_out</span>
            <input 
                type="range" 
                min={zoomCaps.min} 
                max={zoomCaps.max} 
                step={zoomCaps.step} 
                defaultValue={1}
                onChange={(e) => setZoom(parseFloat(e.target.value))} 
                className="w-full"
            />
            <span className="material-symbols-outlined">zoom_in</span>
        </div>
      )}

      {analyzing && <div className="text-center text-primary">Analizuję...</div>}

      {result && (
        <div className="mt-6 p-4 rounded-lg bg-gray-800 flex items-center gap-4">
          {result.card.image ? (
            <img src={result.card.image} alt={result.card.name} className="w-24 h-auto" />
          ) : (
            <div className="w-24 h-32 bg-gray-700 rounded flex items-center justify-center text-gray-500 text-xs">Brak obrazka</div>
          )}
          <div>
            <h4 className="text-lg font-bold">{result.card.name}</h4>
            <p className="text-gray-400">{result.card.set} #{result.card.number}</p>
            <p className="text-2xl font-bold mt-2">{result.pricing.price_pln_final?.toFixed(2) || 'Brak'} PLN</p>
            <p className="text-xs text-gray-500">Źródło: {result.pricing.source}</p>
          </div>
        </div>
      )}
      <audio ref={successAudioRef} src="/beep.mp3" />
      <audio ref={failAudioRef} src="/beep.mp3" />
    </div>
  );
};

const CsvUploadView = ({ onBack }: { onBack: () => void }) => (
  <div>
    <button onClick={onBack} className="text-primary mb-4">&larr; Powrót</button>
    <h3 className="text-xl font-bold mb-4">Wgraj plik CSV</h3>
    <p>Komponent do wgrywania plików CSV pojawi się tutaj.</p>
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
          <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-md">
              <h3 className="text-2xl font-black mb-2 text-center">Wybierz metodę</h3>
              <p className="text-gray-400 mb-6 text-center">Wybierz jedną z dostępnych metod, aby rozpocząć wycenę kart.</p>
              <div className="flex flex-col gap-4">
                <button onClick={() => setCurrentView('MANUAL')} className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-left w-full border border-transparent hover:border-primary">
                  <h4 className="text-lg font-bold">Wpisz ręcznie</h4>
                  <p className="text-gray-400 text-sm">Wprowadź nazwę i numer karty, aby znaleźć jej cenę.</p>
                </button>
                {isMobile ? (
                  <button onClick={() => setCurrentView('SCAN')} className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-left w-full border border-transparent hover:border-primary">
                    <h4 className="text-lg font-bold">Skanowanie na żywo</h4>
                    <p className="text-gray-400 text-sm">Użyj aparatu, aby szybko wycenić kartę.</p>
                  </button>
                ) : (
                  <button onClick={() => setCurrentView('CSV')} className="p-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-left w-full border border-transparent hover:border-primary">
                    <h4 className="text-lg font-bold">Wgraj plik CSV</h4>
                    <p className="text-gray-400 text-sm">Wyceń wiele kart naraz, wgrywając plik.</p>
                  </button>
                )}
              </div>
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
