import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, list, put } from "@vercel/blob";
import { revalidateTag, unstable_cache } from "next/cache";
import { Blip, DEFAULT_BLIPS } from "@/data/blips";

/**
 * Where the one shared set of pins lives.
 * On Vercel (or with BLIPS_STORE=blob) it is the Blob store: every save writes a new
 * blips/<time>.json (a fixed name would sit behind Blob's CDN cache for up to a
 * minute) and the newest one wins. Reads go through Next's data cache, which a save
 * expires at once, so page views don't each list the store. Uploaded photos are
 * separate blobs referenced by URL. Locally it is data/blips.json and photos stay
 * inline as data URLs.
 */
const PREFIX = "blips/";
const KEEP_VERSIONS = 10;
const TAG = "blips";
const FILE = path.join(process.cwd(), "data", "blips.json");

export function usesBlob(): boolean {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return false;
  return process.env.BLIPS_STORE ? process.env.BLIPS_STORE === "blob" : Boolean(process.env.VERCEL);
}

export async function loadBlips(): Promise<Blip[]> {
  if (usesBlob()) return loadFromBlob();
  try {
    return JSON.parse(await readFile(FILE, "utf8")) as Blip[];
  } catch {
    return DEFAULT_BLIPS;
  }
}

/** Saves the list after moving any inline photos to Blob; returns what was stored. */
export async function saveBlips(list: Blip[]): Promise<Blip[]> {
  if (!usesBlob()) {
    await mkdir(path.dirname(FILE), { recursive: true });
    await writeFile(FILE, JSON.stringify(list, null, 2));
    return list;
  }
  const stored = await Promise.all(
    list.map(async (b) => ({
      ...b,
      image: b.image ? await storePhoto(b.image) : b.image,
      images: b.images ? await Promise.all(b.images.map(storePhoto)) : b.images,
    })),
  );
  await put(`${PREFIX}${Date.now()}.json`, JSON.stringify(stored, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: true,
  });
  revalidateTag(TAG, { expire: 0 });
  // Keep the last few saves as a history; drop the rest.
  const old = (await versions()).slice(KEEP_VERSIONS);
  if (old.length) await del(old.map((b) => b.url)).catch((e) => console.error("trim blips history", e));
  return stored;
}

async function versions() {
  const { blobs } = await list({ prefix: PREFIX, limit: 1000 });
  // Newest first by the millisecond time in the name (uploadedAt ties within a second).
  const at = (pathname: string) => Number(pathname.slice(PREFIX.length).split("-")[0]) || 0;
  return blobs.sort((a, b) => at(b.pathname) - at(a.pathname));
}

const loadFromBlob = unstable_cache(
  async (): Promise<Blip[]> => {
    const [latest] = await versions();
    if (!latest) return DEFAULT_BLIPS;
    const r = await fetch(latest.url);
    if (!r.ok) throw new Error(`read ${latest.pathname}: ${r.status}`);
    return (await r.json()) as Blip[];
  },
  ["blips-latest"],
  { tags: [TAG], revalidate: 3600 },
);

const DATA_URL = /^data:(image\/(?:jpeg|png|webp|gif|avif));base64,(.+)$/;

/** Uploads a data-URL photo to Blob and returns its URL; anything else comes back unchanged. */
export async function storePhoto(src: string): Promise<string> {
  const m = DATA_URL.exec(src);
  if (!m || !usesBlob()) return src;
  const ext = m[1].split("/")[1].replace("jpeg", "jpg");
  const blob = await put(`photos/${randomBytes(8).toString("hex")}.${ext}`, Buffer.from(m[2], "base64"), {
    access: "public",
    contentType: m[1],
    addRandomSuffix: false,
  });
  return blob.url;
}
