"use client";

import { Pause, Play } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";

/** Manual playback choices persist when slides or autoplay preferences change. */
export function HeroBackgroundVideo({
  src, poster, label, active = true, autoplayAllowed = true, className, style,
}: {
  src: string;
  poster: string;
  label: string;
  active?: boolean;
  autoplayAllowed?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const id = useId();
  const reduceMotion = useReducedMotion();
  const [manualPlayback, setManualPlayback] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const shouldPlay = active && (manualPlayback ?? (reduceMotion === false && autoplayAllowed));

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) void video.play().catch(() => undefined);
    else video.pause();
    return () => video.pause();
  }, [shouldPlay, src]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = video.paused;
    setManualPlayback(next);
    // Call play during the user gesture, including when autoplay was refused.
    if (next) void video.play().catch(() => undefined);
    else video.pause();
  };

  return (
    <>
      <video
        id={id}
        ref={videoRef}
        className={className}
        style={style}
        poster={poster}
        preload="none"
        muted
        loop
        playsInline
        aria-hidden="true"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setPlaying(false)}
      >
        <source src={src} type="video/mp4" />
      </video>
      {active ? (
        <button
          type="button"
          onClick={toggle}
          aria-label={`${playing ? "Pause" : "Play"} ${label}`}
          aria-controls={id}
          className="absolute right-4 top-24 z-30 flex min-h-11 items-center gap-2 rounded-full border border-white/60 bg-navy-deep/80 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-navy-deep focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:right-8 sm:top-28"
        >
          {playing ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
      ) : null}
    </>
  );
}
