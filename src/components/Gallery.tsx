"use client";

import { useEffect, useState } from "react";

/** Full-screen photo viewer with arrows, keyboard and a thumbnail strip. */
export default function Gallery({
  photos,
  start,
  title,
  onClose,
}: {
  photos: string[];
  start: number;
  title: string;
  onClose: () => void;
}) {
  const [i, setI] = useState(start);
  const n = photos.length;
  const go = (d: number) => setI((x) => (x + d + n) % n);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [n]);

  return (
    <div className="gallery" role="dialog" aria-label={`${title} photos`} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <button className="g-close" onClick={onClose} aria-label="Close">×</button>
      <div className="g-count">{i + 1} / {n}</div>
      {n > 1 && (
        <button className="g-arrow left" onClick={() => go(-1)} aria-label="Previous">‹</button>
      )}
      <img className="g-main" src={photos[i]} alt="" />
      {n > 1 && (
        <button className="g-arrow right" onClick={() => go(1)} aria-label="Next">›</button>
      )}
      {n > 1 && (
        <div className="g-strip">
          {photos.map((p, k) => (
            <button key={k} className={k === i ? "on" : ""} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`}>
              <img src={p} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
