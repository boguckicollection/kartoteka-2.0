import { useCallback, useEffect, useRef, useState } from 'react';

type LivePricingScanOptions = {
  enabled: boolean;
  apiBase: string;
  onResult: (data: any) => void;
  onScan: () => void;
  onSound: (sound: 'success' | 'fail') => void;
  intervalMs?: number;
};

export function useLivePricingScan({ enabled, apiBase, onResult, onScan, onSound, intervalMs = 800 }: LivePricingScanOptions) {
  const [analyzing, setAnalyzing] = useState(false);
  const [status, setStatus] = useState('Inicjalizacja...');
  const [initStatus, setInitStatus] = useState('');
  const onResultRef = useRef(onResult);
  const [zoomCaps, setZoomCaps] = useState<{min: number, max: number, step: number} | null>(null);
  const [isStreamReady, setIsStreamReady] = useState(false);
  const [detectionHistory, setDetectionHistory] = useState<any[]>([]);

  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const [canvasNode, setCanvasNode] = useState<HTMLCanvasElement | null>(null);

  const videoRef = useCallback((node: HTMLVideoElement) => {
    if (node !== null) {
      setVideoNode(node);
    }
  }, []);

  const canvasRef = useCallback((node: HTMLCanvasElement) => {
    if (node !== null) {
      setCanvasNode(node);
    }
  }, []);

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const setZoom = useCallback(async (zoomValue: number) => {
    if (!videoNode?.srcObject) return;
    const stream = videoNode.srcObject as MediaStream;
    const track = stream.getVideoTracks()[0];
    try {
        await track.applyConstraints({ advanced: [{ zoom: zoomValue }] });
    } catch (err) {
        console.error('Zoom failed', err);
        setInitStatus('Błąd przy zmianie zoomu');
    }
  }, [videoNode]);

  useEffect(() => {
    if (!enabled || !videoNode || !canvasNode) {
      return;
    }

    let aborted = false;

    const start = async () => {
      try {
        // Request HD camera quality for better card recognition
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: 'environment',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 },
            aspectRatio: { ideal: 16/9 }
          }
        });
        if (aborted) return;
        videoNode.srcObject = stream;
        await videoNode.play();

        const track = stream.getVideoTracks()[0];
        const capabilities = track.getCapabilities();
        if (capabilities.zoom) {
            setZoomCaps({min: capabilities.zoom.min, max: capabilities.zoom.max, step: capabilities.zoom.step});
        } else {
            setInitStatus("Powiększenie nie jest wspierane.")
        }

        canvasNode.width = videoNode.videoWidth;
        canvasNode.height = videoNode.videoHeight;
        setIsStreamReady(true);
      } catch (err) {
        setInitStatus('Błąd kamery. Sprawdź uprawnienia.');
      }
    };

    start();

    return () => {
      aborted = true;
      if (videoNode.srcObject) {
        (videoNode.srcObject as MediaStream).getTracks().forEach(track => track.stop());
      }
    };
  }, [enabled, videoNode, canvasNode]);

  useEffect(() => {
    if (!isStreamReady || !videoNode || !canvasNode) {
        return;
    }

    let aborted = false;
    const video = videoNode;
    const canvas = canvasNode;

    const STABILITY_THRESHOLD = 10; // Max pixel deviation
    const STABILITY_COUNT = 4; // Number of frames to check

    const isStable = (history: any[]) => {
        if (history.length < STABILITY_COUNT) return false;

        const lastItems = history.slice(-STABILITY_COUNT);
        const first = lastItems[0];

        for (let i = 1; i < lastItems.length; i++) {
            if (Math.abs(lastItems[i].x - first.x) > STABILITY_THRESHOLD ||
                Math.abs(lastItems[i].y - first.y) > STABILITY_THRESHOLD ||
                Math.abs(lastItems[i].w - first.w) > STABILITY_THRESHOLD ||
                Math.abs(lastItems[i].h - first.h) > STABILITY_THRESHOLD) {
                return false;
            }
        }
        return true;
    };

    const loop = async () => {
        if (aborted) return;

        let shouldPause = false;

        try {
            setStatus('Szukam karty...');
            const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            onScan();
            const dataUrl = canvas.toDataURL('image/jpeg', 0.92); // Higher quality for better OCR

            const probeRes = await fetch(`${apiBase}/scan/probe`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ image: dataUrl }),
            });

            if (!probeRes.ok) {
                setStatus('Błąd serwera (probe)');
                setDetectionHistory([]);
                shouldPause = true;
                return;
            }

            const probeData = await probeRes.json();

            if (probeData.overlay) {
                const { x, y, w, h } = probeData.overlay;
                ctx.strokeStyle = 'lime';
                ctx.lineWidth = 5;
                ctx.strokeRect(x, y, w, h);
            }

            if (probeData?.status === 'card' && probeData?.quality > 0.65) {
                const newHistory = [...detectionHistory, probeData.overlay];
                setDetectionHistory(newHistory);

                if (isStable(newHistory)) {
                    setAnalyzing(true);
                     setStatus('Karta stabilna, rozpoznaję...');
                    
                    // NEW: Use the lightweight estimate_from_image endpoint
                    const priceRes = await fetch(`${apiBase}/pricing/estimate_from_image`, {
                        method: 'POST',
                        headers: { 
                            'Content-Type': 'application/json',
                            'ngrok-skip-browser-warning': 'true'
                        },
                        body: JSON.stringify({ image: dataUrl }),
                    });

                    setDetectionHistory([]); // Reset after attempt

                    if (priceRes.ok) {
                        const priceData = await priceRes.json();
                        onResultRef.current(priceData);
                        onSound('success');
                        setStatus('Znaleziono cenę!');
                        shouldPause = true;
                        await new Promise(r => setTimeout(r, 3000)); // Pause after success
                    } else {
                        const errData = await priceRes.json();
                        setStatus(errData.error || 'Nie znaleziono ceny.');
                        onSound('fail');
                        shouldPause = true;
                    }
                } else {
                    setStatus('Wykryto kartę, trzymaj stabilnie...');
                }
            } else {
                setDetectionHistory([]); // Reset if card not detected
                if (probeData?.status !== 'card') {
                    setStatus('Nie wykryto karty. Spróbuj na jednolitym tle.');
                } else if (probeData?.quality <= 0.65) {
                    setStatus('Niska jakość obrazu. Popraw oświetlenie i ostrość.');
                }
                shouldPause = true;
            }

        } catch (err) {
            console.error('Scan Error:', err);
            setStatus('Wystąpił błąd skanowania.');
            onSound('fail');
            setDetectionHistory([]);
            shouldPause = true;
        } finally {
            setAnalyzing(false);
            if (!aborted) {
                setTimeout(loop, shouldPause ? 1500 : 200); // Faster loop, longer pause
            }
        }
    };

    loop();

      return () => {
          aborted = true;
      }

  }, [isStreamReady, videoNode, canvasNode, apiBase, intervalMs, onScan, onSound]);

  return { analyzing, status, initStatus, videoRef, canvasRef, setZoom, zoomCaps };
}
