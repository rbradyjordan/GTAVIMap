"use client";

import { useEffect, useRef, useState } from "react";
import { Blip, CATEGORIES, Category, CITYWIDE, MIAMI_CENTER, SOURCES } from "@/data/blips";

export type FoundPlace = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  url?: string;
};

type Props = {
  mk: typeof mapkit;
  blips: Blip[];
  filter: string;
  onFilter: (s: string) => void;
  cats: Set<Category>;
  onToggleCat: (c: Category) => void;
  selectedId: string | null;
  onSelect: (b: Blip) => void;
  onPlace: (p: FoundPlace) => void;
  dropMode: boolean;
  onDropMode: () => void;
  onExport: () => void;
  onImport: (f: File) => void;
  onReset: () => void;
  open: boolean;
  onToggleOpen: () => void;
  editor: boolean;
  onUnlock: () => void;
  onLock: () => void;
  visited: Set<string>;
  areas: string[];
  onArea: (area: string) => void;
  onSurprise: () => void;
  touring: boolean;
  onTour: () => void;
};

const ORDER: Category[] = ["confirmed", "game", "mine"];

export default function Sidebar(p: Props) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<mapkit.SearchAutocompleteResult[]>([]);
  const [busy, setBusy] = useState(false);
  const search = useRef<mapkit.Search | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    search.current = new p.mk.Search({
      region: new p.mk.CoordinateRegion(
        new p.mk.Coordinate(MIAMI_CENTER.lat, MIAMI_CENTER.lng),
        new p.mk.CoordinateSpan(0.25, 0.25),
      ),
      language: "en",
    });
  }, [p.mk]);

  // Apple Maps autocomplete for adding a real business.
  useEffect(() => {
    window.clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = window.setTimeout(() => {
      search.current?.autocomplete(q, (err, data) => {
        if (err) return setResults([]);
        setResults(data.results.filter((r) => r.coordinate).slice(0, 7));
      });
    }, 220);
  }, [q]);

  function pick(r: mapkit.SearchAutocompleteResult) {
    setBusy(true);
    search.current?.search(r, (err, data) => {
      setBusy(false);
      const place = data?.places?.[0];
      const url = (place as unknown as { urls?: string[] } | undefined)?.urls?.[0];
      if (!err && place) {
        p.onPlace({ name: place.name, address: place.formattedAddress, lat: place.coordinate.latitude, lng: place.coordinate.longitude, url });
      } else {
        p.onPlace({ name: r.displayLines[0] ?? "", address: r.displayLines.slice(1).join(", "), lat: r.coordinate.latitude, lng: r.coordinate.longitude });
      }
      setQ("");
      setResults([]);
    });
  }

  const f = p.filter.trim().toLowerCase();
  const visible = p.blips
    .filter((b) => p.cats.has(b.cat))
    .filter((b) => !f || [b.name, b.area, b.address, b.gameName ?? "", b.what].join(" ").toLowerCase().includes(f))
    .sort((a, b) => ORDER.indexOf(a.cat) - ORDER.indexOf(b.cat) || a.area.localeCompare(b.area));

  const counts = p.blips.reduce<Record<string, number>>((m, b) => ((m[b.cat] = (m[b.cat] ?? 0) + 1), m), {});
  const live = p.blips.filter((b) => b.cat === "confirmed");
  const liveTotal = live.length;
  const liveHit = live.filter((b) => p.visited.has(b.id)).length;

  return (
    <nav className="panel" data-open={p.open} aria-label="Blips">
      <button className="panel-toggle" onClick={p.onToggleOpen} aria-expanded={p.open}>
        {p.open ? "Hide list" : `${visible.length} blips · show list`}
      </button>
      <div className="panel-head">
        <div className="eyebrow">Launch-week dossier · Magic City</div>
        {p.editor && (
        <div className="search">
          <div className="ac">
            <input
              id="place-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Add a business (Apple Maps search)…"
              aria-label="Search Apple Maps to add a blip"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && results[0]) pick(results[0]);
                if (e.key === "Escape") setResults([]);
              }}
            />
            {(results.length > 0 || busy) && (
              <ul className="ac-list" role="listbox">
                {busy && <li className="ac-busy">Looking it up…</li>}
                {results.map((r, i) => (
                  <li key={i} role="option" aria-selected={false}>
                    <button type="button" onClick={() => pick(r)}>
                      <b>{r.displayLines[0]}</b>
                      <span>{r.displayLines.slice(1).join(", ")}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="btn" aria-pressed={p.dropMode} onClick={p.onDropMode} title="Tap the map to drop a blip">
            Drop
          </button>
        </div>
        )}
        <input
          id="list-filter"
          value={p.filter}
          onChange={(e) => p.onFilter(e.target.value)}
          placeholder="Filter the list"
          aria-label="Filter blips"
          className="filter"
        />
        <div className="chips" role="group" aria-label="Show">
          {ORDER.map((c) => (
            <button
              key={c}
              className="chip"
              style={{ ["--c" as string]: CATEGORIES[c].color }}
              aria-pressed={p.cats.has(c)}
              onClick={() => p.onToggleCat(c)}
              title={CATEGORIES[c].hint}
            >
              <span className="dot" /> {CATEGORIES[c].short} <span className="n">{counts[c] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="hitlist" title="Spots you've marked visited (saved in this browser)">
          <div className="hitlist-row">
            <span className="eyebrow">Hit list</span>
            <span className="hitlist-n">{liveHit} / {liveTotal} live</span>
          </div>
          <div className="hitlist-bar"><span style={{ width: `${liveTotal ? (liveHit / liveTotal) * 100 : 0}%` }} /></div>
        </div>
        <div className="fun">
          <button className="btn small" onClick={p.onSurprise} title="Fly to a random blip">🎲 Surprise me</button>
          <button className="btn small" aria-pressed={p.touring} onClick={p.onTour} title="Auto-play through the live spots (T)">
            {p.touring ? "■ Stop tour" : "▶ Tour"}
          </button>
        </div>
        <div className="areas" role="group" aria-label="Jump to an area">
          {p.areas.map((a) => (
            <button key={a} className="area-chip" onClick={() => p.onArea(a)}>{a}</button>
          ))}
        </div>
      </div>

      <div className="list">
        {visible.length === 0 && <div className="empty">Nothing matches. Clear the filter or drop a blip.</div>}
        {visible.map((b) => (
          <button
            key={b.id}
            className="row"
            style={{ ["--c" as string]: CATEGORIES[b.cat].color }}
            aria-current={p.selectedId === b.id}
            data-visited={p.visited.has(b.id)}
            onClick={() => p.onSelect(b)}
          >
            <span className="blip">{p.visited.has(b.id) ? "✓" : ""}</span>
            <span className="name">
              {b.name}
              <span className="sub">{b.gameName ? `as ${b.gameName}` : b.dates ?? CATEGORIES[b.cat].label}</span>
            </span>
            <span className="area">{b.area}</span>
          </button>
        ))}
        <details className="intel">
          <summary>Citywide, not pinnable</summary>
          <ul>
            {CITYWIDE.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="src">
            {SOURCES.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                {s.label}
              </a>
            ))}
          </div>
        </details>
      </div>

      <div className="panel-foot">
        <button className="btn small ghost" onClick={p.onExport}>
          Export
        </button>
        {p.editor && (
          <>
            <label className="btn small ghost" htmlFor="import-file">
              Import
            </label>
            <input
              id="import-file"
              type="file"
              accept="application/json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) p.onImport(f);
                e.target.value = "";
              }}
            />
            <button className="btn small ghost" onClick={p.onReset} title="Restore the starting set of blips">
              Reset
            </button>
          </>
        )}
        <span className="spacer" />
        {p.editor ? (
          <button className="btn small ghost" onClick={p.onLock} title="Lock editing in this browser">
            Editing on · Lock
          </button>
        ) : (
          <button className="btn small ghost" onClick={p.onUnlock} title="Unlock editing">
            🔒 Editor
          </button>
        )}
      </div>
    </nav>
  );
}
