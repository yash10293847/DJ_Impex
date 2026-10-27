"use client";

import { Pause, Play } from "lucide-react";
import { preload } from "react-dom";
import { useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import {
  readPlaybackPreference,
  savePlaybackPreference,
  serverPlaybackPreference,
  subscribePlaybackPreference,
} from "@/lib/playback-preference";

/** Restore manual playback before autoplay, including on later visits. */
export function HeroBackgroundVideo({
  src,
  poster,
  label,
  active = true,
  autoplayAllowed = true,
  className,
  style,
}: {
  src: string;
  poster: string;
  label: string;
  active?: boolean;
  autoplayAllowed?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  if (active) preload(poster, { as: "image", fetchPriority: "high" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const id = useId();
  const reduceMotion = useReducedMotion();
  const [manualPlayback, setManualPlayback] = useState<boolean | null>(null);
  const [playing, setPlaying] = useState(false);
  const [inView, setInView] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const preference = useSyncExternalStore(
    subscribePlaybackPreference,
    readPlaybackPreference,
    serverPlaybackPreference,
  );
  const playback =
    manualPlayback ??
    (preference === "playing" || (preference === "auto" && reduceMotion === false && autoplayAllowed));
  const shouldPlay = active && inView && pageVisible && preference !== "pending" && playback;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting));
    const visibilityChanged = () => setPageVisible(!document.hidden);
    observer.observe(video);
    visibilityChanged();
    document.addEventListener("visibilitychange", visibilityChanged);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", visibilityChanged);
      video.pause();
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (shouldPlay) void video.play().catch(() => undefined);
    else video.pause();
  }, [shouldPlay, src]);

  const toggle = () => {
    const video = videoRef.current;
    if (!video) return;
    const next = video.paused;
    setManualPlayback(next);
    savePlaybackPreference(next);
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
          className="bg-navy-deep/80 hover:bg-navy-deep absolute top-24 right-4 z-30 flex min-h-11 items-center gap-2 rounded-full border border-white/60 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:top-28 sm:right-8"
        >
          {playing ? <Pause aria-hidden="true" size={16} /> : <Play aria-hidden="true" size={16} />}
          <span>{playing ? "Pause" : "Play"}</span>
        </button>
      ) : null}
    </>
  );
}
