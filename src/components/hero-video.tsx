"use client";

import { useEffect, useRef, useState } from "react";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

/** Attach the source only after checking preferences: CSS hiding still downloads video. */
export function HeroVideo({ className }: { className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const mobile = matchMedia("(max-width: 767px)");
    const data = matchMedia("(prefers-reduced-data: reduce)");
    const connection = (navigator as Navigator & { connection?: Connection }).connection;
    const update = () => {
      const enabled = !motion.matches && !mobile.matches && !data.matches &&
        !connection?.saveData && !["slow-2g", "2g", "3g"].includes(connection?.effectiveType ?? "");
      setAllowed(enabled);
      const element = video.current;
      if (!element) return;
      if (enabled) {
        if (!element.hasAttribute("src")) {
          element.src = "/media/meteor-hero.mp4";
          element.load();
        }
        if (!paused && !document.hidden) void element.play().catch(() => setPlaying(false));
        else element.pause();
      } else {
        element.pause();
        element.removeAttribute("src");
        element.load();
        setPlaying(false);
      }
    };
    update();
    for (const query of [motion, mobile, data]) query.addEventListener("change", update);
    connection?.addEventListener("change", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      for (const query of [motion, mobile, data]) query.removeEventListener("change", update);
      connection?.removeEventListener("change", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, [paused]);

  return <>
    <video ref={video} className={className} autoPlay muted loop playsInline preload="none"
      poster="/media/meteor-poster.jpg" aria-hidden="true" tabIndex={-1}
      onPlaying={() => setPlaying(true)} onPause={() => setPlaying(false)}
      onError={() => { setPlaying(false); setAllowed(false); }} />
    {allowed && <button className="hero-motion-toggle" type="button"
      onClick={() => setPaused(!paused)} aria-label={paused || !playing ? "Play background video" : "Pause background video"}>
      {paused || !playing ? "Play scene" : "Pause scene"}
    </button>}
  </>;
}
