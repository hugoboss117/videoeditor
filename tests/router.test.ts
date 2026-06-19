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
