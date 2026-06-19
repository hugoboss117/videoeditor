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
