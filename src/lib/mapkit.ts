"use client";

/**
 * One script load and one mapkit.init per page. Tokens come from our own
 * /api/mapkit-token route, which signs them with the private key in .env.local.
 */
let loadPromise: Promise<typeof mapkit> | null = null;

export type SetupProblem = { missing?: string[]; error?: string };

export async function checkSetup(): Promise<SetupProblem | null> {
  const r = await fetch("/api/mapkit-token", { cache: "no-store" });
  if (r.ok) return null;
  try {
    return (await r.json()) as SetupProblem;
  } catch {
    return { error: `Token route answered ${r.status}` };
  }
}

export function loadMapKit(): Promise<typeof mapkit> {
  if (loadPromise) return loadPromise;
  loadPromise = new Promise((resolve, reject) => {
    if (window.mapkit?.Map) return resolve(window.mapkit);
    const s = document.createElement("script");
    s.src = "https://cdn.apple-mapkit.com/mk/5.x.x/mapkit.js";
    s.crossOrigin = "anonymous";
    s.async = true;
    s.dataset.libraries = "map,annotations,services";
    s.onload = () => {
      const mk = window.mapkit;
      if (!mk) return reject(new Error("mapkit.js loaded but window.mapkit is missing"));
      mk.init({
        authorizationCallback: (done) => {
          fetch("/api/mapkit-token", { cache: "no-store" })
            .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`token ${r.status}`))))
            .then(done)
            .catch(() => done(""));
        },
        language: "en",
      });
      resolve(mk);
    };
    s.onerror = () => reject(new Error("Could not load mapkit.js from Apple's CDN"));
    document.head.appendChild(s);
  });
  return loadPromise;
}

declare global {
  interface Window {
    mapkit?: typeof mapkit;
  }
}
