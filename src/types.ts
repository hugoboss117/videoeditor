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
