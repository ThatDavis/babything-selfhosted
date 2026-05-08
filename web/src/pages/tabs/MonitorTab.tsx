import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'
import { api } from '../../lib/api'

type MonitorMode = 'rtsp' | 'webrtc'

// ── RTSP / HLS Monitor ──────────────────────────────────────

const STREAM_URL = '/hls/cam/index.m3u8'
const RETRY_DELAY = 6000

type RtsStatus = 'loading' | 'playing' | 'error'

function RtsMonitor() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const hlsRef   = useRef<Hls | null>(null)
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [audioOnly, setAudioOnly]   = useState(false)
  const [status, setStatus]         = useState<RtsStatus>('loading')
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
        <span className="text-xs text-stone-400">RTSP / HLS</span>
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

// ── WebRTC Monitor ──────────────────────────────────────────

type WrtcStatus = 'setup' | 'connecting' | 'playing' | 'error'
const POLL_INTERVAL = 2000
const MAX_RETRIES = 3

function WebrtcMonitor() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const pcRef = useRef<RTCPeerConnection | null>(null)
  const icePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(true)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const [status, setStatus] = useState<WrtcStatus>('setup')
  const [agentConnected, setAgentConnected] = useState(false)
  const [token, setToken] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [pipActive, setPipActive] = useState(false)
  const [audioOnly, setAudioOnly] = useState(false)

  // Check agent connection status periodically
  useEffect(() => {
    mountedRef.current = true
    let interval: ReturnType<typeof setInterval>

    async function check() {
      try {
        const s = await api.monitor.status()
        if (!mountedRef.current) return
        setAgentConnected(s.connected)
        if (s.connected && status === 'setup') {
          // Auto-start streaming when agent appears
          startStream()
        }
      } catch {
        setAgentConnected(false)
      }
    }

    check()
    interval = setInterval(check, POLL_INTERVAL)
    return () => {
      mountedRef.current = false
      clearInterval(interval)
    }
  }, [status])

  // Sync volume/mute
  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.volume = volume
    el.muted = muted
  }, [volume, muted])

  // Track PiP state
  useEffect(() => {
    const handler = () => setPipActive(!!document.pictureInPictureElement)
    document.addEventListener('enterpictureinpicture', handler)
    document.addEventListener('leavepictureinpicture', handler)
    return () => {
      document.removeEventListener('enterpictureinpicture', handler)
      document.removeEventListener('leavepictureinpicture', handler)
    }
  }, [])

  // Screen wake lock — keep screen on while monitoring
  useEffect(() => {
    async function acquire() {
      if ('wakeLock' in navigator && status === 'playing') {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        } catch {
          // Not supported or denied — silently ignore
        }
      }
    }
    acquire()
    return () => {
      wakeLockRef.current?.release().catch(() => {})
      wakeLockRef.current = null
    }
  }, [status])

  // Re-acquire wake lock when tab becomes visible again
  useEffect(() => {
    async function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && status === 'playing') {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen')
        } catch {
          // Silently ignore
        }
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [status])

  function cleanupPeerConnection() {
    if (icePollRef.current) {
      clearInterval(icePollRef.current)
      icePollRef.current = null
    }
    if (pcRef.current) {
      pcRef.current.close()
      pcRef.current = null
    }
  }

  const startStream = useCallback(async () => {
    cleanupPeerConnection()
    setStatus('connecting')
    setErrorMsg('')

    try {
      // 1. Get ICE config and create peer connection
      const config = await api.monitor.config()
      const pc = new RTCPeerConnection({ iceServers: config.iceServers })
      pcRef.current = pc

      pc.ontrack = (event) => {
        if (videoRef.current) {
          videoRef.current.srcObject = event.streams[0]
        }
        if (event.track.kind === 'video') {
          setStatus('playing')
        }
      }

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          setStatus('error')
          setErrorMsg('Connection lost')
          cleanupPeerConnection()
        }
      }

      // Request video and audio reception
      pc.addTransceiver('video', { direction: 'recvonly' })
      pc.addTransceiver('audio', { direction: 'recvonly' })

      // 2. Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // 3. Start watch session and send offer
      const { watchId } = await api.monitor.watch()
      await api.monitor.offer(watchId, offer.sdp!)

      // 4. Wait for answer (with retries)
      let answerSdp: string | null = null
      for (let i = 0; i < MAX_RETRIES && mountedRef.current; i++) {
        try {
          const res = await api.monitor.pollAnswer(watchId)
          if (res.sdp) {
            answerSdp = res.sdp
            break
          }
        } catch {
          // 204 no content → keep polling
        }
        await new Promise(r => setTimeout(r, 1500))
      }

      if (!answerSdp || !mountedRef.current) {
        throw new Error('Agent did not respond in time')
      }

      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      // 5. Send local ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          api.monitor.sendIce(watchId, event.candidate).catch(() => {})
        }
      }

      // 6. Poll for remote ICE candidates
      icePollRef.current = setInterval(async () => {
        if (!mountedRef.current || pc.connectionState === 'closed') {
          if (icePollRef.current) clearInterval(icePollRef.current)
          return
        }
        try {
          const res = await api.monitor.pollIce(watchId)
          for (const c of res.candidates) {
            await pc.addIceCandidate(c)
          }
        } catch {
          // ignore polling errors
        }
      }, 1500)

      // Timeout fallback
      setTimeout(() => {
        if (mountedRef.current && status === 'connecting') {
          setStatus('error')
          setErrorMsg('Connection timed out')
          cleanupPeerConnection()
        }
      }, 25000)

    } catch (err: any) {
      if (mountedRef.current) {
        setStatus('error')
        setErrorMsg(err.message || 'Failed to connect')
        cleanupPeerConnection()
      }
    }
  }, [status])

  async function generateToken() {
    try {
      const res = await api.monitor.token()
      setToken(res.token)
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to generate token')
    }
  }

  function copyToken() {
    if (!token) return
    navigator.clipboard.writeText(token).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  function togglePiP() {
    if (!videoRef.current) return
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {})
    } else {
      videoRef.current.requestPictureInPicture().catch(() => {})
    }
  }

  if (status === 'setup' || status === 'error') {
    return (
      <div className="space-y-6 max-w-lg mx-auto">
        <div className="text-center space-y-2">
          <div className="text-4xl">📷</div>
          <h3 className="text-lg font-serif font-semibold text-stone-700">Baby Monitor</h3>
          <p className="text-sm text-stone-500">
            Watch your nursery from anywhere. Set up takes 2 minutes.
          </p>
        </div>

        {!agentConnected ? (
          <div className="card space-y-4">
            <h4 className="font-semibold text-stone-700">Step 1: Generate agent token</h4>
            <p className="text-sm text-stone-500">
              The token lets your local camera bridge authenticate with Babything.
            </p>
            {!token ? (
              <button onClick={generateToken} className="btn-primary w-full">
                Generate Agent Token
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <code className="flex-1 bg-stone-100 rounded-lg px-3 py-2 text-xs break-all font-mono text-stone-600">
                    {token}
                  </code>
                  <button onClick={copyToken} className="btn-ghost text-sm whitespace-nowrap">
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                </div>
              </div>
            )}

            <h4 className="font-semibold text-stone-700 pt-2">Step 2: Run the agent</h4>
            <p className="text-sm text-stone-500">
              On any device on the same network as your camera (Raspberry Pi, old laptop, NAS):
            </p>
            <div className="bg-stone-900 rounded-xl p-4 overflow-x-auto">
              <pre className="text-xs text-green-400 font-mono">
{`docker run -d \\
  -e SERVER_URL=wss://${window.location.host}/monitor/agent \\
  -e RTSP_URL=rtsp://YOUR_CAMERA_IP/stream \\
  -e AGENT_TOKEN=${token || '<your-token>'} \\
  ghcr.io/babything/agent:latest`}
              </pre>
            </div>
            <p className="text-xs text-stone-400">
              Replace <code className="text-stone-500">YOUR_CAMERA_IP</code> with your camera's RTSP URL.
              The agent will appear here automatically when connected.
            </p>
          </div>
        ) : (
          <div className="card text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-2xl mx-auto">
              ✓
            </div>
            <p className="font-semibold text-stone-700">Agent connected</p>
            <button onClick={startStream} className="btn-primary w-full">
              Start watching
            </button>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 text-red-600 text-sm rounded-xl px-4 py-3 text-center">
            {errorMsg}
          </div>
        )}
      </div>
    )
  }

  // Connecting or Playing state
  const statusDot = status === 'playing'
    ? 'bg-green-500'
    : 'bg-amber-400 animate-pulse'

  const statusText = status === 'playing'
    ? 'Live'
    : status === 'connecting'
    ? 'Connecting…'
    : 'Error'

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-2xl">
        <button onClick={() => setAudioOnly(false)}
          className={`py-2 rounded-xl text-sm font-semibold transition-colors ${!audioOnly ? 'bg-white shadow-sm' : 'text-stone-500'}`}>
          📹 Video
        </button>
        <button onClick={() => setAudioOnly(true)}
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
            <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Audio-only card */}
      {audioOnly && (
        <div className="card flex flex-col items-center gap-4 py-8">
          <div className="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-3xl">
            {status === 'playing' ? '🎵' : status === 'connecting' ? '⏳' : '📵'}
          </div>
          <div className="text-center">
            <p className="font-semibold text-stone-700">Audio monitor active</p>
            <p className="text-xs text-stone-400 mt-1">Keep this screen on for continuous audio</p>
          </div>
        </div>
      )}

      {/* Status bar */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full inline-block ${statusDot}`} />
          <span className="text-xs text-stone-500">{statusText}</span>
        </div>
        <span className="text-xs text-stone-400">WebRTC</span>
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
          Audio-only mode reduces battery use. On some devices, audio may pause when the screen locks.
        </p>
      )}
    </div>
  )
}

// ── Monitor Tab Wrapper ─────────────────────────────────────

export default function MonitorTab() {
  const [mode, setMode] = useState<MonitorMode>('rtsp')

  return (
    <div className="space-y-4">
      {/* Protocol toggle */}
      <div className="grid grid-cols-2 gap-2 bg-stone-100 p-1 rounded-2xl">
        <button onClick={() => setMode('rtsp')}
          className={`py-2 rounded-xl text-sm font-semibold transition-colors ${mode === 'rtsp' ? 'bg-white shadow-sm' : 'text-stone-500'}`}>
          📡 RTSP / HLS
        </button>
        <button onClick={() => setMode('webrtc')}
          className={`py-2 rounded-xl text-sm font-semibold transition-colors ${mode === 'webrtc' ? 'bg-white shadow-sm' : 'text-stone-500'}`}>
          🌐 WebRTC
        </button>
      </div>

      {mode === 'rtsp' ? <RtsMonitor /> : <WebrtcMonitor />}
    </div>
  )
}
