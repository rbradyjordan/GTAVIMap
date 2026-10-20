"use client";

import { useEffect, useState } from "react";

const TIPS = [
  "The branded chairs on Lummus Park run Oct 15 to Dec 31. Go early, before they fill up.",
  "Ten murals in Wynwood. Only one is on the Walls campus; the other nine are a walk.",
  "The arena sign went up by helicopter on Sept 22 and stays until April 2027.",
  "Night in Vice City at the arena is Nov 18. Blimp overhead the same night.",
  "Three Ocean Drive hotels got renamed in the game. All within one block of each other.",
  "The Venetian Causeway toll booths are in the game exactly as they are in real life.",
  "Press ← and → to hop between blips. Press T for a tour of the live spots.",
  "Mark a spot visited from its card. The hit list tracks how many you've hit.",
];

/** Game-style loading screen: logo, progress bar, cycling tips. Fades out once ready. */
export default function LoadingScreen({ ready }: { ready: boolean }) {
  // Start deterministic so server and client render the same tip, then shuffle on mount.
  const [tip, setTip] = useState(0);
  const [progress, setProgress] = useState(8);
  const [gone, setGone] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    setTip(Math.floor(Math.random() * TIPS.length));
    const t = window.setInterval(() => setTip((i) => (i + 1) % TIPS.length), 2600);
    return () => window.clearInterval(t);
  }, []);

  // Creep toward 90% while loading, snap to 100% when ready, then fade.
  useEffect(() => {
    if (ready) {
      setProgress(100);
      const a = window.setTimeout(() => setLeaving(true), 350);
      const b = window.setTimeout(() => setGone(true), 950);
      return () => {
        window.clearTimeout(a);
        window.clearTimeout(b);
      };
    }
    const t = window.setInterval(() => setProgress((p) => Math.min(90, p + Math.max(0.5, (90 - p) * 0.08))), 120);
    return () => window.clearInterval(t);
  }, [ready]);

  if (gone) return null;
  return (
    <div className={`loading${leaving ? " leaving" : ""}`} aria-live="polite" aria-busy={!ready}>
      <div className="loading-bg" aria-hidden="true" />
      <div className="loading-inner">
        <div className="loading-logo">
          Blip <span className="six">VI</span>
        </div>
        <div className="loading-sub">Vice City · launch week</div>
        <div className="loading-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}>
          <span style={{ width: `${progress}%` }} />
        </div>
        <div className="loading-status">{ready ? "Welcome to Vice City" : "Loading Vice City…"}</div>
        <div className="loading-tip" key={tip}>{TIPS[tip]}</div>
      </div>
    </div>
  );
}
