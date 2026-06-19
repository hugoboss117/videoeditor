# Promo Video Editor — Plan 1: App Shell & Wizard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first, responsive PWA that walks the user through assembling a promo-video "edit project" (orientation → intro → clips → trim → transitions → music) and installs to an iPhone home screen — everything except the actual video rendering, which is Plan 2.

**Architecture:** Static single-page PWA built with Vite + TypeScript, deployable to GitHub Pages. A pure, unit-tested project-state store holds all edit decisions; a manifest loader reads bundled intros/music from JSON; a lightweight wizard router renders one step screen at a time with forward-gating. Source video Files are held in a runtime map and persisted as Blobs in IndexedDB alongside the serializable project metadata. The render step is stubbed with a "Review" screen that displays the assembled project (Plan 2 replaces this with the real renderer).

**Tech Stack:** Vite, TypeScript, Vitest (unit tests), fake-indexeddb (persistence tests), idb (IndexedDB wrapper), vite-plugin-pwa (manifest + service worker). No UI framework — plain DOM modules with CSS variables for theming.

---

## File Structure

```
videoeditor/
  index.html                      # app entry, mounts #app
  vite.config.ts                  # base path + PWA plugin
  package.json
  tsconfig.json
  public/
    assets/
      branding/
        logo.png                  # placeholder until real logo
        theme.json                # colors + app name
      intros/
        manifest.json             # intros per orientation
        landscape/ portrait/      # sample placeholder mp4s
      music/
        music.json                # bundled tracks list
        *.mp3                      # sample placeholder track
  src/
    main.ts                       # bootstrap: load theme, mount wizard
    theme.ts                      # load theme.json -> CSS variables
    types.ts                      # shared types (ProjectState, Clip, ...)
    state/
      projectStore.ts             # pure reducer functions over ProjectState
      persistence.ts              # IndexedDB load/save/clear (metadata + blobs)
    data/
      manifest.ts                 # load + validate intros/music manifests
    wizard/
      router.ts                   # step order, gating, navigation
      wizard.ts                   # DOM shell + renders current step
      steps/
        splash.ts
        orientation.ts
        intro.ts
        clips.ts
        trim.ts
        transitions.ts
        music.ts
        review.ts                 # Plan-2 stub: shows assembled project
    ui/
      components.ts               # shared button/header helpers
    styles/
      app.css                     # theme variables + responsive layout
  tests/
    projectStore.test.ts
    persistence.test.ts
    manifest.test.ts
    router.test.ts
```

---

## Task 1: Project scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`, `src/styles/app.css`

- [ ] **Step 1: Initialize the project and install dependencies**

Run:
```bash
cd E:/claude_code/my_tools/videoeditor
npm init -y
npm install idb
npm install -D vite typescript vitest fake-indexeddb @types/node vite-plugin-pwa jsdom
```
Expected: `node_modules/` created, dependencies listed in `package.json`.

- [ ] **Step 2: Add scripts and create config files**

Edit `package.json` to add:
```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

Create `vite.config.ts`:
```ts
import { defineConfig } from "vite";

export default defineConfig({
  // base is overridden for GitHub Pages in Task 15
  base: "./",
  test: {
    environment: "jsdom",
  },
});
```

Create `index.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#0a0a0a" />
    <title>Promo Editor</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

Create `src/styles/app.css`:
```css
:root { --bg:#0a0a0a; --fg:#ffffff; --silver:#c0c0c0; --accent:#ff7a00; }
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
  background: var(--bg); color: var(--fg);
  font-family: system-ui, -apple-system, sans-serif;
  -webkit-text-size-adjust: 100%;
}
#app { min-height: 100%; display: flex; flex-direction: column; }
```

Create `src/main.ts`:
```ts
import "./styles/app.css";

const app = document.querySelector<HTMLDivElement>("#app")!;
app.textContent = "Promo Editor — scaffold OK";
```

- [ ] **Step 3: Run the dev server to verify scaffold**

Run: `npm run dev`
Expected: Vite prints a local URL; opening it shows "Promo Editor — scaffold OK". Stop with Ctrl+C.

- [ ] **Step 4: Verify the test runner works**

Create `tests/smoke.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("smoke", () => {
  it("runs", () => { expect(1 + 1).toBe(2); });
});
```
Run: `npm test`
Expected: 1 passing test.

- [ ] **Step 5: Commit**

```bash
git init
git add -A
git commit -m "chore: scaffold Vite + TS + Vitest PWA project"
```

---

## Task 2: Shared types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Define the shared types**

Create `src/types.ts`:
```ts
export type Orientation = "portrait" | "landscape";
export type TransitionType = "cut" | "fade";

export interface TextOverlay {
  // v1.1 (not used in v1, defined for forward-compat)
  text: string;
  startSec: number;
  endSec: number;
}

export interface Clip {
  id: string;          // uuid
  name: string;        // original filename
  durationSec: number; // full source duration
  trimInSec: number;   // >= 0, <= trimOutSec
  trimOutSec: number;  // <= durationSec
  overlays: TextOverlay[]; // empty in v1
}

export interface ProjectState {
  schemaVersion: number;      // 1
  orientation: Orientation | null;
  introId: string | null;
  clips: Clip[];              // ordered
  transitions: TransitionType[]; // length invariant === clips.length
  musicId: string | null;
}

export interface IntroOption {
  id: string;
  label: string;
  file: string;       // path under public/
  thumbnail: string;  // path under public/
}

export interface MusicOption {
  id: string;
  label: string;
  file: string;       // path under public/
}
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: shared project types"
```

---

## Task 3: Project-state store (pure, TDD)

The store is a set of pure functions: `(state, args) -> newState`. No I/O, no DOM. This is the heart of correctness, so it is fully test-driven.

**Files:**
- Create: `src/state/projectStore.ts`
- Test: `tests/projectStore.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/projectStore.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  createProject, setOrientation, selectIntro, addClips, removeClip,
  reorderClip, trimClip, setTransition, setAllTransitions, setMusic,
} from "../src/state/projectStore";

const clipInput = (name: string, dur: number) => ({ name, durationSec: dur });

describe("projectStore", () => {
  it("creates an empty project", () => {
    const p = createProject();
    expect(p).toEqual({
      schemaVersion: 1, orientation: null, introId: null,
      clips: [], transitions: [], musicId: null,
    });
  });

  it("sets orientation immutably", () => {
    const p = createProject();
    const p2 = setOrientation(p, "landscape");
    expect(p2.orientation).toBe("landscape");
    expect(p.orientation).toBeNull(); // original untouched
  });

  it("selects an intro", () => {
    const p = selectIntro(createProject(), "intro2");
    expect(p.introId).toBe("intro2");
  });

  it("adds clips with default full trim and a default 'cut' transition each", () => {
    const p = addClips(createProject(), [clipInput("a.mp4", 10), clipInput("b.mp4", 5)]);
    expect(p.clips.length).toBe(2);
    expect(p.clips[0].trimInSec).toBe(0);
    expect(p.clips[0].trimOutSec).toBe(10);
    expect(p.clips[0].overlays).toEqual([]);
    expect(p.transitions).toEqual(["cut", "cut"]); // invariant: one per clip
    expect(p.clips[0].id).not.toBe(p.clips[1].id);
  });

  it("removes a clip and its transition, keeping the invariant", () => {
    const p = addClips(createProject(), [clipInput("a.mp4", 10), clipInput("b.mp4", 5)]);
    const p2 = removeClip(p, p.clips[0].id);
    expect(p2.clips.length).toBe(1);
    expect(p2.transitions.length).toBe(1);
    expect(p2.clips[0].name).toBe("b.mp4");
  });

  it("reorders a clip from one index to another", () => {
    const p = addClips(createProject(), [
      clipInput("a.mp4", 1), clipInput("b.mp4", 1), clipInput("c.mp4", 1),
    ]);
    const p2 = reorderClip(p, 2, 0);
    expect(p2.clips.map((c) => c.name)).toEqual(["c.mp4", "a.mp4", "b.mp4"]);
  });

  it("trims a clip and clamps to valid bounds", () => {
    const p = addClips(createProject(), [clipInput("a.mp4", 10)]);
    const id = p.clips[0].id;
    const p2 = trimClip(p, id, 2, 8);
    expect(p2.clips[0].trimInSec).toBe(2);
    expect(p2.clips[0].trimOutSec).toBe(8);
    const clamped = trimClip(p, id, -5, 99);
    expect(clamped.clips[0].trimInSec).toBe(0);
    expect(clamped.clips[0].trimOutSec).toBe(10);
  });

  it("rejects an inverted trim by leaving state unchanged", () => {
    const p = addClips(createProject(), [clipInput("a.mp4", 10)]);
    const id = p.clips[0].id;
    const p2 = trimClip(p, id, 8, 2);
    expect(p2.clips[0].trimInSec).toBe(0);
    expect(p2.clips[0].trimOutSec).toBe(10);
  });

  it("sets a single transition by gap index", () => {
    const p = addClips(createProject(), [clipInput("a.mp4", 1), clipInput("b.mp4", 1)]);
    const p2 = setTransition(p, 1, "fade");
    expect(p2.transitions).toEqual(["cut", "fade"]);
  });

  it("sets all transitions at once", () => {
    const p = addClips(createProject(), [clipInput("a.mp4", 1), clipInput("b.mp4", 1)]);
    const p2 = setAllTransitions(p, "fade");
    expect(p2.transitions).toEqual(["fade", "fade"]);
  });

  it("sets music id (null clears)", () => {
    const p = setMusic(createProject(), "track1");
    expect(p.musicId).toBe("track1");
    expect(setMusic(p, null).musicId).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- projectStore`
Expected: FAIL — module `../src/state/projectStore` not found.

- [ ] **Step 3: Implement the store**

Create `src/state/projectStore.ts`:
```ts
import type { Clip, Orientation, ProjectState, TransitionType } from "../types";

const uuid = () =>
  (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export function createProject(): ProjectState {
  return {
    schemaVersion: 1, orientation: null, introId: null,
    clips: [], transitions: [], musicId: null,
  };
}

export function setOrientation(s: ProjectState, o: Orientation): ProjectState {
  return { ...s, orientation: o };
}

export function selectIntro(s: ProjectState, introId: string): ProjectState {
  return { ...s, introId };
}

export function addClips(
  s: ProjectState,
  inputs: { name: string; durationSec: number }[],
): ProjectState {
  const newClips: Clip[] = inputs.map((i) => ({
    id: uuid(), name: i.name, durationSec: i.durationSec,
    trimInSec: 0, trimOutSec: i.durationSec, overlays: [],
  }));
  return {
    ...s,
    clips: [...s.clips, ...newClips],
    transitions: [...s.transitions, ...newClips.map<TransitionType>(() => "cut")],
  };
}

export function removeClip(s: ProjectState, id: string): ProjectState {
  const idx = s.clips.findIndex((c) => c.id === id);
  if (idx === -1) return s;
  const clips = s.clips.filter((c) => c.id !== id);
  const transitions = s.transitions.filter((_, i) => i !== idx);
  return { ...s, clips, transitions };
}

export function reorderClip(s: ProjectState, from: number, to: number): ProjectState {
  if (from < 0 || from >= s.clips.length || to < 0 || to >= s.clips.length) return s;
  const clips = [...s.clips];
  const [moved] = clips.splice(from, 1);
  clips.splice(to, 0, moved);
  return { ...s, clips };
}

export function trimClip(
  s: ProjectState, id: string, inSec: number, outSec: number,
): ProjectState {
  return {
    ...s,
    clips: s.clips.map((c) => {
      if (c.id !== id) return c;
      const trimInSec = Math.max(0, Math.min(inSec, c.durationSec));
      const trimOutSec = Math.max(0, Math.min(outSec, c.durationSec));
      if (trimInSec >= trimOutSec) return c; // reject inverted/empty
      return { ...c, trimInSec, trimOutSec };
    }),
  };
}

export function setTransition(
  s: ProjectState, gapIndex: number, type: TransitionType,
): ProjectState {
  if (gapIndex < 0 || gapIndex >= s.transitions.length) return s;
  const transitions = [...s.transitions];
  transitions[gapIndex] = type;
  return { ...s, transitions };
}

export function setAllTransitions(s: ProjectState, type: TransitionType): ProjectState {
  return { ...s, transitions: s.transitions.map(() => type) };
}

export function setMusic(s: ProjectState, musicId: string | null): ProjectState {
  return { ...s, musicId };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- projectStore`
Expected: all projectStore tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/projectStore.ts tests/projectStore.test.ts
git commit -m "feat: pure project-state store with tests"
```

---

## Task 4: Persistence (IndexedDB, TDD)

Persists the serializable `ProjectState` plus the source video `File`/`Blob`s so a page reload does not lose work. Tested against `fake-indexeddb`.

**Files:**
- Create: `src/state/persistence.ts`
- Test: `tests/persistence.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/persistence.test.ts`:
```ts
import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { saveProject, loadProject, clearProject,
  saveClipBlob, loadClipBlob } from "../src/state/persistence";
import { createProject, setOrientation } from "../src/state/projectStore";

describe("persistence", () => {
  beforeEach(async () => { await clearProject(); });

  it("returns null when nothing is saved", async () => {
    expect(await loadProject()).toBeNull();
  });

  it("round-trips project metadata", async () => {
    const p = setOrientation(createProject(), "portrait");
    await saveProject(p);
    expect(await loadProject()).toEqual(p);
  });

  it("clears saved project", async () => {
    await saveProject(createProject());
    await clearProject();
    expect(await loadProject()).toBeNull();
  });

  it("round-trips a clip blob by id", async () => {
    const blob = new Blob(["video-bytes"], { type: "video/mp4" });
    await saveClipBlob("clip-1", blob);
    const out = await loadClipBlob("clip-1");
    expect(out).not.toBeNull();
    expect(await out!.text()).toBe("video-bytes");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- persistence`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement persistence**

Create `src/state/persistence.ts`:
```ts
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
  await (await db()).put(BLOB_STORE, blob, id);
}
export async function loadClipBlob(id: string): Promise<Blob | null> {
  return (await (await db()).get(BLOB_STORE, id)) ?? null;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- persistence`
Expected: all persistence tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/state/persistence.ts tests/persistence.test.ts
git commit -m "feat: IndexedDB persistence for project + clip blobs"
```

---

## Task 5: Manifest loader (TDD)

Loads and validates the intros/music JSON, and filters intros by orientation.

**Files:**
- Create: `src/data/manifest.ts`
- Test: `tests/manifest.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/manifest.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { parseIntroManifest, introsFor, parseMusicManifest } from "../src/data/manifest";

const introJson = {
  landscape: [
    { id: "l1", label: "Intro 1", file: "intros/landscape/i1.mp4", thumbnail: "intros/landscape/i1.jpg" },
  ],
  portrait: [
    { id: "p1", label: "Intro 1", file: "intros/portrait/i1.mp4", thumbnail: "intros/portrait/i1.jpg" },
  ],
};

describe("manifest", () => {
  it("parses an intro manifest", () => {
    const m = parseIntroManifest(introJson);
    expect(m.landscape[0].id).toBe("l1");
  });

  it("returns only intros for the chosen orientation", () => {
    const m = parseIntroManifest(introJson);
    expect(introsFor(m, "portrait").map((i) => i.id)).toEqual(["p1"]);
  });

  it("throws on a malformed intro entry", () => {
    expect(() => parseIntroManifest({ landscape: [{ id: "x" }], portrait: [] }))
      .toThrow(/intro/i);
  });

  it("parses a music manifest", () => {
    const m = parseMusicManifest([{ id: "t1", label: "Calm", file: "music/t1.mp3" }]);
    expect(m[0].label).toBe("Calm");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- manifest`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the loader**

Create `src/data/manifest.ts`:
```ts
import type { IntroOption, MusicOption, Orientation } from "../types";

export interface IntroManifest {
  landscape: IntroOption[];
  portrait: IntroOption[];
}

function asIntro(x: unknown, where: string): IntroOption {
  const o = x as Record<string, unknown>;
  for (const k of ["id", "label", "file", "thumbnail"]) {
    if (typeof o?.[k] !== "string") throw new Error(`Bad intro entry in ${where}: missing ${k}`);
  }
  return o as unknown as IntroOption;
}

export function parseIntroManifest(json: unknown): IntroManifest {
  const o = json as Record<string, unknown>;
  const landscape = (o?.landscape as unknown[] ?? []).map((e) => asIntro(e, "landscape"));
  const portrait = (o?.portrait as unknown[] ?? []).map((e) => asIntro(e, "portrait"));
  return { landscape, portrait };
}

export function introsFor(m: IntroManifest, orientation: Orientation): IntroOption[] {
  return orientation === "portrait" ? m.portrait : m.landscape;
}

export function parseMusicManifest(json: unknown): MusicOption[] {
  return (json as unknown[] ?? []).map((x) => {
    const o = x as Record<string, unknown>;
    for (const k of ["id", "label", "file"]) {
      if (typeof o?.[k] !== "string") throw new Error(`Bad music entry: missing ${k}`);
    }
    return o as unknown as MusicOption;
  });
}

export async function fetchIntroManifest(base = "assets/"): Promise<IntroManifest> {
  const res = await fetch(`${base}intros/manifest.json`);
  return parseIntroManifest(await res.json());
}
export async function fetchMusicManifest(base = "assets/"): Promise<MusicOption[]> {
  const res = await fetch(`${base}music/music.json`);
  return parseMusicManifest(await res.json());
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- manifest`
Expected: all manifest tests PASS.

- [ ] **Step 5: Create sample manifest assets**

Create `public/assets/intros/manifest.json`:
```json
{
  "landscape": [
    { "id": "l1", "label": "Intro 1", "file": "assets/intros/landscape/intro1.mp4", "thumbnail": "assets/intros/landscape/intro1.jpg" }
  ],
  "portrait": [
    { "id": "p1", "label": "Intro 1", "file": "assets/intros/portrait/intro1.mp4", "thumbnail": "assets/intros/portrait/intro1.jpg" }
  ]
}
```

Create `public/assets/music/music.json`:
```json
[
  { "id": "none", "label": "No music (keep clip sound)", "file": "" },
  { "id": "calm", "label": "Calm Acoustic", "file": "assets/music/calm.mp3" }
]
```

Create `public/assets/branding/theme.json`:
```json
{ "appName": "Promo Editor", "bg": "#0a0a0a", "fg": "#ffffff", "silver": "#c0c0c0", "accent": "#ff7a00" }
```

(Drop placeholder `intro1.mp4`/`intro1.jpg`/`calm.mp3` files into the matching folders so fetches don't 404. Real assets replace them later.)

- [ ] **Step 6: Commit**

```bash
git add src/data/manifest.ts tests/manifest.test.ts public/assets
git commit -m "feat: manifest loader + sample assets"
```

---

## Task 6: Theme loader

Applies `theme.json` colors to CSS variables at boot.

**Files:**
- Create: `src/theme.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Implement theme loader**

Create `src/theme.ts`:
```ts
export interface Theme {
  appName: string; bg: string; fg: string; silver: string; accent: string;
}

const FALLBACK: Theme = {
  appName: "Promo Editor", bg: "#0a0a0a", fg: "#ffffff",
  silver: "#c0c0c0", accent: "#ff7a00",
};

export async function loadTheme(base = "assets/"): Promise<Theme> {
  try {
    const res = await fetch(`${base}branding/theme.json`);
    return { ...FALLBACK, ...(await res.json()) };
  } catch {
    return FALLBACK;
  }
}

export function applyTheme(t: Theme): void {
  const r = document.documentElement.style;
  r.setProperty("--bg", t.bg);
  r.setProperty("--fg", t.fg);
  r.setProperty("--silver", t.silver);
  r.setProperty("--accent", t.accent);
  document.title = t.appName;
}
```

- [ ] **Step 2: Wire it into main.ts**

Replace `src/main.ts` with:
```ts
import "./styles/app.css";
import { loadTheme, applyTheme } from "./theme";
import { startWizard } from "./wizard/wizard";

async function boot() {
  applyTheme(await loadTheme());
  const app = document.querySelector<HTMLDivElement>("#app")!;
  startWizard(app);
}
boot();
```

(`startWizard` is created in Task 8 — the app won't run until then; that's expected.)

- [ ] **Step 3: Commit**

```bash
git add src/theme.ts src/main.ts
git commit -m "feat: theme loader applying brand colors to CSS variables"
```

---

## Task 7: Wizard router with gating (TDD)

Pure logic for step order and forward-gating: you can't pick an intro before choosing orientation, etc.

**Files:**
- Create: `src/wizard/router.ts`
- Test: `tests/router.test.ts`

- [ ] **Step 1: Write failing tests**

Create `tests/router.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { STEPS, canEnter, nextStep, prevStep } from "../src/wizard/router";
import { createProject, setOrientation, selectIntro, addClips } from "../src/state/projectStore";

describe("router", () => {
  it("lists steps in order", () => {
    expect(STEPS).toEqual([
      "splash", "orientation", "intro", "clips", "trim", "transitions", "music", "review",
    ]);
  });

  it("blocks 'intro' until orientation chosen", () => {
    const p = createProject();
    expect(canEnter("intro", p)).toBe(false);
    expect(canEnter("intro", setOrientation(p, "portrait"))).toBe(true);
  });

  it("blocks 'clips' until an intro is selected", () => {
    const p = setOrientation(createProject(), "portrait");
    expect(canEnter("clips", p)).toBe(false);
    expect(canEnter("clips", selectIntro(p, "p1"))).toBe(true);
  });

  it("blocks 'trim'/'transitions'/'review' until at least one clip exists", () => {
    let p = selectIntro(setOrientation(createProject(), "portrait"), "p1");
    expect(canEnter("trim", p)).toBe(false);
    p = addClips(p, [{ name: "a.mp4", durationSec: 3 }]);
    expect(canEnter("trim", p)).toBe(true);
    expect(canEnter("review", p)).toBe(true);
  });

  it("advances to the next enterable step", () => {
    const p = setOrientation(createProject(), "portrait");
    expect(nextStep("orientation", p)).toBe("intro");
  });

  it("goes back to the previous step", () => {
    expect(prevStep("intro")).toBe("orientation");
    expect(prevStep("splash")).toBe("splash");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- router`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the router**

Create `src/wizard/router.ts`:
```ts
import type { ProjectState } from "../types";

export const STEPS = [
  "splash", "orientation", "intro", "clips", "trim", "transitions", "music", "review",
] as const;
export type Step = (typeof STEPS)[number];

export function canEnter(step: Step, p: ProjectState): boolean {
  switch (step) {
    case "splash":
    case "orientation":
      return true;
    case "intro":
      return p.orientation !== null;
    case "clips":
      return p.orientation !== null && p.introId !== null;
    case "trim":
    case "transitions":
    case "music":
    case "review":
      return p.orientation !== null && p.introId !== null && p.clips.length > 0;
  }
}

export function nextStep(current: Step, p: ProjectState): Step {
  const i = STEPS.indexOf(current);
  for (let j = i + 1; j < STEPS.length; j++) {
    if (canEnter(STEPS[j], p)) return STEPS[j];
  }
  return current;
}

export function prevStep(current: Step): Step {
  const i = STEPS.indexOf(current);
  return i <= 0 ? current : STEPS[i - 1];
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test -- router`
Expected: all router tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wizard/router.ts tests/router.test.ts
git commit -m "feat: wizard router with step gating"
```

---

## Task 8: Wizard shell + shared UI + splash step

The DOM shell that holds the current project, persists it on change, and renders the active step. Includes shared button/header helpers and the splash screen.

**Files:**
- Create: `src/ui/components.ts`, `src/wizard/wizard.ts`, `src/wizard/steps/splash.ts`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Add shared UI helpers**

Create `src/ui/components.ts`:
```ts
export function bigButton(label: string, onClick: () => void, opts: { primary?: boolean } = {}) {
  const b = document.createElement("button");
  b.textContent = label;
  b.className = "big-btn" + (opts.primary ? " primary" : "");
  b.addEventListener("click", onClick);
  return b;
}

export function header(title: string, subtitle?: string) {
  const h = document.createElement("div");
  h.className = "step-header";
  const t = document.createElement("h1");
  t.textContent = title;
  h.appendChild(t);
  if (subtitle) {
    const s = document.createElement("p");
    s.textContent = subtitle;
    h.appendChild(s);
  }
  return h;
}

export function navBar(onBack: (() => void) | null, onNext: (() => void) | null, nextLabel = "Next") {
  const nav = document.createElement("div");
  nav.className = "nav-bar";
  if (onBack) nav.appendChild(bigButton("Back", onBack));
  else nav.appendChild(document.createElement("span"));
  if (onNext) nav.appendChild(bigButton(nextLabel, onNext, { primary: true }));
  return nav;
}
```

- [ ] **Step 2: Add responsive styles**

Append to `src/styles/app.css`:
```css
.wizard { flex: 1; display: flex; flex-direction: column; padding: 16px;
  max-width: 720px; width: 100%; margin: 0 auto; gap: 16px; }
.step-header h1 { font-size: 1.6rem; margin: 0 0 4px; }
.step-header p { color: var(--silver); margin: 0; font-size: 1rem; }
.step-body { flex: 1; display: flex; flex-direction: column; gap: 12px; }
.big-btn { font-size: 1.2rem; padding: 18px 20px; border-radius: 14px;
  border: 2px solid var(--silver); background: transparent; color: var(--fg);
  min-height: 60px; cursor: pointer; }
.big-btn.primary { background: var(--accent); border-color: var(--accent); color: #000; font-weight: 700; }
.big-btn:disabled { opacity: 0.4; }
.nav-bar { display: flex; justify-content: space-between; gap: 12px; margin-top: auto; }
.nav-bar .big-btn { flex: 1; }
.choice-grid { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 600px) { .choice-grid { grid-template-columns: 1fr 1fr; } }
.splash { flex: 1; display: flex; flex-direction: column; align-items: center;
  justify-content: center; gap: 20px; }
.splash img { max-width: 200px; }
```

- [ ] **Step 3: Implement the wizard shell**

Create `src/wizard/wizard.ts`:
```ts
import type { ProjectState } from "../types";
import { createProject } from "../state/projectStore";
import { loadProject, saveProject } from "../state/persistence";
import { STEPS, type Step, canEnter, nextStep, prevStep } from "./router";
import { renderSplash } from "./steps/splash";
import { renderOrientation } from "./steps/orientation";
import { renderIntro } from "./steps/intro";
import { renderClips } from "./steps/clips";
import { renderTrim } from "./steps/trim";
import { renderTransitions } from "./steps/transitions";
import { renderMusic } from "./steps/music";
import { renderReview } from "./steps/review";

export interface WizardCtx {
  project: ProjectState;
  go: (step: Step) => void;
  next: () => void;
  back: () => void;
  update: (mutator: (p: ProjectState) => ProjectState) => void;
}

export async function startWizard(root: HTMLElement) {
  let project = (await loadProject()) ?? createProject();
  let current: Step = "splash";

  const ctx: WizardCtx = {
    get project() { return project; },
    go(step) { if (canEnter(step, project)) { current = step; render(); } },
    next() { current = nextStep(current, project); render(); },
    back() { current = prevStep(current); render(); },
    update(mutator) { project = mutator(project); void saveProject(project); render(); },
  } as WizardCtx;

  function render() {
    root.innerHTML = "";
    const view = document.createElement("div");
    view.className = current === "splash" ? "splash" : "wizard";
    root.appendChild(view);
    switch (current) {
      case "splash": return renderSplash(view, ctx);
      case "orientation": return renderOrientation(view, ctx);
      case "intro": return renderIntro(view, ctx);
      case "clips": return renderClips(view, ctx);
      case "trim": return renderTrim(view, ctx);
      case "transitions": return renderTransitions(view, ctx);
      case "music": return renderMusic(view, ctx);
      case "review": return renderReview(view, ctx);
    }
  }

  void STEPS; // keep import used
  render();
}
```

- [ ] **Step 4: Implement the splash step**

Create `src/wizard/steps/splash.ts`:
```ts
import type { WizardCtx } from "../wizard";
import { bigButton } from "../../ui/components";

export function renderSplash(view: HTMLElement, ctx: WizardCtx) {
  const img = document.createElement("img");
  img.src = "assets/branding/logo.png";
  img.alt = "Logo";
  img.onerror = () => { img.style.display = "none"; };
  const title = document.createElement("h1");
  title.textContent = document.title;
  const start = bigButton("Start", () => ctx.go("orientation"), { primary: true });
  view.append(img, title, start);
}
```

- [ ] **Step 5: Verify the app boots to the splash screen**

Run: `npm run dev`, open the URL.
Expected: splash screen with title + "Start" button. Clicking "Start" errors only if later steps aren't built yet — proceed to Task 9. Stop the server.

- [ ] **Step 6: Commit**

```bash
git add src/ui/components.ts src/wizard/wizard.ts src/wizard/steps/splash.ts src/styles/app.css
git commit -m "feat: wizard shell, shared UI, splash screen"
```

---

## Task 9: Orientation step

**Files:**
- Create: `src/wizard/steps/orientation.ts`

- [ ] **Step 1: Implement the orientation step**

Create `src/wizard/steps/orientation.ts`:
```ts
import type { WizardCtx } from "../wizard";
import { header } from "../../ui/components";
import { setOrientation } from "../../state/projectStore";
import type { Orientation } from "../../types";

export function renderOrientation(view: HTMLElement, ctx: WizardCtx) {
  view.appendChild(header("Choose a format", "How should the finished video look?"));
  const grid = document.createElement("div");
  grid.className = "choice-grid";
  const make = (label: string, value: Orientation) => {
    const b = document.createElement("button");
    b.className = "big-btn" + (ctx.project.orientation === value ? " primary" : "");
    b.textContent = label;
    b.addEventListener("click", () => {
      ctx.update((p) => setOrientation(p, value));
      ctx.next();
    });
    return b;
  };
  grid.append(make("Portrait ↕", "portrait"), make("Landscape ↔", "landscape"));
  view.appendChild(grid);
}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`: Start → two big format buttons. Choosing one advances to the intro step (blank until Task 10). Stop server.

- [ ] **Step 3: Commit**

```bash
git add src/wizard/steps/orientation.ts
git commit -m "feat: orientation selection step"
```

---

## Task 10: Intro picker step

Loads the manifest, shows only the chosen orientation's intros with a thumbnail and a tap-to-preview video.

**Files:**
- Create: `src/wizard/steps/intro.ts`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Add intro-card styles**

Append to `src/styles/app.css`:
```css
.intro-list { display: grid; grid-template-columns: 1fr; gap: 12px; }
@media (min-width: 600px) { .intro-list { grid-template-columns: 1fr 1fr; } }
.intro-card { border: 2px solid var(--silver); border-radius: 14px; overflow: hidden;
  background: #111; cursor: pointer; }
.intro-card.selected { border-color: var(--accent); }
.intro-card img, .intro-card video { width: 100%; display: block; background: #000; }
.intro-card .label { padding: 10px 12px; font-size: 1.1rem; }
```

- [ ] **Step 2: Implement the intro step**

Create `src/wizard/steps/intro.ts`:
```ts
import type { WizardCtx } from "../wizard";
import { header, navBar } from "../../ui/components";
import { fetchIntroManifest, introsFor } from "../../data/manifest";
import { selectIntro } from "../../state/projectStore";
import type { IntroOption } from "../../types";

export async function renderIntro(view: HTMLElement, ctx: WizardCtx) {
  view.appendChild(header("Pick an intro", "Tap a card to preview, tap again to choose."));
  const list = document.createElement("div");
  list.className = "intro-list";
  view.appendChild(list);
  view.appendChild(navBar(() => ctx.back(),
    ctx.project.introId ? () => ctx.next() : null));

  const manifest = await fetchIntroManifest();
  const intros = introsFor(manifest, ctx.project.orientation!);
  for (const intro of intros) list.appendChild(card(intro, ctx));
}

function card(intro: IntroOption, ctx: WizardCtx) {
  const el = document.createElement("div");
  el.className = "intro-card" + (ctx.project.introId === intro.id ? " selected" : "");
  const thumb = document.createElement("img");
  thumb.src = intro.thumbnail;
  thumb.alt = intro.label;
  const label = document.createElement("div");
  label.className = "label";
  label.textContent = intro.label;
  el.append(thumb, label);
  let previewing = false;
  el.addEventListener("click", () => {
    if (!previewing) {
      previewing = true;
      const v = document.createElement("video");
      v.src = intro.file; v.controls = true; v.autoplay = true; v.playsInline = true;
      el.replaceChild(v, thumb);
    } else {
      ctx.update((p) => selectIntro(p, intro.id));
    }
  });
  return el;
}
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`: pick orientation → intro cards appear for that orientation. Tap = preview; tap again = select (orange border) and "Next" enables. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/wizard/steps/intro.ts src/styles/app.css
git commit -m "feat: orientation-filtered intro picker"
```

---

## Task 11: Add-clips step (camera-roll picker)

Multi-select from the camera roll; reads each clip's duration via a hidden `<video>`; stores metadata in the project and the File blob in IndexedDB.

**Files:**
- Create: `src/wizard/steps/clips.ts`, `src/media/probe.ts`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Implement duration probe**

Create `src/media/probe.ts`:
```ts
export function probeDuration(file: File): Promise<number> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.onloadedmetadata = () => {
      URL.revokeObjectURL(v.src);
      resolve(isFinite(v.duration) ? v.duration : 0);
    };
    v.onerror = () => resolve(0);
    v.src = URL.createObjectURL(file);
  });
}
```

- [ ] **Step 2: Add clip-list styles**

Append to `src/styles/app.css`:
```css
.clip-row { display: flex; align-items: center; gap: 12px; border: 1px solid var(--silver);
  border-radius: 12px; padding: 10px 12px; }
.clip-row .name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.clip-row .dur { color: var(--silver); }
.clip-row button { background: transparent; color: var(--fg); border: 1px solid var(--silver);
  border-radius: 8px; min-width: 44px; min-height: 44px; font-size: 1.1rem; }
.file-input { display: none; }
```

- [ ] **Step 3: Implement the clips step**

Create `src/wizard/steps/clips.ts`:
```ts
import type { WizardCtx } from "../wizard";
import { header, navBar, bigButton } from "../../ui/components";
import { addClips, removeClip } from "../../state/projectStore";
import { saveClipBlob } from "../../state/persistence";
import { probeDuration } from "../../media/probe";

function fmt(s: number) {
  const m = Math.floor(s / 60), sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export function renderClips(view: HTMLElement, ctx: WizardCtx) {
  view.appendChild(header("Add videos", "Pick clips from your camera roll."));

  const input = document.createElement("input");
  input.type = "file";
  input.accept = "video/*";
  input.multiple = true;
  input.className = "file-input";
  input.addEventListener("change", async () => {
    const files = Array.from(input.files ?? []);
    if (!files.length) return;
    const inputs = await Promise.all(
      files.map(async (f) => ({ name: f.name, durationSec: await probeDuration(f) })),
    );
    const before = ctx.project.clips.length;
    ctx.update((p) => addClips(p, inputs));
    // persist blobs against the newly created clip ids
    const added = ctx.project.clips.slice(before);
    await Promise.all(added.map((c, i) => saveClipBlob(c.id, files[i])));
  });
  view.appendChild(input);
  view.appendChild(bigButton("+ Select videos", () => input.click(), { primary: true }));

  const list = document.createElement("div");
  list.className = "step-body";
  for (const c of ctx.project.clips) {
    const row = document.createElement("div");
    row.className = "clip-row";
    const name = document.createElement("span");
    name.className = "name"; name.textContent = c.name;
    const dur = document.createElement("span");
    dur.className = "dur"; dur.textContent = fmt(c.trimOutSec - c.trimInSec);
    const del = document.createElement("button");
    del.textContent = "✕";
    del.addEventListener("click", () => ctx.update((p) => removeClip(p, c.id)));
    row.append(name, dur, del);
    list.appendChild(row);
  }
  view.appendChild(list);

  view.appendChild(navBar(() => ctx.back(),
    ctx.project.clips.length ? () => ctx.next() : null));
}
```

- [ ] **Step 4: Verify in browser**

Run `npm run dev`: at the clips step, "Select videos" opens the file picker; chosen videos appear as rows with durations; the ✕ removes one; "Next" enables once ≥1 clip exists. (On a desktop browser this uses the file dialog; on iPhone it opens the camera roll.) Stop server.

- [ ] **Step 5: Commit**

```bash
git add src/wizard/steps/clips.ts src/media/probe.ts src/styles/app.css
git commit -m "feat: camera-roll multi-select clips step with duration probe"
```

---

## Task 12: Arrange & trim step

Reorder clips up/down and trim each with two range sliders (start/end) plus a live preview of the in/out points.

**Files:**
- Create: `src/wizard/steps/trim.ts`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Add trim styles**

Append to `src/styles/app.css`:
```css
.trim-card { border: 1px solid var(--silver); border-radius: 12px; padding: 12px;
  display: flex; flex-direction: column; gap: 8px; }
.trim-card .row { display: flex; align-items: center; gap: 10px; }
.trim-card .name { flex: 1; }
.trim-card input[type=range] { width: 100%; }
.trim-card .move button { min-width: 44px; min-height: 44px; }
.trim-times { color: var(--silver); font-variant-numeric: tabular-nums; }
```

- [ ] **Step 2: Implement the trim step**

Create `src/wizard/steps/trim.ts`:
```ts
import type { WizardCtx } from "../wizard";
import { header, navBar } from "../../ui/components";
import { reorderClip, trimClip } from "../../state/projectStore";

function fmt(s: number) {
  const m = Math.floor(s / 60), sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, "0")}`;
}

export function renderTrim(view: HTMLElement, ctx: WizardCtx) {
  view.appendChild(header("Arrange & trim", "Reorder clips and set start/end. Or leave as-is."));
  const body = document.createElement("div");
  body.className = "step-body";

  ctx.project.clips.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "trim-card";

    const top = document.createElement("div");
    top.className = "row";
    const name = document.createElement("span");
    name.className = "name"; name.textContent = `${idx + 1}. ${c.name}`;
    const move = document.createElement("span");
    move.className = "move";
    const up = document.createElement("button"); up.textContent = "↑";
    up.disabled = idx === 0;
    up.addEventListener("click", () => ctx.update((p) => reorderClip(p, idx, idx - 1)));
    const down = document.createElement("button"); down.textContent = "↓";
    down.disabled = idx === ctx.project.clips.length - 1;
    down.addEventListener("click", () => ctx.update((p) => reorderClip(p, idx, idx + 1)));
    move.append(up, down);
    top.append(name, move);

    const times = document.createElement("div");
    times.className = "trim-times";
    const render = () => { times.textContent = `In ${fmt(c.trimInSec)}  →  Out ${fmt(c.trimOutSec)}`; };
    render();

    const start = document.createElement("input");
    start.type = "range"; start.min = "0"; start.max = String(c.durationSec); start.step = "0.1";
    start.value = String(c.trimInSec);
    const end = document.createElement("input");
    end.type = "range"; end.min = "0"; end.max = String(c.durationSec); end.step = "0.1";
    end.value = String(c.trimOutSec);
    const commit = () => ctx.update((p) =>
      trimClip(p, c.id, parseFloat(start.value), parseFloat(end.value)));
    start.addEventListener("input", () => { c.trimInSec = parseFloat(start.value); render(); });
    end.addEventListener("input", () => { c.trimOutSec = parseFloat(end.value); render(); });
    start.addEventListener("change", commit);
    end.addEventListener("change", commit);

    card.append(top, times, start, end);
    body.appendChild(card);
  });

  view.appendChild(body);
  view.appendChild(navBar(() => ctx.back(), () => ctx.next()));
}
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`: each clip shows up/down reorder and two sliders; dragging updates the In/Out readout; releasing commits the trim (clamped/validated by the store). Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/wizard/steps/trim.ts src/styles/app.css
git commit -m "feat: arrange & trim step"
```

---

## Task 13: Transitions step

One control per gap (intro→clip1, clip1→clip2, …) to choose Cut or Fade, plus a "Set all" shortcut.

**Files:**
- Create: `src/wizard/steps/transitions.ts`
- Modify: `src/styles/app.css`

- [ ] **Step 1: Add transition styles**

Append to `src/styles/app.css`:
```css
.gap-row { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #222; padding: 10px 0; }
.gap-row .label { flex: 1; }
.toggle { display: flex; border: 1px solid var(--silver); border-radius: 10px; overflow: hidden; }
.toggle button { background: transparent; color: var(--fg); border: 0; padding: 12px 16px; min-height: 44px; }
.toggle button.on { background: var(--accent); color: #000; font-weight: 700; }
```

- [ ] **Step 2: Implement the transitions step**

Create `src/wizard/steps/transitions.ts`:
```ts
import type { WizardCtx } from "../wizard";
import { header, navBar, bigButton } from "../../ui/components";
import { setTransition, setAllTransitions } from "../../state/projectStore";
import type { TransitionType } from "../../types";

function gapLabel(i: number, names: string[]) {
  const left = i === 0 ? "Intro" : names[i - 1];
  return `${left}  →  ${names[i]}`;
}

export function renderTransitions(view: HTMLElement, ctx: WizardCtx) {
  view.appendChild(header("Transitions", "How each clip joins the next."));
  const names = ctx.project.clips.map((c, i) => `Clip ${i + 1}`);

  view.appendChild(bigButton("Set all to Fade", () => ctx.update((p) => setAllTransitions(p, "fade"))));
  view.appendChild(bigButton("Set all to Cut", () => ctx.update((p) => setAllTransitions(p, "cut"))));

  const body = document.createElement("div");
  body.className = "step-body";
  ctx.project.transitions.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = "gap-row";
    const label = document.createElement("span");
    label.className = "label"; label.textContent = gapLabel(i, names);
    const toggle = document.createElement("div");
    toggle.className = "toggle";
    const mk = (val: TransitionType, text: string) => {
      const b = document.createElement("button");
      b.textContent = text;
      if (t === val) b.classList.add("on");
      b.addEventListener("click", () => ctx.update((p) => setTransition(p, i, val)));
      return b;
    };
    toggle.append(mk("cut", "Cut"), mk("fade", "Fade"));
    row.append(label, toggle);
    body.appendChild(row);
  });

  view.appendChild(body);
  view.appendChild(navBar(() => ctx.back(), () => ctx.next()));
}
```

- [ ] **Step 3: Verify in browser**

Run `npm run dev`: one Cut/Fade toggle per join, highlighting the active choice; "Set all" updates them together. Stop server.

- [ ] **Step 4: Commit**

```bash
git add src/wizard/steps/transitions.ts src/styles/app.css
git commit -m "feat: per-gap transitions step with set-all"
```

---

## Task 14: Music step

Pick one bundled track or "No music". Selecting a real track will mute clip audio at render time (Plan 2); here we just record the choice and let the user preview tracks.

**Files:**
- Create: `src/wizard/steps/music.ts`

- [ ] **Step 1: Implement the music step**

Create `src/wizard/steps/music.ts`:
```ts
import type { WizardCtx } from "../wizard";
import { header, navBar } from "../../ui/components";
import { setMusic } from "../../state/projectStore";
import { fetchMusicManifest } from "../../data/manifest";

export async function renderMusic(view: HTMLElement, ctx: WizardCtx) {
  view.appendChild(header("Background music", "Optional. Picking a track mutes the clip sound."));
  const body = document.createElement("div");
  body.className = "step-body";
  view.appendChild(body);
  view.appendChild(navBar(() => ctx.back(), () => ctx.next(), "Review"));

  const tracks = await fetchMusicManifest();
  for (const track of tracks) {
    const row = document.createElement("div");
    row.className = "gap-row";
    const btn = document.createElement("button");
    btn.className = "big-btn" +
      ((ctx.project.musicId === track.id || (track.id === "none" && !ctx.project.musicId)) ? " primary" : "");
    btn.textContent = track.label;
    btn.style.flex = "1";
    btn.addEventListener("click", () =>
      ctx.update((p) => setMusic(p, track.id === "none" ? null : track.id)));
    row.appendChild(btn);
    if (track.file) {
      const audio = document.createElement("audio");
      audio.src = track.file; audio.controls = true;
      row.appendChild(audio);
    }
    body.appendChild(row);
  }
}
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`: music list shows "No music" + bundled tracks, each previewable; selecting highlights it. "Review" advances. Stop server.

- [ ] **Step 3: Commit**

```bash
git add src/wizard/steps/music.ts
git commit -m "feat: background-music selection step"
```

---

## Task 15: Review step (Plan-2 render stub)

Displays the fully assembled project so the whole flow is demoable end-to-end. Plan 2 replaces the "Render" action with the real `ffmpeg.wasm` renderer.

**Files:**
- Create: `src/wizard/steps/review.ts`

- [ ] **Step 1: Implement the review step**

Create `src/wizard/steps/review.ts`:
```ts
import type { WizardCtx } from "../wizard";
import { header, navBar, bigButton } from "../../ui/components";
import { clearProject } from "../../state/persistence";
import { createProject } from "../../state/projectStore";

export function renderReview(view: HTMLElement, ctx: WizardCtx) {
  const p = ctx.project;
  view.appendChild(header("Review", "Here's your video plan."));

  const lines = [
    `Format: ${p.orientation}`,
    `Intro: ${p.introId}`,
    `Clips: ${p.clips.length}`,
    ...p.clips.map((c, i) =>
      `  ${i + 1}. ${c.name}  [${c.trimInSec.toFixed(1)}s → ${c.trimOutSec.toFixed(1)}s]`),
    `Transitions: ${p.transitions.join(", ")}`,
    `Music: ${p.musicId ?? "(clip audio)"}`,
  ];
  const pre = document.createElement("pre");
  pre.style.whiteSpace = "pre-wrap";
  pre.style.color = "var(--silver)";
  pre.textContent = lines.join("\n");
  view.appendChild(pre);

  view.appendChild(bigButton("Render (coming in Plan 2)", () => {
    alert("Rendering is implemented in Plan 2.");
  }, { primary: true }));

  view.appendChild(bigButton("Start over", async () => {
    await clearProject();
    ctx.update(() => createProject());
    ctx.go("splash");
  }));

  view.appendChild(navBar(() => ctx.back(), null));
}
```

- [ ] **Step 2: Verify the full flow end-to-end**

Run `npm run dev`: walk splash → orientation → intro → clips → trim → transitions → music → review. The review screen lists every choice. "Start over" resets. Stop server.

- [ ] **Step 3: Commit**

```bash
git add src/wizard/steps/review.ts
git commit -m "feat: review step summarizing the assembled project"
```

---

## Task 16: PWA install + GitHub Pages deploy

Make it installable to the iPhone home screen and deployable to GitHub Pages.

**Files:**
- Modify: `vite.config.ts`, `index.html`
- Create: `public/assets/branding/icon-192.png`, `icon-512.png` (placeholders), `.github/workflows/deploy.yml`

- [ ] **Step 1: Configure the PWA plugin**

Replace `vite.config.ts` with:
```ts
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// For GitHub Pages set base to "/<repo-name>/". Local dev/preview uses "/".
const base = process.env.GHPAGES === "1" ? "/videoeditor/" : "/";

export default defineConfig({
  base,
  plugins: [
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["assets/**/*"],
      manifest: {
        name: "Promo Editor",
        short_name: "Promo",
        display: "standalone",
        background_color: "#0a0a0a",
        theme_color: "#0a0a0a",
        icons: [
          { src: "assets/branding/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "assets/branding/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
      },
      workbox: {
        // bump max file size so bundled intro mp4s can be precached if desired
        maximumFileSizeToCacheInBytes: 50 * 1024 * 1024,
      },
    }),
  ],
  test: { environment: "jsdom" },
});
```

- [ ] **Step 2: Add iOS-specific meta tags**

Add inside `<head>` of `index.html`:
```html
<link rel="apple-touch-icon" href="assets/branding/icon-192.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
```

Drop placeholder `icon-192.png` and `icon-512.png` into `public/assets/branding/` (replace with real logo-derived icons later).

- [ ] **Step 3: Verify the production build**

Run: `npm run build`
Expected: `tsc --noEmit` passes (no type errors) and Vite writes `dist/` including a generated `manifest.webmanifest` and service worker.
Run: `npm run preview` and open the URL — the app works and the browser offers "install".

- [ ] **Step 4: Add the GitHub Pages workflow**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: GHPAGES=1 npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts index.html .github/workflows/deploy.yml public/assets/branding
git commit -m "feat: PWA manifest, iOS install tags, GitHub Pages deploy"
```

- [ ] **Step 6: Manual device verification (record results)**

After pushing to GitHub and enabling Pages (Settings → Pages → Source: GitHub Actions):
1. Open the Pages URL in iPhone Safari.
2. Share → "Add to Home Screen"; confirm the icon + name appear.
3. Launch from the home screen: confirm full-screen (no Safari chrome), splash shows, full wizard works, clips load from the camera roll, choices persist across a relaunch.

Note any issues for follow-up; rendering itself is Plan 2.

---

## Self-Review Notes

- **Spec coverage:** PWA/GitHub Pages (Tasks 1,16) ✓; orientation→intro→clips→trim→transitions→music flow (Tasks 9–14) ✓; orientation-filtered intros (Task 10) ✓; camera-roll multi-select (Task 11) ✓; trim + reorder (Task 12) ✓; cut/fade transitions (Task 13) ✓; bundled music that mutes clips — choice recorded here, applied at render in Plan 2 (Task 14) ✓; dark/high-contrast/large-target responsive theme (Tasks 6,8 + CSS) ✓; branding via swappable assets (Tasks 5,6,16) ✓; auto-save/restore (Tasks 4,8) ✓; mobile-first responsive (CSS breakpoints) ✓. Text overlays are v1.1 (out of scope, type stubbed in Task 2) ✓. Rendering + export are Plan 2 ✓.
- **Type consistency:** `ProjectState`/`Clip`/`Orientation`/`TransitionType`/`IntroOption`/`MusicOption` defined once in Task 2 and used unchanged throughout. Store function names match between Task 3 and their callers (Tasks 9–15).
- **No placeholders:** every code step contains complete code; manual-only steps (device verification) are explicitly labeled.
