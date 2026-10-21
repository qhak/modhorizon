"use client";

import { useEffect, useRef, useState } from "react";

type Connection = EventTarget & { saveData?: boolean; effectiveType?: string };

/**
 * A muted, looping background video. The source is attached only when motion and
 * data preferences allow it (hiding with CSS would still download it), and the
 * video fades in once it plays, so a blocked or missing file leaves the fallback.
 */
export function VideoSlot({ src, className, pausable = false }: {
  src: string;
  className?: string;
  pausable?: boolean;
}) {
  const video = useRef<HTMLVideoElement>(null);
  const [allowed, setAllowed] = useState(false);
  const [live, setLive] = useState(false);
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
      if (!enabled) {
        element.pause();
        if (element.hasAttribute("src")) {
          element.removeAttribute("src");
          element.load();
        }
        setLive(false);
        return;
      }
      if (!element.hasAttribute("src")) {
        element.src = src;
        element.load();
      }
      if (paused || document.hidden) element.pause();
      else void element.play().catch(() => setLive(false));
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
  }, [paused, src]);

  return (
    <>
      <video
        ref={video}
        className={`media-slot ${live ? "is-live" : ""} ${className ?? ""}`}
        muted
        loop
        playsInline
        preload="none"
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => setLive(true)}
        onError={() => setLive(false)}
      />
      {pausable && allowed && (
        <button
          type="button"
          className="video-toggle"
          aria-label={paused ? "Play background video" : "Pause background video"}
          onClick={() => setPaused((current) => !current)}
        >
          {paused ? "Play scene" : "Pause scene"}
        </button>
      )}
    </>
  );
}
