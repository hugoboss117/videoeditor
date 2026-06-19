import { openDB, type IDBPDatabase } from "idb";
import type { ProjectState } from "../types";

const DB_NAME = "promo-editor";
const META_STORE = "project";
const BLOB_STORE = "clipBlobs";
const PROJECT_KEY = "current";

let dbPromise: Promise<IDBPDatabase> | null = null;
function db() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(d) {
        if (!d.objectStoreNames.contains(META_STORE)) d.createObjectStore(META_STORE);
        if (!d.objectStoreNames.contains(BLOB_STORE)) d.createObjectStore(BLOB_STORE);
      },
    });
  }
  return dbPromise;
}

export async function saveProject(p: ProjectState): Promise<void> {
  await (await db()).put(META_STORE, p, PROJECT_KEY);
}
export async function loadProject(): Promise<ProjectState | null> {
  return (await (await db()).get(META_STORE, PROJECT_KEY)) ?? null;
}
export async function clearProject(): Promise<void> {
  const d = await db();
  await d.clear(META_STORE);
  await d.clear(BLOB_STORE);
}
export async function saveClipBlob(id: string, blob: Blob): Promise<void> {
  // Store as {type, buffer} so the value survives structured cloning in all environments
  // (jsdom's Blob is not cloneable by fake-indexeddb; ArrayBuffer is).
  const buffer = await blob.arrayBuffer();
  await (await db()).put(BLOB_STORE, { type: blob.type, buffer }, id);
}
export async function loadClipBlob(id: string): Promise<Blob | null> {
  const record = await (await db()).get(BLOB_STORE, id);
  if (!record) return null;
  return new Blob([record.buffer as ArrayBuffer], { type: record.type as string });
}
