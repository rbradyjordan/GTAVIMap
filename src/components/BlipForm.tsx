"use client";

import { useState } from "react";
import { Blip, CATEGORIES, Category } from "@/data/blips";
import { fileToDataUrl } from "@/lib/store";

type Props = {
  initial: Blip;
  isNew: boolean;
  onSave: (b: Blip) => void;
  onCancel: () => void;
};

export default function BlipForm({ initial, isNew, onSave, onCancel }: Props) {
  const [b, setB] = useState<Blip>(initial);
  const [err, setErr] = useState("");
  const set = <K extends keyof Blip>(k: K, v: Blip[K]) => setB((p) => ({ ...p, [k]: v }));

  async function onFile(file?: File) {
    if (!file) return;
    try {
      set("image", await fileToDataUrl(file));
      set("imageCredit", "");
      setErr("");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        className="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          if (!b.name.trim()) return setErr("Give it a name.");
          if (!b.what.trim()) return setErr("Say what's there (or what you're hoping is there).");
          onSave({ ...b, name: b.name.trim(), what: b.what.trim() });
        }}
      >
        <h2>{isNew ? "New blip" : "Edit blip"}</h2>
        <div className="grid2">
          <div className="field">
            <label htmlFor="f-name">Business / place</label>
            <input id="f-name" value={b.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="f-cat">Type</label>
            <select id="f-cat" value={b.cat} onChange={(e) => set("cat", e.target.value as Category)}>
              {(Object.keys(CATEGORIES) as Category[]).map((k) => (
                <option key={k} value={k}>
                  {CATEGORIES[k].label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-addr">Address</label>
          <input id="f-addr" value={b.address} onChange={(e) => set("address", e.target.value)} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="f-area">Area</label>
            <input id="f-area" value={b.area} onChange={(e) => set("area", e.target.value)} placeholder="Brickell" />
          </div>
          <div className="field">
            <label htmlFor="f-game">Name in the game</label>
            <input id="f-game" value={b.gameName ?? ""} onChange={(e) => set("gameName", e.target.value)} placeholder="optional" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-what">What's there</label>
          <textarea
            id="f-what"
            value={b.what}
            onChange={(e) => set("what", e.target.value)}
            placeholder="The pop-up, the sign, the wrapped storefront, the merch drop…"
          />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="f-dates">When</label>
            <input id="f-dates" value={b.dates ?? ""} onChange={(e) => set("dates", e.target.value)} placeholder="Oct 15 to Dec 31" />
          </div>
          <div className="field">
            <label htmlFor="f-link">Link</label>
            <input id="f-link" value={b.link ?? ""} onChange={(e) => set("link", e.target.value)} placeholder="https://" />
          </div>
        </div>
        <div className="field">
          <label>Photo</label>
          <div className="imgrow">
            <div className="thumb">{b.image && <img src={b.image} alt="" />}</div>
            <div className="stack">
              <input
                id="f-img"
                value={b.image?.startsWith("data:") ? "" : b.image ?? ""}
                onChange={(e) => set("image", e.target.value)}
                placeholder={b.image?.startsWith("data:") ? "Uploaded photo" : "Paste an image URL"}
              />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                <label className="btn small" htmlFor="f-file">
                  Upload a photo
                </label>
                <input id="f-file" type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
                {b.image && (
                  <button type="button" className="btn small ghost" onClick={() => set("image", "")}>
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="field">
          <label htmlFor="f-notes">Shoot notes</label>
          <textarea id="f-notes" value={b.notes ?? ""} onChange={(e) => set("notes", e.target.value)} placeholder="Best light, parking, who to ask for…" style={{ minHeight: 64 }} />
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="f-lat">Latitude</label>
            <input id="f-lat" type="number" step="any" value={b.lat} onChange={(e) => set("lat", Number(e.target.value))} />
          </div>
          <div className="field">
            <label htmlFor="f-lng">Longitude</label>
            <input id="f-lng" type="number" step="any" value={b.lng} onChange={(e) => set("lng", Number(e.target.value))} />
          </div>
        </div>
        {err && <div className="error">{err}</div>}
        <div className="actions">
          <button type="button" className="btn ghost left" onClick={onCancel}>
            Cancel
          </button>
          <button type="submit" className="btn primary">
            {isNew ? "Drop blip" : "Save"}
          </button>
        </div>
      </form>
    </div>
  );
}
