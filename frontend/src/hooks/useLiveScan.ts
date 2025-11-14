import { useCallback, useEffect, useRef, useState } from 'react'

type LiveScanOptions = {
  enabled: boolean
  apiBase: string
  sessionId: number | null
  onResult: (data: any, dataUrl: string) => void
  intervalMs?: number
  autoPauseOnHit?: boolean
}

export function useLiveScan({ enabled, apiBase, sessionId, onResult, intervalMs = 650, autoPauseOnHit = true }: LiveScanOptions){
  const [analyzing, setAnalyzing] = useState(false)
  const [status, setStatus] = useState('')
  const [initStatus, setInitStatus] = useState('Inicjalizacja...')
  const [ripple, setRipple] = useState(false)
  const [paused, setPaused] = useState(false)
  const lastCntRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  
  const [videoNode, setVideoNode] = useState<HTMLVideoElement | null>(null);
  const videoRef = useCallback((node: HTMLVideoElement) => {
    if (node !== null) setVideoNode(node);
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const smallCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioCtxRef = useRef<any | null>(null)
  const pausedRef = useRef(false)
  const scheduleRef = useRef<(() => void) | null>(null)
  const currentIntervalRef = useRef(intervalMs)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const imageCaptureRef = useRef<any | null>(null)
  const [tapFocusSupported, setTapFocusSupported] = useState(false)
  const onResultRef = useRef(onResult)
  const [lowLight, setLowLight] = useState(false)
  const [qualityCommitMin, setQualityCommitMin] = useState(0.55)
  const [qualityProbeWarn, setQualityProbeWarn] = useState(0.45)
  const [qualityLive, setQualityLive] = useState<number|null>(null)
  const [zoomCaps, setZoomCaps] = useState<{min: number, max: number, step: number} | null>(null);

  const [scanState, setScanState] = useState<'SEARCHING' | 'STABILIZING' | 'CAPTURING' | 'PAUSED'>('SEARCHING');
  const [stability, setStability] = useState({ count: 0, lastBox: null as any });

  const setZoom = useCallback(async (zoomValue: number) => {
    if (!trackRef.current) return;
    try {
        await trackRef.current.applyConstraints({ advanced: [{ zoom: zoomValue }] });
    } catch (err) {
        console.error('Zoom failed', err);
        setInitStatus('Błąd przy zmianie zoomu');
    }
  }, [trackRef]);

  // Keep onResult stable to avoid restarting the camera loop on each render
  useEffect(()=>{ onResultRef.current = onResult }, [onResult])

  useEffect(()=>{
    if (!enabled || !videoNode){
      // cleanup when toggled off
      if (timerRef.current){ window.clearInterval(timerRef.current); timerRef.current = null }
      try { streamRef.current?.getTracks().forEach(t=>t.stop()) } catch {}
      streamRef.current = null;
      setAnalyzing(false); setStatus(''); lastCntRef.current = 0; setRipple(false); setPaused(false); pausedRef.current = false
      return
    }

    const isSecure = (window.isSecureContext === true) || ['localhost','127.0.0.1'].includes(location.hostname)
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
      setInitStatus('Brak wsparcia kamery w tej przeglądarce')
      return
    }
    if (!isSecure){ setInitStatus('Kamera wymaga HTTPS lub localhost') }

    let aborted = false

    const start = async () => {
      try {
        // fetch dynamic quality thresholds from backend
        try{
          const rc = await fetch(`${apiBase}/config`).catch(()=>null)
          if (rc && rc.ok){
            const jc = await rc.json().catch(()=>null)
            if (jc && typeof jc.min_quality_commit === 'number') setQualityCommitMin(Number(jc.min_quality_commit))
            if (jc && typeof jc.min_quality_probe_warn === 'number') setQualityProbeWarn(Number(jc.min_quality_probe_warn))
          }
        } catch {}

        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } as any } as any, audio: false })
        if (aborted) { stream.getTracks().forEach(t => t.stop()); return; }

        videoNode.srcObject = stream
        await videoNode.play()

        // prepare canvas
        const canvas = document.createElement('canvas')
        const w = videoNode.videoWidth || 640
        const h = videoNode.videoHeight || 480
        canvas.width = w; canvas.height = h
        const small = document.createElement('canvas'); small.width = 64; small.height = 48

        streamRef.current = stream; canvasRef.current = canvas; smallCanvasRef.current = small
        try {
          const track = stream.getVideoTracks?.()[0] || null
          trackRef.current = track
          const caps: any = track && (track as any).getCapabilities ? (track as any).getCapabilities() : null
          if (caps && 'torch' in caps){ setTorchSupported(true) }
          if (caps && 'zoom' in caps){ setZoomCaps({min: caps.zoom.min, max: caps.zoom.max, step: caps.zoom.step}) }
          else { setInitStatus('Powiększenie nie jest wspierane.') }
          // Try to enable continuous autofocus/exposure if supported
          try {
            const advanced: any = []
            if (caps && (caps.focusMode || (caps as any).focusMode)) advanced.push({ focusMode: 'continuous' })
            if (caps && (caps.exposureMode || (caps as any).exposureMode)) advanced.push({ exposureMode: 'continuous' })
            if (advanced.length>0){ await (track as any).applyConstraints({ advanced }) }
          } catch {}
          try {
            const IC = (window as any).ImageCapture
            if (IC && track) imageCaptureRef.current = new IC(track)
          } catch {}
          try {
            // Heuristic: if focusMode in caps or ImageCapture.setOptions exists, we can try tap-to-focus
            const fm = (caps && (caps as any).focusMode) || null
            const ic = imageCaptureRef.current
            setTapFocusSupported(Boolean(fm) || Boolean(ic && typeof ic.setOptions === 'function'))
          } catch {}
        } catch {}

        const loop = async () => {
          if (aborted) return
          if (pausedRef.current) return
          try {
            setAnalyzing(true)
            setStatus('Analizuję klatkę…')
            const ctx = canvas.getContext('2d')!
            ctx.drawImage(videoNode, 0, 0, w, h)
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
            // quick brightness estimation on downscaled frame
            try {
              const sctx = small.getContext('2d')!
              sctx.drawImage(videoNode, 0, 0, small.width, small.height)
              const img = sctx.getImageData(0,0,small.width, small.height)
              let sum = 0
              for (let i=0;i<img.data.length;i+=4){ const r=img.data[i], g=img.data[i+1], b=img.data[i+2]; sum += (0.2126*r + 0.7152*g + 0.0722*b) }
              const avg = sum / (small.width*small.height) / 255
              if (avg < 0.22) { setStatus('Za ciemno — rozważ włączenie latarki'); setLowLight(true) }
              else if (avg < 0.35) { setStatus('Słabe oświetlenie — zbliż kartę lub doświetl'); setLowLight(true) }
              else { setLowLight(false) }
            } catch {}
            const r = await fetch(`${apiBase}/scan/probe`, {
              method:'POST',
              headers:{'Content-Type':'application/json'},
              body: JSON.stringify({ image: dataUrl, session_id: sessionId })
            })
            if (r.ok){
              const data = await r.json()
              const isCard = data?.status === 'card'
              const cnt = isCard ? 1 : 0
              const noCard = !isCard
              const qv = typeof data?.quality === 'number' ? Number(data.quality) : null
              if (qv!=null) setQualityLive(qv)
              // Surface quality hints if provided by backend
              try { if (typeof data?.quality === 'number' && data.quality < 0.5) setStatus('Obraz nieostry — ustal ostrość i ustabilizuj') } catch {}
              if (noCard){
                // While no card is detected, slow down probing to reduce load
                if ((currentIntervalRef.current||0) < Math.max(1000, intervalMs)){
                  currentIntervalRef.current = Math.max(1000, intervalMs)
                  try { scheduleRef.current && scheduleRef.current() } catch {}
                }
              } else {
                // When anything meaningful appears, use the fast interval until pause
                if ((currentIntervalRef.current||0) !== intervalMs){
                  currentIntervalRef.current = intervalMs
                  try { scheduleRef.current && scheduleRef.current() } catch {}
                }
              }
              // Gate on minimal quality: if too low, do not count as a hit; keep scanning
              const MIN_Q = qualityCommitMin
              const WARN_Q = qualityProbeWarn
              let blockedByQuality = false
              if (isCard && qv!=null && qv < MIN_Q){
                blockedByQuality = true
                if (qv < WARN_Q) setStatus('Jakość zbyt niska — doświetl scenę lub użyj latarki')
                else setStatus('Słaba jakość — zbliż kartę lub ustabilizuj')
              }
              if (!blockedByQuality && isCard && lastCntRef.current===0){
                try { onResultRef.current && onResultRef.current({ detected:{}, candidates:[], message:'probe', overlay: data?.overlay, quality: data?.quality }, dataUrl) } catch {}
                setRipple(true); window.setTimeout(()=> setRipple(false), 500)
                try { (navigator as any)?.vibrate?.(60) } catch {}
                try {
                  if (!audioCtxRef.current) {
                    const AC = (window as any).AudioContext || (window as any).webkitAudioContext
                    if (AC) audioCtxRef.current = new AC()
                  }
                  const ac = audioCtxRef.current
                  if (ac && ac.state === 'suspended') { await ac.resume().catch(()=>{}) }
                  if (ac) {
                    const o = ac.createOscillator(); const g = ac.createGain()
                    o.type = 'sine'; o.frequency.value = 1200
                    g.gain.value = 0.001
                    o.connect(g); g.connect(ac.destination)
                    const now = ac.currentTime
                    g.gain.setTargetAtTime(0.05, now, 0.004)
                    g.gain.setTargetAtTime(0.0, now + 0.12, 0.01)
                    o.start(); o.stop(now + 0.18)
                  }
                } catch {}
                // Freeze preview and capture a sharper still if possible
                try {
                  setStatus('Ustalam ostrość…')
                  try { videoNode.pause() } catch {}
                  await new Promise(r=>setTimeout(r, 320))
                  let stillDataUrl = dataUrl
                  try {
                    const ic = imageCaptureRef.current
                    if (ic && ic.takePhoto){
                      const blob = await ic.takePhoto().catch(()=>null)
                      if (blob){ stillDataUrl = await new Promise<string>((res)=>{ const rd = new FileReader(); rd.onload = ()=> res(String(rd.result||'')); rd.readAsDataURL(blob) }) }
                    }
                  } catch {}
                  // Commit once to perform OCR+search and persist
                  try {
                    const r2 = await fetch(`${apiBase}/scan/commit`, {
                      method:'POST', headers:{'Content-Type':'application/json'},
                      body: JSON.stringify({ image: stillDataUrl, session_id: sessionId })
                    })
                    if (r2.ok){ const d2 = await r2.json(); onResultRef.current && onResultRef.current(d2, stillDataUrl) }
                  } catch {}
                } catch {}
                if (autoPauseOnHit){
                  if (timerRef.current){ window.clearInterval(timerRef.current); timerRef.current = null }
                  pausedRef.current = true
                  setPaused(true)
                  setStatus('Zatrzymano kadr — potwierdź odczyt')
                }
              }
              lastCntRef.current = blockedByQuality ? 0 : cnt
              setStatus(noCard ? 'Brak karty' : (blockedByQuality ? 'Wykryto kartę — jakość zbyt niska' : 'Wykryto kartę'))
            }
          } catch {
            // ignore single-frame errors
          } finally {
            setAnalyzing(false)
          }
        }

        const schedule = () => { if (timerRef.current) window.clearInterval(timerRef.current); timerRef.current = window.setInterval(loop, currentIntervalRef.current || intervalMs) }
        scheduleRef.current = schedule
        schedule()
      } catch (e: any){
        const name = e?.name || ''
        if (name==='NotAllowedError') setInitStatus('Zezwól na dostęp do aparatu')
        else if (name==='NotFoundError') setInitStatus('Nie znaleziono kamery')
        else setInitStatus('Błąd dostępu do aparatu')
      }
    }

    start()
    return () => { aborted = true; try { if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null } } catch {}; try { streamRef.current?.getTracks().forEach(t=>t.stop()) } catch {}; streamRef.current = null; }
  }, [enabled, apiBase, intervalMs, videoNode])

  const resume = () => {
    pausedRef.current = false
    setPaused(false)
    try { videoNode && (videoNode as any).play && (videoNode as any).play() } catch {}
    try { if (scheduleRef.current) scheduleRef.current() } catch {}
  }

  const forceCommit = async () => {
    if (!videoNode || !canvasRef.current) return;
    try {
      const video = videoNode;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const stillDataUrl = canvas.toDataURL('image/jpeg', 0.9);
      
      setStatus('Wysyłanie ręcznego skanu…');
      setAnalyzing(true);

      const r2 = await fetch(`${apiBase}/scan/commit`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ image: stillDataUrl, session_id: sessionId })
      });

      if (r2.ok) {
        const d2 = await r2.json();
        onResultRef.current && onResultRef.current(d2, stillDataUrl);
        if (autoPauseOnHit) {
          if (timerRef.current) { window.clearInterval(timerRef.current); timerRef.current = null; }
          pausedRef.current = true;
          setPaused(true);
          setStatus('Zatwierdź ręczny skan');
        }
      } else {
        setStatus('Błąd ręcznego skanowania');
      }
    } catch (e) {
      console.error('forceCommit failed', e);
      setStatus('Błąd ręcznego skanowania');
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleTorch = async () => {
    try {
      const track: any = trackRef.current
      if (!track) return
      const caps = track.getCapabilities ? track.getCapabilities() : null
      if (!caps || !('torch' in caps)) return
      const next = !torchOn
      await track.applyConstraints({ advanced: [{ torch: next }] })
      setTorchOn(next)
    } catch {}
  }

  const focusAt = async (x: number, y: number) => {
    try {
      const t: any = trackRef.current
      if (!t) return
      const caps = t.getCapabilities ? t.getCapabilities() : null
      setStatus('Ustawianie ostrości…')
      // Prefer track constraints with single-shot focus and pointsOfInterest if the UA supports it
      const adv: any[] = []
      const hasFM = caps && ('focusMode' in caps)
      if (hasFM) {
        const modes: string[] = (caps as any).focusMode || []
        if (modes.includes && modes.includes('single-shot')) adv.push({ focusMode: 'single-shot' })
        else if (modes.includes && modes.includes('continuous')) adv.push({ focusMode: 'continuous' })
      }
      // non-standard but some browsers accept pointsOfInterest
      adv.push({ pointsOfInterest: [{ x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) }] })
      try { if (adv.length) await t.applyConstraints({ advanced: adv }) } catch {}
      // Fallback via ImageCapture options
      try {
        const ic = imageCaptureRef.current
        if (ic && typeof ic.setOptions === 'function'){
          await ic.setOptions({ pointsOfInterest: [{ x, y }] }).catch(()=>{})
        }
      } catch {}
      // Small haptic
      try { (navigator as any)?.vibrate?.(20) } catch {}
      // Return to continuous after a short delay if available
      try {
        if (hasFM) {
          setTimeout(async ()=>{ try { await t.applyConstraints({ advanced:[{ focusMode: 'continuous' }] }) } catch {} }, 800)
        }
      } catch {}
      setStatus('Oczekiwanie na ostrość…')
    } catch {}
  }

  return { analyzing, status, initStatus, ripple, paused, resume, torchSupported, torchOn, toggleTorch, tapFocusSupported, focusAt, lowLight, qualityCommitMin, qualityLive, forceCommit, videoRef, zoomCaps, setZoom }
}
