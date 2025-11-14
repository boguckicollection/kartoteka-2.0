import React, { useState, useEffect } from 'react'
import { Product } from '../types'

const CATEGORIES: { id: number; name: string }[] = [
  {id:38,name:'Karty Pokémon'},{id:39,name:'151'},{id:40,name:'Licytacja'},{id:41,name:'Zestawy'},{id:42,name:'Temporal Forces'},{id:43,name:'Obsidian Flames'},{id:44,name:'Journey Together'},{id:48,name:'Stellar Crown'},{id:49,name:'Twilight Masquerade'},{id:51,name:'Prismatic Evolutions'},{id:53,name:'Destined Rivals'},{id:55,name:'Scarlet & Violet'},{id:56,name:'Paldea Evolved'},{id:57,name:'Paradox Rift'},{id:58,name:'Surging Sparks'},{id:60,name:'Shrouded Fable'},{id:65,name:'Paldean Fates'},{id:66,name:'Evolutions'},{id:70,name:'White Flare'},{id:71,name:'Black Bolt'},{id:72,name:'Scarlet & Violet'},{id:74,name:'XY'},{id:75,name:'Sun & Moon'},{id:80,name:'SVP Black Star Promos'},{id:89,name:'BREAKpoint'},{id:90,name:'Sword & Shield'},{id:91,name:'Vivid Voltage'},{id:92,name:'Pokémon GO'},{id:93,name:'Rebel Clash'},{id:94,name:'Lost Origin'},{id:95,name:'Shining Fates'},{id:96,name:'Chilling Reign'},{id:97,name:'SWSH Black Star Promos'},{id:98,name:'BREAKthrough'},{id:99,name:'Crown Zenith'},{id:100,name:'Astral Radiance'},{id:101,name:'Roaring Skies'},{id:102,name:'Primal Clash'},{id:103,name:'Brilliant Stars'},{id:104,name:'Evolving Skies'},{id:105,name:'Fusion Strike'},{id:106,name:'Celebrations'},{id:107,name:'Silver Tempest'},{id:108,name:'Darkness Ablaze'},{id:109,name:'Generations'},{id:110,name:'Ancient Origins'},{id:111,name:'Steam Siege'}
]

type Props = {
  product: Product
  onClose: () => void
  onUpdate: (product: Product) => Promise<void>
}

export default function ProductEditSlider({ product, onClose, onUpdate }: Props) {
  const [formData, setFormData] = useState<Product>(product)
  const [open, setOpen] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)

  useEffect(() => {
    setFormData(product)
    setIsEditMode(false) // Reset to details view when product changes
    const timer = setTimeout(() => setOpen(true), 50);
    return () => clearTimeout(timer);
  }, [product])

  const handleClose = () => {
    setOpen(false);
    const timer = setTimeout(onClose, 300);
    return () => clearTimeout(timer);
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    const parsedValue = name === 'price' ? parseFloat(value) : (name === 'stock' || name === 'category_id' ? parseInt(value, 10) : value);
    setFormData(prev => ({ ...prev, [name]: parsedValue }))
  }

  const handleUpdate = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(formData);
      handleClose();
    } catch (error) {
      console.error('Error updating product:', error);
      alert(`Błąd podczas aktualizacji produktu: ${error.message}`);
    } finally {
      setIsUpdating(false);
    }
  }

  const getNumberFromCode = (code: string) => {
    if (!code) return 'N/A';
    const parts = code.split('-');
    return parts[parts.length - 1] || 'N/A';
  };

  return (
    <div className={`fixed inset-0 z-40 ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div className={`absolute inset-0 bg-black/50 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`} onClick={handleClose} />
      <div className={`absolute right-0 top-0 h-full w-full sm:w-[520px] bg-[#111418] border-l border-white/10 shadow-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="text-white font-semibold">{isEditMode ? `Edytuj Produkt: ${product.name}` : `Szczegóły Produktu`}</div>
          </div>
          <button className="text-white/80 hover:text-white" onClick={handleClose}><span className="material-symbols-outlined">close</span></button>
        </div>
        <div className="p-4 overflow-y-auto h-[calc(100%-104px)]">
          {product.image && (
            <div className="mb-4 flex justify-center">
              <img src={product.image} alt={product.name} className="w-48 h-auto object-contain rounded-lg border border-white/10" />
            </div>
          )}

          {isEditMode ? (
            <form className="space-y-4">
              {/* Form fields from your existing code */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-300">Nazwa</label>
                <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-700 shadow-sm bg-[#1D2632] text-white focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-300">Kod</label>
                <input type="text" name="code" id="code" value={formData.code} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-700 shadow-sm bg-[#1D2632] text-white focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-300">Cena</label>
                <input type="number" name="price" id="price" value={formData.price ?? ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-700 shadow-sm bg-[#1D2632] text-white focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div>
                <label htmlFor="stock" className="block text-sm font-medium text-gray-300">Stan</label>
                <input type="number" name="stock" id="stock" value={formData.stock ?? ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-700 shadow-sm bg-[#1D2632] text-white focus:border-primary focus:ring-primary sm:text-sm" />
              </div>
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-300">Kategoria</label>
                <select id="category_id" name="category_id" value={formData.category_id ?? ''} onChange={handleChange} className="mt-1 block w-full rounded-md border-gray-700 shadow-sm bg-[#1D2632] text-white focus:border-primary focus:ring-primary sm:text-sm">
                  <option value="">Wybierz kategorię</option>
                  {CATEGORIES.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-white">
              <div>
                <h3 className="text-lg font-bold">{product.name}</h3>
              </div>
              <div className="border-t border-white/10 pt-4">
                <dl className="space-y-2">
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-400">Numer</dt>
                    <dd className="text-sm">{getNumberFromCode(product.code)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-400">Miejsce magazynowe</dt>
                    <dd className="text-sm font-mono bg-gray-800 px-2 py-1 rounded">{product.code}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-400">Cena</dt>
                    <dd className="text-sm">{product.price ?? '-'} PLN</dd>
                  </div>
                   <div className="flex justify-between">
                    <dt className="text-sm font-medium text-gray-400">Stan</dt>
                    <dd className="text-sm">{product.stock ?? '-'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center justify-end p-4 border-t border-white/10 space-x-4">
          {isEditMode ? (
            <>
              <button type="button" onClick={() => setIsEditMode(false)} className="rounded-md py-2 px-4 text-sm font-medium text-gray-300 hover:bg-gray-700">
                Anuluj
              </button>
              <button type="button" onClick={handleUpdate} disabled={isUpdating} className="flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50">
                {isUpdating ? 'Zapisywanie...' : 'Zapisz zmiany'}
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setIsEditMode(true)} className="flex justify-center rounded-md border border-transparent bg-primary py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
              Edytuj
            </button>
          )}
        </div>
      </div>
    </div>
  )
}