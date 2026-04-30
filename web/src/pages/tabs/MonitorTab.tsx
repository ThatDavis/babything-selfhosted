import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

const STREAM_URL = '/hls/cam/index.m3u8'
const RETRY_DELAY = 6000

type Status = 'loading' | 'playing' | 'error'

export default function MonitorTab() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const hlsRef   = useRef<Hls | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [audioOnly, setAudioOnly]   = useState(false)
  const [status, setStatus]         = useState<Status>('loading')
  const [volume, setVolume]         = useState(1)
  const [muted, setMuted]           = useState(false)
  const [pipActive, setPipActive]   = useState(false)

  const attach = useCallback((mediaEl: HTMLVideoElement | HTMLAudioElement) => {
    hlsRef.current?.destroy()
    if (retryRef.current) clearTimeout(retryRef.current)
    setStatus('loading')

    if (Hls.isSupported()) {
      const hls = new Hls({ liveSyncDurationCount: 3, enableWorker: true })
      hlsRef.current = hls
      hls.loadSource(STREAM_URL)
      hls.attachMedia(mediaEl)
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        mediaEl.play().catch(() => {})
        setStatus('playing')
      })
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return
        setStatus('error')
        retryRef.current = setTimeout(() => attach(mediaEl), RETRY_DELAY)
      })
    } else if ((mediaEl as HTMLVideoElement).canPlayType?.('application/vnd.apple.mpegurl')) {
      // Safari native HLS
      (mediaEl as HTMLVideoElement).src = STREAM_URL
      mediaEl.play().catch(() => {})
      setStatus('playing')
    } else {
      setStatus('error')
    }
  }, [])

  // (Re-)attach when audio-only mode changes
  useEffect(() => {
    const el = audioOnly ? audioRef.current : videoRef.current
    if (el) attach(el)
    return () => {
      hlsRef.current?.destroy()
      hlsRef.current = null
      if (retryRef.current) clearTimeout(retryRef.current)
    }
  }, [audioOnly, attach])

  // Sync volume/mute to active element
  useEffect(() => {
    const el = audioOnly ? audioRef.current : videoRef.current
    if (!el) return
    el.volume = volume
    el.muted  = muted
  }, [volume, muted, audioOnly])

  // Track PiP state changes
  useEffect(() => {
    const handler = () => setPipActive(!!document.pictureInPictureElement)
    document.addEventListener('enterpictureinpicture', handler)
    document.addEventListener('leavepictureinpicture', handler)
    return () => {
      document.removeEventListener('enterpictureinpicture', handler)
      document.removeEventListener('leavepictureinpicture', handler)
    }
  }, [])

  function togglePiP() {
    if (!videoRef.current) return
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {})
    } else {
      videoRef.current.requestPictureInPicture().catch(() => {})
    }
  }

  function switchMode(toAudio: boolean) {
    // Exit PiP before hiding video
    if (!toAudio && document.pictureInPictureElement) document.exitPictureInPicture().catch(() => {})
    setAudioOnly(toAudio)
  }

  const statusDot = status === 'playing'
    ? 'bg-green-500'
    : status === 'error'
    ? 'bg-red-500'
    : 'bg-amber-400 animate-pulse'

  const statusText = status === 'playing'
    ? 'Live'
    : status === 'error'
    ? 'Camera offline — retrying…'
    : 'Connecting…'

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-2xl">
        <button onClick={() => switchMode(false)}
          className={`py-2 rounded-xl text-sm font-semibold transition-colors ${!audioOnly ? 'bg-white shadow-sm' : 'text-stone-500'}`}>
          📹 Video
        </button>
        <button onClick={() => switchMode(true)}
          className={`py-2 rounded-xl text-sm font-semibold transition-colors ${audioOnly ? 'bg-white shadow-sm' : 'text-stone-500'}`}>
          🎧 Audio only
        </button>
      </div>

      {/* Video player */}
      <div className={`relative bg-black rounded-2xl overflow-hidden ${audioOnly ? 'hidden' : 'block'}`}>
        <video
          ref={videoRef}
          className="w-full aspect-video"
          autoPlay
          playsInline
          muted={muted}
        />
        {status !== 'playing' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/70">
            {status === 'loading'
              ? <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
              : <p className="text-white text-sm">Camera offline</p>
            }
          </div>
        )}
      </div>

      {/* Audio-only card */}
      {audioOnly && (
        <div className="card flex flex-col items-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-3xl">
            {status === 'playing' ? '🎵' : status === 'loading' ? '⏳' : '📵'}
          </div>
          <div className="text-center">
            <p className="font-semibold text-stone-700">Audio monitor active</p>
            <p className="text-xs text-stone-400 mt-1">Keep this tab open — audio continues in background</p>
          </div>
          <audio ref={audioRef} autoPlay playsInline className="hidden" />
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full inline-block ${statusDot}`} />
          <span className="text-xs text-stone-500">{statusText}</span>
        </div>
        <span className="text-xs text-stone-400">/hls/cam</span>
      </div>

      {/* Controls */}
      <div className="card space-y-3">
        {/* Volume */}
        <div className="flex items-center gap-3">
          <button onClick={() => setMuted(m => !m)} className="text-stone-500 w-5 text-center shrink-0">
            {muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
          </button>
          <input
            type="range" min="0" max="1" step="0.05"
            value={muted ? 0 : volume}
            onChange={e => { setVolume(parseFloat(e.target.value)); setMuted(false) }}
            className="flex-1 h-1.5 accent-brand-500"
          />
        </div>

        {/* PiP (video mode only) */}
        {!audioOnly && (
          <button
            onClick={togglePiP}
            className={`w-full py-2 rounded-xl text-sm font-medium border transition-colors ${pipActive ? 'border-brand-400 text-brand-600 bg-brand-50' : 'border-stone-200 text-stone-600 hover:border-stone-300'}`}
          >
            {pipActive ? 'Exit picture-in-picture' : 'Picture in picture'}
          </button>
        )}
      </div>

      {audioOnly && (
        <p className="text-xs text-stone-400 text-center px-4">
          Audio-only mode streams the same feed. On mobile, keep the screen on or use a browser that allows background audio.
        </p>
      )}
    </div>
  )
}
