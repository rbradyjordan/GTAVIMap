import { Blip, CATEGORIES } from "@/data/blips";

/**
 * Animated effects drawn on a canvas that sits between MapKit's tile canvas and
 * its annotation layer: heat glows that merge into hotspots, district names,
 * a marching trail through the live spots, a radar sweep on the selection and
 * embers rising off live spots. Everything is projected through the map each
 * frame, so it tracks pans and zooms.
 */

/** Game names for real neighborhoods (shown big), with the real name underneath. */
const DISTRICT_NAMES: Record<string, string> = {
  "South Beach": "Ocean Beach",
  Wynwood: "Stockyard",
  "Little Havana": "Little Cuba",
  Downtown: "Downtown Vice",
  Brickell: "Brickell",
  "Venetian Islands": "Venetian Islands",
  "Mid-Beach": "Vice Beach",
  "Design District": "Design District",
};

export type FxState = {
  blips: Blip[];
  selectedId: string | null;
  touring: boolean;
};

type Ember = { x: number; y: number; vy: number; life: number; max: number; hue: string; anchor: string };

export function startMapFx(mk: typeof mapkit, map: mapkit.Map, host: HTMLElement, getState: () => FxState) {
  const canvas = document.createElement("canvas");
  canvas.className = "fx-layer";
  // Between the tile canvas and the annotation layer.
  const tiles = host.querySelector("canvas.rt-root");
  if (tiles && tiles.nextSibling) host.insertBefore(canvas, tiles.nextSibling);
  else host.appendChild(canvas);
  const ctx = canvas.getContext("2d")!;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const displayFont = getComputedStyle(document.querySelector(".brand h1") ?? document.body).fontFamily || "Impact, sans-serif";

  let raf = 0;
  let w = 0;
  let h = 0;
  let dpr = 1;
  const embers: Ember[] = [];

  const resize = () => {
    const r = host.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width;
    h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  };
  resize();
  const ro = new ResizeObserver(resize);
  ro.observe(host);

  const project = (lat: number, lng: number) => {
    const p = map.convertCoordinateToPointOnPage(new mk.Coordinate(lat, lng));
    const r = host.getBoundingClientRect();
    return { x: p.x - r.left - window.scrollX, y: p.y - r.top - window.scrollY };
  };

  const frame = (t: number) => {
    raf = requestAnimationFrame(frame);
    if (document.hidden) return;
    const { blips, selectedId, touring } = getState();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const span = map.region.span.longitudeDelta || 0.1;
    const pxPerDeg = w / span;
    const time = reduce ? 0 : t / 1000;

    const pts = blips.map((b) => ({ b, ...project(b.lat, b.lng) }));
    const onScreen = (p: { x: number; y: number }, pad = 200) => p.x > -pad && p.y > -pad && p.x < w + pad && p.y < h + pad;

    // 1. Heat glows. Additive blending makes neighbors merge into hotspots.
    ctx.globalCompositeOperation = "lighter";
    for (const p of pts) {
      if (!onScreen(p)) continue;
      const live = p.b.cat === "confirmed";
      const meters = live ? 420 : 260;
      const base = Math.max(live ? 52 : 32, Math.min(live ? 190 : 110, (meters / 111000) * pxPerDeg));
      const pulse = live ? 1 + 0.12 * Math.sin(time * 2 + p.x * 0.01) : 1;
      const r = base * pulse;
      const color = CATEGORIES[p.b.cat].color;
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, hexA(color, live ? 0.6 : 0.36));
      g.addColorStop(0.4, hexA(color, live ? 0.24 : 0.13));
      g.addColorStop(1, hexA(color, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";

    // 2. Marching trail through the live spots (nearest-neighbor order).
    const live = orderTrail(pts.filter((p) => p.b.cat === "confirmed"));
    if (live.length > 1) {
      ctx.save();
      ctx.lineWidth = touring ? 2.5 : 1.5;
      ctx.setLineDash([2, 9]);
      ctx.lineDashOffset = -time * 24;
      ctx.lineCap = "round";
      ctx.strokeStyle = touring ? "rgba(255, 63, 174, 0.9)" : "rgba(255, 63, 174, 0.38)";
      ctx.shadowColor = "#ff3fae";
      ctx.shadowBlur = touring ? 10 : 4;
      ctx.beginPath();
      live.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.stroke();
      ctx.restore();
    }

    // 3. District names, faded in only at neighborhood zoom levels.
    const labelAlpha = fadeBand(span, 0.012, 0.025, 0.14, 0.3);
    if (labelAlpha > 0.01) {
      const groups = new Map<string, { x: number; top: number; n: number }>();
      for (const p of pts) {
        const g = groups.get(p.b.area) ?? { x: 0, top: Infinity, n: 0 };
        g.x += p.x;
        g.top = Math.min(g.top, p.y);
        g.n += 1;
        groups.set(p.b.area, g);
      }
      // Biggest districts claim space first; later labels that would overlap are skipped.
      const placed: { l: number; r: number; t: number; b: number }[] = [];
      const pinBoxes = pts.map((p) => ({ l: p.x - 18, r: p.x + 18, t: p.y - 18, b: p.y + 18 }));
      const hits = (a: { l: number; r: number; t: number; b: number }, b: { l: number; r: number; t: number; b: number }) =>
        a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      for (const [area, g] of [...groups].sort((a, b) => b[1].n - a[1].n)) {
        const game = DISTRICT_NAMES[area];
        if (!game) continue;
        const size = Math.max(15, Math.min(24, 13 + g.n * 2.5));
        const x = g.x / g.n;
        const y = g.top - 36;
        ctx.font = `${size}px ${displayFont}`;
        const tw = ctx.measureText(game.toUpperCase()).width;
        const box = { l: x - tw / 2 - 4, r: x + tw / 2 + 4, t: y - size * 0.8, b: y + 13 };
        if (!onScreen({ x, y }, 0) || placed.some((q) => hits(q, box)) || pinBoxes.some((q) => hits(q, box))) continue;
        placed.push(box);
        ctx.globalAlpha = labelAlpha * 0.9;
        ctx.lineWidth = 4;
        ctx.lineJoin = "round";
        ctx.strokeStyle = "rgba(18, 13, 38, 0.9)";
        ctx.strokeText(game.toUpperCase(), x, y);
        ctx.fillStyle = "rgba(255, 214, 239, 0.95)";
        ctx.shadowColor = "#c830b0";
        ctx.shadowBlur = 10;
        ctx.fillText(game.toUpperCase(), x, y);
        ctx.shadowBlur = 0;
        if (game !== area) {
          ctx.globalAlpha = labelAlpha * 0.65;
          ctx.font = `600 10px "Barlow Condensed", sans-serif`;
          ctx.fillStyle = "#c9bdf0";
          ctx.fillText(area.toUpperCase().split("").join(" "), x, y + 12);
        }
      }
      ctx.restore();
    }

    // 4. Radar sweep around the selected spot.
    const sel = pts.find((p) => p.b.id === selectedId);
    if (sel && onScreen(sel)) {
      const color = CATEGORIES[sel.b.cat].color;
      const R = 70;
      ctx.save();
      ctx.translate(sel.x, sel.y);
      ctx.strokeStyle = hexA(color, 0.35);
      ctx.lineWidth = 1;
      for (const k of [0.45, 0.75, 1]) {
        ctx.beginPath();
        ctx.arc(0, 0, R * k, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (!reduce) {
        const a = (time * 1.6) % (Math.PI * 2);
        const sweep = ctx.createConicGradient(a - 1.1, 0, 0);
        sweep.addColorStop(0, hexA(color, 0));
        sweep.addColorStop(0.17, hexA(color, 0.4));
        sweep.addColorStop(0.175, hexA(color, 0));
        sweep.addColorStop(1, hexA(color, 0));
        ctx.fillStyle = sweep;
        ctx.beginPath();
        ctx.arc(0, 0, R, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // 5. Embers drifting up from live spots.
    if (!reduce) {
      for (const p of pts) {
        if (p.b.cat !== "confirmed" || !onScreen(p, 0)) continue;
        if (Math.random() < 0.06 && embers.length < 140) {
          embers.push({
            x: (Math.random() - 0.5) * 22,
            y: 0,
            vy: 0.25 + Math.random() * 0.45,
            life: 0,
            max: 70 + Math.random() * 60,
            hue: Math.random() < 0.7 ? "#ff3fae" : "#ff8a3d",
            anchor: p.b.id,
          });
        }
      }
      const byId = new Map(pts.map((p) => [p.b.id, p]));
      ctx.globalCompositeOperation = "lighter";
      for (let i = embers.length - 1; i >= 0; i--) {
        const e = embers[i];
        e.life += 1;
        e.y -= e.vy;
        e.x += Math.sin((e.life + i) * 0.08) * 0.25;
        const a = byId.get(e.anchor);
        if (!a || e.life > e.max) {
          embers.splice(i, 1);
          continue;
        }
        const k = 1 - e.life / e.max;
        ctx.fillStyle = hexA(e.hue, 0.8 * k);
        ctx.beginPath();
        ctx.arc(a.x + e.x, a.y + e.y - 10, 1.6 * k + 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalCompositeOperation = "source-over";
    }
  };
  raf = requestAnimationFrame(frame);

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    canvas.remove();
  };
}

/** 0 outside [a,d], ramps up a→b, holds b→c, ramps down c→d. */
function fadeBand(v: number, a: number, b: number, c: number, d: number) {
  if (v <= a || v >= d) return 0;
  if (v < b) return (v - a) / (b - a);
  if (v > c) return (d - v) / (d - c);
  return 1;
}

function orderTrail<T extends { x: number; y: number; b: Blip }>(pts: T[]): T[] {
  if (pts.length < 2) return pts;
  // Stable start: the northern-most live spot, then nearest neighbor.
  const left = [...pts].sort((a, b) => b.b.lat - a.b.lat || a.b.id.localeCompare(b.b.id));
  const out = [left.shift()!];
  while (left.length) {
    const last = out[out.length - 1];
    let bi = 0;
    let bd = Infinity;
    left.forEach((p, i) => {
      const d = (p.b.lat - last.b.lat) ** 2 + (p.b.lng - last.b.lng) ** 2;
      if (d < bd) {
        bd = d;
        bi = i;
      }
    });
    out.push(left.splice(bi, 1)[0]);
  }
  return out;
}

function hexA(hex: string, a: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
