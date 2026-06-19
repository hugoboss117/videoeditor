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
