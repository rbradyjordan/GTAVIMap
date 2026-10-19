"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Blip, DEFAULT_BLIPS } from "@/data/blips";

/**
 * Pins live on the server (data/blips.json). Everyone reads them; only a browser
 * that has unlocked editing can write them. Writes are optimistic and queued.
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
        try {
          const r = await fetch("/api/blips", {
            method: "PUT",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(latest.current),
          });
          if (!r.ok) throw new Error(((await r.json()) as { error?: string }).error ?? `save ${r.status}`);
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

export function newId() {
  return "b" + Math.random().toString(36).slice(2, 9);
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
