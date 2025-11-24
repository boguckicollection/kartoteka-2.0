import React, { useState, useCallback, useEffect, useRef } from 'react';

type BatchItem = {
  id: number;
  filename: string;
  status: 'pending' | 'processing' | 'success' | 'failed';
  image_url?: string;
  detected_name?: string;
  detected_set?: string;
  detected_number?: string;
  matched_name?: string;
  matched_set?: string;
  matched_number?: string;
  matched_image?: string;
  match_score?: number;
  price_eur?: number;
  price_pln?: number;
  fields_complete?: number;
  fields_total?: number;
  error_message?: string;
  publish_status?: string;
  warehouse_code?: string;
};

type BatchStatus = {
  batch_id: number;
  status: 'pending' | 'processing' | 'completed';
  total_items: number;
  processed_items: number;
  successful_items: number;
  failed_items: number;
  current_filename?: string;
  progress_percent: number;
};

type Props = {
  apiBase: string;
  onBack: () => void;
};

export default function BatchScanView({ apiBase, onBack }: Props) {
  const [batchId, setBatchId] = useState<number | null>(null);
  const [status, setStatus] = useState<BatchStatus | null>(null);
  const [items, setItems] = useState<BatchItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<BatchItem | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const processingRef = useRef(false);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Handle file upload
  const handleUpload = async (files: FileList | File[]) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      setToast('Wybierz pliki graficzne (JPG, PNG)');
      return;
    }

    setIsUploading(true);
    try {
      const fd = new FormData();
      imageFiles.forEach(file => fd.append('files', file));

      const res = await fetch(`${apiBase}/batch/start`, {
        method: 'POST',
        body: fd,
      });
      const data = await res.json();
      
      if (res.ok) {
        setBatchId(data.batch_id);
        setStatus({
          batch_id: data.batch_id,
          status: 'pending',
          total_items: data.total_items,
          processed_items: 0,
          successful_items: 0,
          failed_items: 0,
          progress_percent: 0,
        });
        // Set initial items with filename as temporary key
        setItems(data.items.map((it: any, idx: number) => ({
          id: idx,
          filename: it.filename,
          status: it.status || 'pending',
        })));
        setToast(`Wgrano ${imageFiles.length} plikow`);
        
        // Fetch full items list from backend to get real IDs
        try {
          const itemsRes = await fetch(`${apiBase}/batch/${data.batch_id}/items`);
          const itemsData = await itemsRes.json();
          if (itemsRes.ok && itemsData.items) {
            setItems(itemsData.items);
          }
        } catch (e) {
          console.error('Failed to fetch items after upload:', e);
        }
      } else {
        setToast(data.error || 'Blad wgrywania');
      }
    } catch (e) {
      setToast('Blad sieci');
    } finally {
      setIsUploading(false);
    }
  };

  // Start processing
  const startProcessing = async () => {
    if (!batchId || processingRef.current) return;
    processingRef.current = true;
    setIsProcessing(true);

    while (processingRef.current) {
      try {
        const res = await fetch(`${apiBase}/batch/${batchId}/analyze-next`, {
          method: 'POST',
        });
        const data = await res.json();

        if (data.status === 'completed') {
          // All done
          processingRef.current = false;
          setIsProcessing(false);
          await refreshItems();
          await refreshStatus();
          setToast('Analiza zakonczona!');
          break;
        }

        if (data.status === 'processed' && data.item) {
          // Update item in list
          setItems(prev => prev.map(it => 
            it.filename === data.item.filename ? { ...it, ...data.item } : it
          ));
          // Update progress
          if (data.progress) {
            setStatus(prev => prev ? {
              ...prev,
              processed_items: data.progress.processed,
              progress_percent: data.progress.percent,
              current_filename: data.item.filename,
            } : null);
          }
        }
      } catch (e) {
        console.error('Processing error:', e);
        processingRef.current = false;
        setIsProcessing(false);
        setToast('Blad podczas analizy');
        break;
      }
    }
  };

  const stopProcessing = () => {
    processingRef.current = false;
    setIsProcessing(false);
  };

  const refreshItems = async () => {
    if (!batchId) return;
    try {
      const res = await fetch(`${apiBase}/batch/${batchId}/items`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
      }
    } catch (e) {
      console.error('Failed to refresh items:', e);
    }
  };

  const refreshStatus = async () => {
    if (!batchId) return;
    try {
      const res = await fetch(`${apiBase}/batch/${batchId}/status`);
      const data = await res.json();
      if (res.ok) {
        setStatus(data);
      }
    } catch (e) {
      console.error('Failed to refresh status:', e);
    }
  };

  // Update single item
  const updateItem = async (itemId: number, updates: Partial<BatchItem>) => {
    if (!batchId) return;
    try {
      const res = await fetch(`${apiBase}/batch/${batchId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const data = await res.json();
      if (res.ok) {
        setItems(prev => prev.map(it => it.id === itemId ? { ...it, ...updates } : it));
        setToast('Zapisano zmiany');
      }
    } catch (e) {
      setToast('Blad zapisu');
    }
  };

  // Publish all
  const publishAll = async () => {
    if (!batchId) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`${apiBase}/batch/${batchId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setToast(`Opublikowano: ${data.published_count}, Bledy: ${data.failed_count}`);
        await refreshItems();
      } else {
        setToast(data.error || 'Blad publikacji');
      }
    } catch (e) {
      setToast('Blad sieci');
    } finally {
      setIsPublishing(false);
    }
  };

  // Drag & drop handlers
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  }, []);

  const successItems = items.filter(it => it.status === 'success');
  const failedItems = items.filter(it => it.status === 'failed');
  const readyToPublish = successItems.filter(it => !it.publish_status);

  return (
    <div className="min-h-screen bg-[#0a0f1a] text-white p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-white transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          Wstecz
        </button>
        <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Skanowanie Katalogowe
        </h1>
      </div>

      {/* Upload Zone - show if no batch */}
      {!batchId && (
        <div
          className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
            ${dragActive 
              ? 'border-cyan-400 bg-cyan-500/10' 
              : 'border-gray-600 hover:border-gray-500 bg-gray-800/30'}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => e.target.files && handleUpload(e.target.files)}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-400">Wgrywanie plikow...</p>
            </div>
          ) : (
            <>
              <div className="w-20 h-20 mx-auto mb-4 flex items-center justify-center bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full border border-cyan-500/30">
                <span className="material-symbols-outlined text-4xl text-cyan-400">cloud_upload</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Przeciagnij pliki lub kliknij</h3>
              <p className="text-gray-400 text-sm">Obslugiwane formaty: JPG, PNG, WebP</p>
              <p className="text-gray-500 text-xs mt-2">Mozesz wybrac caly folder ze zdjeciami kart</p>
            </>
          )}
        </div>
      )}

      {/* Batch Processing View */}
      {batchId && status && (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="bg-[#0f172a] border border-gray-700/50 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold">Postep analizy</h3>
                <p className="text-sm text-gray-400">
                  {status.processed_items} / {status.total_items} przetworzonych
                </p>
              </div>
              <div className="flex gap-3">
                {!isProcessing && status.processed_items < status.total_items && (
                  <button
                    onClick={startProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-medium hover:from-cyan-500 hover:to-blue-500 transition-all"
                  >
                    <span className="material-symbols-outlined">play_arrow</span>
                    Rozpocznij analize
                  </button>
                )}
                {isProcessing && (
                  <button
                    onClick={stopProcessing}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 rounded-lg font-medium hover:bg-red-500 transition-all"
                  >
                    <span className="material-symbols-outlined">stop</span>
                    Zatrzymaj
                  </button>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative h-3 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${status.progress_percent}%` }}
              />
            </div>
            
            {/* Stats */}
            <div className="flex gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                <span>Sukces: {status.successful_items}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                <span>Bledy: {status.failed_items}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-gray-500 rounded-full"></span>
                <span>Oczekuje: {status.total_items - status.processed_items}</span>
              </div>
            </div>

            {/* Current file */}
            {isProcessing && status.current_filename && (
              <div className="mt-3 flex items-center gap-2 text-sm text-cyan-400">
                <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Analizuje: {status.current_filename}</span>
              </div>
            )}
          </div>

          {/* Publish Button */}
          {readyToPublish.length > 0 && !isProcessing && (
            <div className="bg-[#0f172a] border border-gray-700/50 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Gotowe do publikacji: {readyToPublish.length}</p>
                  <p className="text-sm text-gray-400">Wszystkie pomyslnie przeanalizowane karty</p>
                </div>
                <button
                  onClick={publishAll}
                  disabled={isPublishing}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg font-medium hover:from-green-500 hover:to-emerald-500 transition-all disabled:opacity-50"
                >
                  {isPublishing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Publikuje...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined">publish</span>
                      Opublikuj wszystkie
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Items List */}
          <div className="space-y-2">
            {items.map((item, index) => (
              <div
                key={`${item.filename}-${index}`}
                onClick={() => setSelectedItem(item)}
                className={`flex items-center gap-4 p-3 bg-[#0f172a] border rounded-xl cursor-pointer transition-all hover:bg-gray-800/50
                  ${item.status === 'success' ? 'border-green-500/50' : ''}
                  ${item.status === 'failed' ? 'border-red-500/50' : ''}
                  ${item.status === 'processing' ? 'border-cyan-500/50' : ''}
                  ${item.status === 'pending' ? 'border-gray-700/50' : ''}
                  ${item.publish_status === 'published' ? 'ring-2 ring-green-400' : ''}`}
              >
                {/* Thumbnail */}
                <div className="w-16 h-20 flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                  {item.matched_image ? (
                    <img
                      src={item.matched_image}
                      alt={item.matched_name || item.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : item.image_url ? (
                    <img
                      src={`${apiBase}${item.image_url}`}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="material-symbols-outlined text-2xl text-gray-600">image</span>
                  )}
                </div>

                {/* Info */}
                <div className="flex-grow min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {item.matched_name || item.filename}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {item.matched_set && (
                      <span className="text-xs text-gray-400">{item.matched_set}</span>
                    )}
                    {item.matched_number && (
                      <span className="text-xs text-cyan-400">#{item.matched_number}</span>
                    )}
                  </div>
                  {item.price_eur && (
                    <p className="text-xs text-green-400 mt-1">{item.price_eur.toFixed(2)} EUR</p>
                  )}
                  {item.error_message && (
                    <p className="text-xs text-red-400 mt-1 truncate">{item.error_message}</p>
                  )}
                </div>

                {/* Progress / Status */}
                <div className="flex-shrink-0 flex items-center gap-3">
                  {item.fields_complete !== undefined && (
                    <div className="text-center">
                      <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-500"
                          style={{ width: `${(item.fields_complete / (item.fields_total || 7)) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-gray-500">
                        {item.fields_complete}/{item.fields_total || 7}
                      </span>
                    </div>
                  )}

                  {/* Status Badge */}
                  <div className="flex-shrink-0">
                    {item.status === 'processing' && (
                      <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      </div>
                    )}
                    {item.status === 'success' && !item.publish_status && (
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-lg">check</span>
                      </div>
                    )}
                    {item.status === 'failed' && (
                      <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-lg">close</span>
                      </div>
                    )}
                    {item.status === 'pending' && (
                      <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-gray-400 text-lg">hourglass_empty</span>
                      </div>
                    )}
                    {item.publish_status === 'published' && (
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-lg">cloud_done</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Drawer */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedItem(null)} />
          <div className="relative w-full max-w-md bg-[#0f172a] border-l border-gray-700 overflow-y-auto">
            <div className="sticky top-0 bg-[#0f172a] border-b border-gray-700 p-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Edytuj karte</h3>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2 hover:bg-gray-700 rounded-lg"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Image Preview */}
              <div className="aspect-[3/4] bg-gray-800 rounded-lg overflow-hidden">
                {selectedItem.matched_image ? (
                  <img
                    src={selectedItem.matched_image}
                    alt={selectedItem.matched_name || ''}
                    className="w-full h-full object-contain"
                  />
                ) : selectedItem.image_url ? (
                  <img
                    src={`${apiBase}${selectedItem.image_url}`}
                    alt={selectedItem.filename}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-gray-600">image</span>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className={`px-3 py-2 rounded-lg text-sm font-medium text-center
                ${selectedItem.status === 'success' ? 'bg-green-500/20 text-green-400' : ''}
                ${selectedItem.status === 'failed' ? 'bg-red-500/20 text-red-400' : ''}
                ${selectedItem.status === 'pending' ? 'bg-gray-500/20 text-gray-400' : ''}
                ${selectedItem.status === 'processing' ? 'bg-cyan-500/20 text-cyan-400' : ''}`}
              >
                {selectedItem.status === 'success' && 'Przeanalizowano pomyslnie'}
                {selectedItem.status === 'failed' && `Blad: ${selectedItem.error_message || 'Nieznany'}`}
                {selectedItem.status === 'pending' && 'Oczekuje na analize'}
                {selectedItem.status === 'processing' && 'Analizowanie...'}
              </div>

              {/* Editable Fields */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Nazwa karty</label>
                  <input
                    type="text"
                    value={selectedItem.matched_name || selectedItem.detected_name || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, matched_name: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Set</label>
                  <input
                    type="text"
                    value={selectedItem.matched_set || selectedItem.detected_set || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, matched_set: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Numer</label>
                    <input
                      type="text"
                      value={selectedItem.matched_number || selectedItem.detected_number || ''}
                      onChange={(e) => setSelectedItem({ ...selectedItem, matched_number: e.target.value })}
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 uppercase tracking-wider">Cena EUR</label>
                    <input
                      type="number"
                      step="0.01"
                      value={selectedItem.price_eur || ''}
                      onChange={(e) => setSelectedItem({ ...selectedItem, price_eur: parseFloat(e.target.value) || undefined })}
                      className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-gray-400 uppercase tracking-wider">Kod magazynowy</label>
                  <input
                    type="text"
                    value={selectedItem.warehouse_code || ''}
                    onChange={(e) => setSelectedItem({ ...selectedItem, warehouse_code: e.target.value })}
                    className="w-full mt-1 px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                </div>
              </div>

              {/* Match Score */}
              {selectedItem.match_score !== undefined && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-400">Dopasowanie:</span>
                  <span className={`font-medium ${selectedItem.match_score > 0.7 ? 'text-green-400' : selectedItem.match_score > 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {Math.round(selectedItem.match_score * 100)}%
                  </span>
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={() => {
                  updateItem(selectedItem.id, {
                    matched_name: selectedItem.matched_name,
                    matched_set: selectedItem.matched_set,
                    matched_number: selectedItem.matched_number,
                    price_eur: selectedItem.price_eur,
                    warehouse_code: selectedItem.warehouse_code,
                  });
                  setSelectedItem(null);
                }}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg font-medium hover:from-cyan-500 hover:to-blue-500 transition-all"
              >
                Zapisz zmiany
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
