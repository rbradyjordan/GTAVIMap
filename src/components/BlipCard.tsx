"use client";

import { useEffect, useState } from "react";
import { Blip, CATEGORIES } from "@/data/blips";
import Gallery from "./Gallery";

type Props = {
  blip: Blip;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  editor: boolean;
};

export default function BlipCard({ blip, onClose, onEdit, onDelete, editor }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [gallery, setGallery] = useState<number | null>(null);
  const cat = CATEGORIES[blip.cat];
  const photos = [blip.image, ...(blip.images ?? [])].filter((p): p is string => Boolean(p));
  const extra = photos.length - 1;

  useEffect(() => {
    setConfirmDelete(false);
    setGallery(null);
  }, [blip.id]);

  const appleUrl = `https://maps.apple.com/?q=${encodeURIComponent(blip.name)}&ll=${blip.lat},${blip.lng}`;
  const dirUrl = `https://maps.apple.com/?daddr=${blip.lat},${blip.lng}&dirflg=d`;

  return (
    <aside className="card" style={{ ["--c" as string]: cat.color }} aria-label={blip.name}>
      <div className="scroll">
        <div className={`hero${extra > 0 ? " multi" : ""}`}>
          {photos.length === 0 ? (
            <div className="nophoto">{editor ? "No photo yet · Edit to add one" : "No photo yet"}</div>
          ) : (
            <>
              <button className="banner" onClick={() => setGallery(0)} aria-label="Open photos">
                <img src={photos[0]} alt="" />
              </button>
              {extra > 0 && (
                <button className="more" onClick={() => setGallery(1)} aria-label={`See ${extra} more photo${extra === 1 ? "" : "s"}`}>
                  <img src={photos[1]} alt="" />
                  <span className="more-label">
                    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z" fill="currentColor"/></svg>
                    +{extra}
                  </span>
                </button>
              )}
            </>
          )}
          <span className="badge">{cat.label}</span>
          <button className="close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="body">
          <h2>{blip.name}</h2>
          {blip.gameName && (
            <div className="gamename">
              In the game: <b>{blip.gameName}</b>
            </div>
          )}
          <div className="addr">
            {blip.address} ·{" "}
            <a href={appleUrl} target="_blank" rel="noreferrer">
              Apple Maps
            </a>
          </div>
          <p className="what">{blip.what}</p>
          <dl className="kv">
            {blip.dates && (
              <>
                <dt>When</dt>
                <dd>{blip.dates}</dd>
              </>
            )}
            <dt>Area</dt>
            <dd>{blip.area}</dd>
            {blip.link && (
              <>
                <dt>Site</dt>
                <dd>
                  <a href={blip.link} target="_blank" rel="noreferrer">
                    {blip.link.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </a>
                </dd>
              </>
            )}
            {blip.source && (
              <>
                <dt>Reported by</dt>
                <dd>{blip.source}</dd>
              </>
            )}
          </dl>
          {blip.notes && <div className="notes">{blip.notes}</div>}
          <div className="actions">
            <a className="btn small" href={dirUrl} target="_blank" rel="noreferrer">
              Directions
            </a>
            {editor && (
            <button className="btn small" onClick={onEdit}>
              Edit
            </button>
            )}
            {!editor ? null : confirmDelete ? (
              <>
                <button className="btn small danger" onClick={onDelete}>
                  Yes, remove
                </button>
                <button className="btn small ghost" onClick={() => setConfirmDelete(false)}>
                  Keep
                </button>
              </>
            ) : (
              <button className="btn small ghost danger" onClick={() => setConfirmDelete(true)}>
                Remove
              </button>
            )}
          </div>
          {blip.imageCredit && <div className="credit">{blip.imageCredit}</div>}
        </div>
      </div>
      {gallery !== null && <Gallery photos={photos} start={gallery} title={blip.name} onClose={() => setGallery(null)} />}
    </aside>
  );
}
