'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type ChangeEvent,
} from 'react';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  EyeOff,
} from 'lucide-react';

/* ═══════════════════════════════════════════════════════════════
   PhaseExplainerVideo
   ───────────────────────────────────────────────────────────────
   A fully custom, brand-compliant video player widget designed
   to sit flush beneath the phase header. Zero browser chrome.

   Features
   ────────
   • Custom play/pause, scrub bar, volume, fullscreen controls
   • Thumbnail poster image shown before first play
   • Title overlay with phase label
   • Per-phase localStorage dismiss ("Hide Video" → collapsed bar)
   • "Re-watch" chip to restore from collapsed state

   Props
   ─────
   • phaseKey    — unique string used as localStorage scope key
                   (e.g. "phase-1")
   • title       — Player title overlay text
   • src         — Video URL (mp4 / HLS / etc.)
   • poster?     — Optional thumbnail image URL
   • duration?   — Optional display duration string (e.g. "2:45")

   Dismiss persistence
   ───────────────────
   Key: `pw_explainer_dismissed_${phaseKey}`
   Value: "true" | absent
   ═══════════════════════════════════════════════════════════════ */

/* ─── Types ─────────────────────────────────────────────────── */
export interface PhaseExplainerVideoProps {
  phaseKey: string;
  title: string;
  src: string;
  poster?: string;
  duration?: string;
  description?: string;
}

/* ─── Helpers ────────────────────────────────────────────────── */
function fmtTime(seconds: number): string {
  if (!isFinite(seconds) || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function storageKey(phaseKey: string) {
  return `pw_explainer_dismissed_${phaseKey}`;
}

/* ─── Sub-component: collapsed "Re-watch" chip ───────────────── */
function ReWatchChip({
  title,
  duration,
  description,
  onRestore,
}: {
  title: string;
  duration?: string;
  description?: string;
  onRestore: () => void;
}) {
  return (
    <div
      className="flex items-center justify-between px-5 py-3"
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #A5A5A5',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Mini play icon */}
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: '#F2F2F2', border: '1px solid #A5A5A5' }}
        >
          <Play
            className="w-3 h-3"
            style={{ color: '#595959', marginLeft: 1 }}
            strokeWidth={2}
          />
        </div>
        <div>
          <p className="text-[11px] font-bold" style={{ color: '#595959' }}>
            {title}
          </p>
          {duration && (
            <p className="text-[10px] font-medium" style={{ color: '#7F7F7F' }}>
              {duration} · {description || 'Explainer video'}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={onRestore}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 hover:bg-[#F2F2F2]"
        style={{
          border: '1px solid #A5A5A5',
          color: '#595959',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}
        aria-label="Show explainer video"
      >
        <ChevronDown className="w-3 h-3" strokeWidth={2} />
        Watch
      </button>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */
export function PhaseExplainerVideo({
  phaseKey,
  title,
  src,
  poster,
  duration,
  description,
}: PhaseExplainerVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  /* ── Dismiss / visibility state ── */
  const [dismissed, setDismissed] = useState<boolean>(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey(phaseKey));
    setDismissed(stored === 'true');
    setHasHydrated(true);
  }, [phaseKey]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem(storageKey(phaseKey), 'true');
    // Pause video if playing when dismissed
    videoRef.current?.pause();
  }, [phaseKey]);

  const handleRestore = useCallback(() => {
    setDismissed(false);
    localStorage.removeItem(storageKey(phaseKey));
  }, [phaseKey]);

  /* ── Playback state ── */
  const [isPlaying, setIsPlaying]   = useState(false);
  const [isMuted, setIsMuted]       = useState(false);
  const [isEnded, setIsEnded]       = useState(false);
  const [hasStarted, setHasStarted] = useState(false);

  /* ── Progress state ── */
  const [currentTime, setCurrentTime] = useState(0);
  const [duration_s, setDuration_s]   = useState(0);
  const [buffered, setBuffered]        = useState(0);
  const [scrubbing, setScrubbing]      = useState(false);

  /* ── Hover to show controls ── */
  const [controlsVisible, setControlsVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = () => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (!scrubbing) setControlsVisible(false);
    }, 2500);
  };

  /* ── Video event handlers ── */
  const onTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || scrubbing) return;
    setCurrentTime(v.currentTime);
    if (v.buffered.length > 0) {
      setBuffered((v.buffered.end(v.buffered.length - 1) / v.duration) * 100);
    }
  };

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (v) setDuration_s(v.duration);
  };

  const onPlay  = () => { setIsPlaying(true);  setIsEnded(false); };
  const onPause = () => setIsPlaying(false);
  const onEnded = () => { setIsPlaying(false); setIsEnded(true); };

  /* ── Controls ── */
  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (isEnded) {
      v.currentTime = 0;
      setIsEnded(false);
    }
    if (v.paused) {
      v.play();
      setHasStarted(true);
    } else {
      v.pause();
    }
    showControls();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const onScrubChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = parseFloat(e.target.value);
    v.currentTime = t;
    setCurrentTime(t);
  };

  const onScrubStart = () => setScrubbing(true);
  const onScrubEnd   = () => setScrubbing(false);

  const enterFullscreen = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.requestFullscreen) v.requestFullscreen();
  };

  const replay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    v.play();
    setIsEnded(false);
    setHasStarted(true);
  };

  /* ── Progress bar percentage ── */
  const progressPct = duration_s > 0 ? (currentTime / duration_s) * 100 : 0;

  /* ── Don't flash on SSR ── */
  if (!hasHydrated) return null;

  /* ── Collapsed state ── */
  if (dismissed) {
    return (
      <ReWatchChip
        title={title}
        duration={duration}
        description={description}
        onRestore={handleRestore}
      />
    );
  }

  /* ─────────────────────────────────────────────────────────────
     Full player
     ───────────────────────────────────────────────────────────── */
  return (
    <div
      style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #A5A5A5',
      }}
    >
      {/* ── Player header ── */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid #E8E8E8' }}
      >
        <div className="flex items-center gap-2.5">
          {/* Video icon dot */}
          <div
            className="w-2 h-2 rounded-full shrink-0"
            style={{ background: '#595959' }}
          />
          <p
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: '#595959' }}
          >
            {title}
          </p>
          {duration && (
            <span
              className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-[0.12em]"
              style={{ background: '#F2F2F2', color: '#7F7F7F', border: '1px solid #E8E8E8' }}
            >
              {duration}
            </span>
          )}
          {description && (
            <p className="text-[10px] text-gray-500 hidden sm:block ml-2 border-l pl-3" style={{ borderColor: '#E8E8E8' }}>
              {description}
            </p>
          )}
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-150 hover:bg-[#F2F2F2] group"
          style={{
            border: '1px solid #A5A5A5',
            color: '#7F7F7F',
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
          }}
          aria-label="Hide explainer video"
        >
          <EyeOff className="w-3 h-3" strokeWidth={2} />
          <span className="hidden sm:inline">Hide Video</span>
        </button>
      </div>

      {/* ── Video container ── */}
      <div
        className="relative w-full overflow-hidden"
        style={{
          /* 16:9 collapsed to a comfortable 280px max height */
          maxHeight: 280,
          background: '#0A0A0A',
          cursor: 'pointer',
        }}
        onMouseMove={showControls}
        onMouseEnter={showControls}
        onMouseLeave={() => {
          if (!scrubbing && !isEnded) {
            hideTimer.current = setTimeout(() => setControlsVisible(false), 800);
          }
        }}
        onClick={togglePlay}
      >
        {/* Native video — no controls attribute */}
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          onTimeUpdate={onTimeUpdate}
          onLoadedMetadata={onLoadedMetadata}
          onPlay={onPlay}
          onPause={onPause}
          onEnded={onEnded}
          style={{
            width: '100%',
            height: '100%',
            maxHeight: 280,
            display: 'block',
            objectFit: 'cover',
          }}
          playsInline
          preload="metadata"
        />

        {/* ── Big play button (pre-start poster state) ── */}
        {!hasStarted && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.28)' }}
            aria-hidden="true"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center transition-transform duration-200 hover:scale-105"
              style={{
                background: 'rgba(255,255,255,0.95)',
                boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
              }}
            >
              <Play className="w-7 h-7" style={{ color: '#1A1A1A', marginLeft: 3 }} strokeWidth={2} />
            </div>
          </div>
        )}

        {/* ── Replay overlay (ended state) ── */}
        {isEnded && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center gap-3"
            style={{ background: 'rgba(0,0,0,0.55)' }}
          >
            <button
              onClick={(e) => { e.stopPropagation(); replay(); }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all duration-150 hover:scale-105"
              style={{ background: '#FFFFFF', color: '#1A1A1A', fontWeight: 700, fontSize: 12, letterSpacing: '0.1em' }}
            >
              <RotateCcw className="w-4 h-4" strokeWidth={2} />
              Replay
            </button>
          </div>
        )}

        {/* ── Controls overlay (hover) ── */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col transition-all duration-300"
          style={{
            opacity: controlsVisible || !isPlaying ? 1 : 0,
            pointerEvents: controlsVisible || !isPlaying ? 'auto' : 'none',
            background: 'linear-gradient(to top, rgba(0,0,0,0.72) 0%, transparent 100%)',
            paddingTop: 24,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Scrub bar ── */}
          <div className="px-4 pb-1 relative" style={{ height: 20 }}>
            {/* Buffered track */}
            <div
              className="absolute left-4 right-4 top-1/2 -translate-y-1/2 rounded-full overflow-hidden"
              style={{ height: 3, background: 'rgba(255,255,255,0.2)' }}
              aria-hidden="true"
            >
              <div
                style={{ width: `${buffered}%`, height: '100%', background: 'rgba(255,255,255,0.35)' }}
              />
            </div>
            {/* Progress track */}
            <div
              className="absolute left-4 right-4 top-1/2 -translate-y-1/2 rounded-full overflow-hidden pointer-events-none"
              style={{ height: 3 }}
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full transition-all duration-100"
                style={{ width: `${progressPct}%`, background: '#FFFFFF' }}
              />
            </div>
            {/* Range input (invisible but interactive) */}
            <input
              type="range"
              min={0}
              max={duration_s || 100}
              step={0.1}
              value={currentTime}
              onChange={onScrubChange}
              onMouseDown={onScrubStart}
              onMouseUp={onScrubEnd}
              onTouchStart={onScrubStart}
              onTouchEnd={onScrubEnd}
              className="pw-scrub absolute left-4 right-4 top-1/2 -translate-y-1/2 w-[calc(100%-2rem)] h-3 cursor-pointer"
              style={{
                WebkitAppearance: 'none',
                appearance: 'none',
                background: 'transparent',
                outline: 'none',
              }}
              aria-label="Video progress"
            />
          </div>

          {/* ── Bottom control row ── */}
          <div className="flex items-center gap-3 px-4 pb-3 pt-1">
            {/* Play / Pause */}
            <button
              onClick={togglePlay}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/10"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" style={{ color: '#FFFFFF' }} strokeWidth={2} />
              ) : (
                <Play className="w-4 h-4" style={{ color: '#FFFFFF', marginLeft: 1 }} strokeWidth={2} />
              )}
            </button>

            {/* Mute */}
            <button
              onClick={toggleMute}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/10"
              aria-label={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" style={{ color: '#FFFFFF' }} strokeWidth={2} />
              ) : (
                <Volume2 className="w-4 h-4" style={{ color: '#FFFFFF' }} strokeWidth={2} />
              )}
            </button>

            {/* Timestamp */}
            <span
              className="text-[10px] font-bold tabular-nums"
              style={{ color: 'rgba(255,255,255,0.85)' }}
            >
              {fmtTime(currentTime)} / {fmtTime(duration_s)}
            </span>

            <div className="flex-1" />

            {/* Fullscreen */}
            <button
              onClick={enterFullscreen}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 hover:bg-white/10"
              aria-label="Enter fullscreen"
            >
              <Maximize2 className="w-3.5 h-3.5" style={{ color: '#FFFFFF' }} strokeWidth={2} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Named export for convenience ──────────────────────────── */
export default PhaseExplainerVideo;
