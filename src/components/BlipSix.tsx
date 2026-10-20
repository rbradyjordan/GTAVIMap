"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Blip, Category } from "@/data/blips";
import { newId, useBlips, useEditor, useVisited } from "@/lib/store";
import { checkSetup, loadMapKit, SetupProblem } from "@/lib/mapkit";
import SetupGate from "./SetupGate";
import Sidebar, { FoundPlace } from "./Sidebar";
import BlipCard from "./BlipCard";
import BlipForm from "./BlipForm";
import MapView, { FlyTo } from "./MapView";
import UnlockDialog from "./UnlockDialog";
import LoadingScreen from "./LoadingScreen";

const TOUR_STEP_MS = 5500;

export default function BlipSix() {
  const [mk, setMk] = useState<typeof mapkit | null>(null);
  const [problem, setProblem] = useState<SetupProblem | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      const p = await checkSetup();
      if (!alive) return;
      if (p) return setProblem(p);
      try {
        const lib = await loadMapKit();
        if (!alive) return;
        lib.addEventListener("error", (e) => {
          const ev = e as unknown as { status?: string; message?: string };
          setProblem({ error: `Apple rejected the token (${ev.status ?? "error"}). Check MAPKIT_TEAM_ID / MAPKIT_KEY_ID and that the key has MapKit JS enabled.` });
        });
        setProblem(null);
        setMk(lib);
      } catch (e) {
        setProblem({ error: (e as Error).message });
      }
    })();
    return () => {
      alive = false;
    };
  }, [attempt]);

  if (problem) {
    return (
      <div className="app">
        <SetupGate problem={problem} onRetry={() => setAttempt((n) => n + 1)} />
      </div>
    );
  }
  if (!mk) {
    return (
      <div className="app">
        <LoadingScreen ready={false} />
      </div>
    );
  }
  return <Inner mk={mk} />;
}

function Inner({ mk }: { mk: typeof mapkit }) {
  const { editor, unlock, lock } = useEditor();
  const { blips, loaded, upsert, remove, reset, save, saveError } = useBlips(editor);
  const { visited, toggle: toggleVisited } = useVisited();
  const [unlocking, setUnlocking] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ blip: Blip; isNew: boolean } | null>(null);
  const [filter, setFilter] = useState("");
  const [cats, setCats] = useState<Set<Category>>(new Set(["confirmed", "game", "mine"]));
  const [dropMode, setDropMode] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [toast, setToast] = useState("");
  const [flyTo, setFlyTo] = useState<FlyTo | null>(null);
  const [touring, setTouring] = useState(false);
  const tourIdx = useRef(0);

  const selected = useMemo(() => blips.find((b) => b.id === selectedId) ?? null, [blips, selectedId]);
  const shown = useMemo(() => blips.filter((b) => cats.has(b.cat)), [blips, cats]);
  const areas = useMemo(() => {
    const counts = new globalThis.Map<string, number>();
    blips.forEach((b) => counts.set(b.area, (counts.get(b.area) ?? 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([a]) => a);
  }, [blips]);

  const say = useCallback((t: string) => {
    setToast(t);
    window.setTimeout(() => setToast(""), 2200);
  }, []);

  const fly = useCallback((lat: number, lng: number, span?: number) => {
    setFlyTo((f) => ({ lat, lng, span, n: (f?.n ?? 0) + 1 }));
  }, []);

  const isPhone = () => window.matchMedia("(max-width: 760px)").matches;

  const select = useCallback(
    (b: Blip) => {
      setSelectedId(b.id);
      if (isPhone()) setPanelOpen(false);
      fly(b.lat, b.lng);
    },
    [fly],
  );

  // Jump to a neighborhood: fit the map to every blip in it.
  function jumpToArea(area: string) {
    const list = blips.filter((b) => b.area === area);
    if (!list.length) return;
    const lats = list.map((b) => b.lat);
    const lngs = list.map((b) => b.lng);
    const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;
    const span = Math.max(0.02, (Math.max(...lats) - Math.min(...lats)) * 1.8, (Math.max(...lngs) - Math.min(...lngs)) * 1.8);
    setSelectedId(null);
    fly(lat, lng, span);
    if (isPhone()) setPanelOpen(false);
  }

  function surprise() {
    const pool = shown.filter((b) => b.id !== selectedId);
    if (!pool.length) return;
    const b = pool[Math.floor(Math.random() * pool.length)];
    select(b);
    say(`Rolled: ${b.name}`);
  }

  // Tour: step through the live spots.
  const tourList = useMemo(() => blips.filter((b) => b.cat === "confirmed"), [blips]);
  useEffect(() => {
    if (!touring || !tourList.length) return;
    const step = () => {
      const b = tourList[tourIdx.current % tourList.length];
      tourIdx.current += 1;
      select(b);
    };
    step();
    const t = window.setInterval(step, TOUR_STEP_MS);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touring, tourList]);

  // Keyboard: arrows hop through the visible list, T toggles the tour, Esc closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      if (editing || unlocking) return;
      if (document.querySelector(".gallery")) return;
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (!shown.length) return;
        e.preventDefault();
        const i = shown.findIndex((b) => b.id === selectedId);
        const next = e.key === "ArrowRight" ? (i + 1) % shown.length : (i - 1 + shown.length) % shown.length;
        select(shown[next]);
      } else if (e.key.toLowerCase() === "t") {
        setTouring((v) => !v);
      } else if (e.key === "Escape") {
        setSelectedId(null);
        setTouring(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [shown, selectedId, select, editing, unlocking]);

  const blank = (lat: number, lng: number): Blip => ({
    id: newId(),
    name: "",
    address: "",
    area: guessArea(lat, lng),
    lat,
    lng,
    cat: "mine",
    what: "",
  });

  function onPlace(place: FoundPlace) {
    const b = blank(place.lat, place.lng);
    b.name = place.name;
    b.address = place.address;
    b.link = place.url ?? "";
    fly(b.lat, b.lng);
    setEditing({ blip: b, isNew: true });
    if (isPhone()) setPanelOpen(false);
  }

  function onBackgroundTap(lat: number, lng: number) {
    if (!dropMode || !editor) {
      setSelectedId(null);
      return;
    }
    const b = blank(lat, lng);
    setDropMode(false);
    setEditing({ blip: b, isNew: true });
    new mk.Geocoder({ language: "en" }).reverseLookup(new mk.Coordinate(lat, lng), (err, data) => {
      const addr = data?.results?.[0]?.formattedAddress;
      if (err || !addr) return;
      setEditing((cur) =>
        cur && cur.blip.id === b.id && !cur.blip.address ? { ...cur, blip: { ...cur.blip, address: addr } } : cur,
      );
    });
  }

  function exportJson() {
    const data = JSON.stringify(blips, null, 2);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([data], { type: "application/json" }));
    a.download = `blip-vi-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    say("Exported");
  }

  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text()) as Blip[];
      if (!Array.isArray(parsed) || !parsed.every((b) => b.id && b.name && typeof b.lat === "number")) {
        throw new Error("bad");
      }
      const byId = new globalThis.Map(blips.map((b) => [b.id, b]));
      parsed.forEach((b) => byId.set(b.id, b));
      save([...byId.values()]);
      say(`Imported ${parsed.length} blips`);
    } catch {
      say("That file isn't a Blip VI export");
    }
  }

  return (
    <div className="app">
      <MapView
        mk={mk}
        blips={shown}
        selectedId={selectedId}
        visited={visited}
        dropMode={dropMode}
        onSelect={(id) => {
          const b = blips.find((x) => x.id === id);
          if (b) {
            setSelectedId(id);
            setTouring(false);
            if (isPhone()) setPanelOpen(false);
          }
        }}
        onBackgroundTap={onBackgroundTap}
        onReady={() => setMapReady(true)}
        flyTo={flyTo}
      />
      <div className="tint" aria-hidden="true" />

      <div className="brand" aria-hidden="true">
        <h1>
          Blip <span className="six">VI</span>
        </h1>
        <span className="tag">Magic City · launch week</span>
      </div>

      {dropMode && <div className="dropmode">Tap the map where the blip goes</div>}
      {touring && (
        <div className="dropmode tour">
          Touring the live spots · {Math.min(((tourIdx.current - 1) % Math.max(tourList.length, 1)) + 1, tourList.length)} / {tourList.length} · press T or Esc to stop
        </div>
      )}

      <Sidebar
        mk={mk}
        blips={blips}
        filter={filter}
        onFilter={setFilter}
        cats={cats}
        onToggleCat={(c) =>
          setCats((prev) => {
            const n = new Set(prev);
            if (n.has(c)) n.delete(c);
            else n.add(c);
            return n;
          })
        }
        selectedId={selectedId}
        onSelect={(b) => {
          setTouring(false);
          select(b);
        }}
        onPlace={onPlace}
        dropMode={dropMode}
        onDropMode={() => setDropMode((d) => !d)}
        onExport={exportJson}
        onImport={importJson}
        onReset={() => {
          reset();
          setSelectedId(null);
          say("Back to the starting blips");
        }}
        open={panelOpen}
        onToggleOpen={() => setPanelOpen((o) => !o)}
        editor={editor}
        onUnlock={() => setUnlocking(true)}
        onLock={() => {
          lock();
          setDropMode(false);
          setEditing(null);
          say("Editing locked");
        }}
        visited={visited}
        areas={areas}
        onArea={jumpToArea}
        onSurprise={surprise}
        touring={touring}
        onTour={() => {
          tourIdx.current = 0;
          setTouring((v) => !v);
        }}
      />

      {unlocking && (
        <UnlockDialog
          onCancel={() => setUnlocking(false)}
          onUnlock={async (pw) => {
            const msg = await unlock(pw);
            if (!msg) {
              setUnlocking(false);
              say("Editing unlocked");
            }
            return msg;
          }}
        />
      )}

      {selected && !editing && (
        <BlipCard
          blip={selected}
          editor={editor}
          visited={visited.has(selected.id)}
          onToggleVisited={() => {
            toggleVisited(selected.id);
            say(visited.has(selected.id) ? "Unmarked" : `Hit: ${selected.name}`);
          }}
          onClose={() => setSelectedId(null)}
          onEdit={() => setEditing({ blip: selected, isNew: false })}
          onDelete={() => {
            remove(selected.id);
            setSelectedId(null);
            say("Blip removed");
          }}
        />
      )}

      {saveError && <div className="toast warn">Not saved: {saveError}</div>}

      {editing && editor && (
        <BlipForm
          initial={editing.blip}
          isNew={editing.isNew}
          onCancel={() => setEditing(null)}
          onSave={(b) => {
            upsert(b);
            setEditing(null);
            setSelectedId(b.id);
            say(editing.isNew ? "Blip dropped" : "Saved");
          }}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
      <LoadingScreen ready={mapReady && loaded} />
    </div>
  );
}

/** Rough neighborhood from coordinates, just to prefill the form. */
function guessArea(lat: number, lng: number): string {
  if (lng > -80.15 && lat > 25.76 && lat < 25.8) return "South Beach";
  if (lng > -80.15 && lat >= 25.8) return "Mid-Beach";
  if (lat < 25.745 && lng < -80.22) return "Coconut Grove";
  if (lat >= 25.755 && lat < 25.772 && lng > -80.2 && lng < -80.185) return "Brickell";
  if (lat >= 25.772 && lat < 25.792 && lng > -80.2 && lng < -80.18) return "Downtown";
  if (lat >= 25.795 && lat < 25.81 && lng < -80.19) return "Wynwood";
  if (lat >= 25.76 && lat < 25.78 && lng < -80.21) return "Little Havana";
  return "Miami";
}
