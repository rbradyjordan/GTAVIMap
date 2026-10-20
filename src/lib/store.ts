"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Blip, DEFAULT_BLIPS } from "@/data/blips";

/**
 * Pins live on the server (Vercel Blob in production, data/blips.json locally). Everyone
 * reads them; only a browser that has unlocked editing can write them. Writes are
 * optimistic and queued.
 */
export function useBlips(editor: boolean) {
  const [blips, setBlips] = useState<Blip[]>(DEFAULT_BLIPS);
  const [loaded, setLoaded] = useState(false);
  const [saveError, setSaveError] = useState("");
  const latest = useRef<Blip[]>(DEFAULT_BLIPS);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    fetch("/api/blips", { cache: "no-store" })
      .then((r) => r.json())
      .then((data: Blip[]) => {
        latest.current = data;
        setBlips(data);
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  const persist = useCallback(
    (next: Blip[]) => {
      latest.current = next;
      setBlips(next);
      if (!editor) return;
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(async () => {
        const sent = latest.current;
        try {
          const r = await fetch("/api/blips", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(sent),
          });
          const j = (await r.json().catch(() => ({}))) as { error?: string; blips?: Blip[] };
          if (!r.ok) throw new Error(j.error ?? `save ${r.status}`);
          // The server moves inline photos to storage; swap in their URLs so they upload once.
          const moved = photoSwaps(sent, j.blips ?? []);
          if (moved.size) {
            const swap = (p?: string) => (p && moved.get(p)) || p;
            latest.current = latest.current.map((b) => ({ ...b, image: swap(b.image), images: b.images?.map((p) => swap(p) ?? p) }));
            setBlips(latest.current);
          }
          setSaveError("");
        } catch (e) {
          setSaveError((e as Error).message);
        }
      }, 300);
    },
    [editor],
  );

  const upsert = useCallback(
    (blip: Blip) => {
      const prev = latest.current;
      const i = prev.findIndex((b) => b.id === blip.id);
      persist(i === -1 ? [blip, ...prev] : prev.map((b) => (b.id === blip.id ? blip : b)));
    },
    [persist],
  );

  const remove = useCallback((id: string) => persist(latest.current.filter((b) => b.id !== id)), [persist]);
  const reset = useCallback(() => persist(DEFAULT_BLIPS), [persist]);

  return { blips, loaded, saveError, save: persist, upsert, remove, reset };
}

/** Data-URL photos in `sent` that came back as stored URLs, keyed by the data URL. */
function photoSwaps(sent: Blip[], stored: Blip[]): Map<string, string> {
  const out = new Map<string, string>();
  const byId = new Map(stored.map((b) => [b.id, b]));
  for (const b of sent) {
    const s = byId.get(b.id);
    if (!s) continue;
    const pairs: [string | undefined, string | undefined][] = [[b.image, s.image], ...(b.images ?? []).map((p, i) => [p, s.images?.[i]] as [string, string | undefined])];
    for (const [from, to] of pairs) if (from?.startsWith("data:") && to && to !== from) out.set(from, to);
  }
  return out;
}

export function useEditor() {
  const [editor, setEditor] = useState(false);
  const [configured, setConfigured] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    fetch("/api/unlock", { cache: "no-store" })
      .then((r) => r.json())
      .then((j: { editor: boolean; configured: boolean }) => {
        setEditor(j.editor);
        setConfigured(j.configured);
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const unlock = useCallback(async (password: string): Promise<string> => {
    const r = await fetch("/api/unlock", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const j = (await r.json()) as { editor?: boolean; error?: string };
    if (r.ok && j.editor) {
      setEditor(true);
      return "";
    }
    return j.error ?? "Could not unlock.";
  }, []);

  const lock = useCallback(async () => {
    await fetch("/api/unlock", { method: "DELETE" });
    setEditor(false);
  }, []);

  return { editor, configured, ready, unlock, lock };
}

/** Per-browser checklist of spots the viewer has been to. */
export function useVisited() {
  const KEY = "blipvi.visited.v1";
  const [visited, setVisited] = useState<Set<string>>(new Set());
  useEffect(() => {
    try {
      setVisited(new Set(JSON.parse(localStorage.getItem(KEY) ?? "[]") as string[]));
    } catch {
      /* ignore */
    }
  }, []);
  const toggle = useCallback((id: string) => {
    setVisited((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        localStorage.setItem(KEY, JSON.stringify([...next]));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);
  return { visited, toggle };
}

export function newId() {
  return "b" + Math.random().toString(36).slice(2, 9);
}

/** Shrinks a photo and uploads it; returns the URL to keep on the pin (a data URL in local dev). */
export async function uploadPhoto(file: File): Promise<string> {
  const dataUrl = await fileToDataUrl(file);
  const r = await fetch("/api/photos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ dataUrl }),
  });
  const j = (await r.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!r.ok || !j.url) throw new Error(j.error ?? "Could not upload the photo");
  return j.url;
}

/** Shrink an uploaded image to a data URL that stays small in the JSON store. */
export function fileToDataUrl(file: File, max = 1000): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read that image"));
    };
    img.src = url;
  });
}
