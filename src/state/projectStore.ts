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
