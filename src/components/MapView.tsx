"use client";

import { useEffect, useRef } from "react";
import { Blip, CATEGORIES, MIAMI_CENTER } from "@/data/blips";

type Props = {
  mk: typeof mapkit;
  blips: Blip[];
  selectedId: string | null;
  dropMode: boolean;
  onSelect: (id: string) => void;
  onBackgroundTap: (lat: number, lng: number) => void;
  /** Bumped whenever the caller wants the map to fly to the selected blip */
  flyTo: { lat: number; lng: number; n: number } | null;
};

const ICON: Record<Blip["cat"], string> = {
  confirmed: "★",
  game: "◆",
  mine: "+",
};

export default function MapView({ mk, blips, selectedId, dropMode, onSelect, onBackgroundTap, flyTo }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const map = useRef<mapkit.Map | null>(null);
  const anns = useRef(new globalThis.Map<string, { ann: mapkit.Annotation; el: HTMLElement; blip: Blip }>());
  const cb = useRef({ onSelect, onBackgroundTap, dropMode });
  cb.current = { onSelect, onBackgroundTap, dropMode };

  // Create the map once.
  useEffect(() => {
    if (!host.current || map.current) return;
    const m = new mk.Map(host.current, {
      center: new mk.Coordinate(MIAMI_CENTER.lat, MIAMI_CENTER.lng),
      colorScheme: mk.Map.ColorSchemes.Dark,
      mapType: mk.Map.MapTypes.MutedStandard,
      showsPointsOfInterest: false,
      showsMapTypeControl: false,
      showsCompass: mk.FeatureVisibility.Hidden,
      showsScale: mk.FeatureVisibility.Hidden,
      isRotationEnabled: false,
      showsZoomControl: true,
    });
    m.region = new mk.CoordinateRegion(
      new mk.Coordinate(MIAMI_CENTER.lat, MIAMI_CENTER.lng),
      new mk.CoordinateSpan(0.13, 0.13),
    );
    m.addEventListener("select", (e) => {
      const id = (e.annotation?.data as { id?: string } | undefined)?.id;
      if (id) cb.current.onSelect(id);
    });
    m.addEventListener("single-tap", (e) => {
      const ev = e as unknown as { pointOnPage?: DOMPoint };
      if (!ev.pointOnPage) return;
      const c = m.convertPointOnPageToCoordinate(ev.pointOnPage);
      cb.current.onBackgroundTap(c.latitude, c.longitude);
    });
    map.current = m;
    return () => {
      m.destroy();
      map.current = null;
      anns.current.clear();
    };
  }, [mk]);

  // Sync annotations with the blip list.
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const want = new Set(blips.map((b) => b.id));
    for (const [id, a] of anns.current) {
      if (!want.has(id)) {
        m.removeAnnotation(a.ann);
        anns.current.delete(id);
      }
    }
    for (const b of blips) {
      const have = anns.current.get(b.id);
      if (have && have.blip.lat === b.lat && have.blip.lng === b.lng && have.blip.cat === b.cat && have.blip.name === b.name) continue;
      if (have) {
        m.removeAnnotation(have.ann);
        anns.current.delete(b.id);
      }
      let el: HTMLElement | null = null;
      const ann = new mk.Annotation(
        new mk.Coordinate(b.lat, b.lng),
        () => {
          el = document.createElement("div");
          el.className = `blip-pin cat-${b.cat}`;
          el.style.setProperty("--c", CATEGORIES[b.cat].color);
          el.innerHTML = `<span class="glyph">${ICON[b.cat]}</span><span class="label">${escapeHtml(b.name)}</span>`;
          return el;
        },
        {
          data: { id: b.id },
          calloutEnabled: false,
          anchorOffset: new DOMPoint(0, 0),
          displayPriority: b.cat === "confirmed" ? 1000 : b.cat === "mine" ? 900 : 700,
          collisionMode: mk.Annotation.CollisionMode.Circle,
          size: { width: 28, height: 28 },
        },
      );
      m.addAnnotation(ann);
      anns.current.set(b.id, { ann, el: el!, blip: b });
    }
  }, [mk, blips]);

  // Selected styling.
  useEffect(() => {
    for (const [id, a] of anns.current) {
      a.el?.classList.toggle("selected", id === selectedId);
    }
  }, [selectedId, blips]);

  useEffect(() => {
    if (!map.current || !flyTo) return;
    const m = map.current;
    const span = Math.min(m.region.span.latitudeDelta, 0.03);
    m.setRegionAnimated(
      new mk.CoordinateRegion(new mk.Coordinate(flyTo.lat, flyTo.lng), new mk.CoordinateSpan(span, span)),
      true,
    );
  }, [mk, flyTo]);

  return <div ref={host} className={`map${dropMode ? " drop" : ""}`} />;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
