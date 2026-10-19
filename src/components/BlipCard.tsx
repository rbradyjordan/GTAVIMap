"use client";

import { useEffect, useState } from "react";
import { Blip, CATEGORIES } from "@/data/blips";

type Props = {
  blip: Blip;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  editor: boolean;
};

export default function BlipCard({ blip, onClose, onEdit, onDelete, editor }: Props) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const cat = CATEGORIES[blip.cat];

  useEffect(() => setConfirmDelete(false), [blip.id]);

  const appleUrl = `https://maps.apple.com/?q=${encodeURIComponent(blip.name)}&ll=${blip.lat},${blip.lng}`;
  const dirUrl = `https://maps.apple.com/?daddr=${blip.lat},${blip.lng}&dirflg=d`;

  return (
    <aside className="card" style={{ ["--c" as string]: cat.color }} aria-label={blip.name}>
      <div className="scroll">
        <div className="hero">
          {blip.image ? (
            <img src={blip.image} alt="" />
          ) : (
            <div className="nophoto">{editor ? "No photo yet · Edit to add one" : "No photo yet"}</div>
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
    </aside>
  );
}
