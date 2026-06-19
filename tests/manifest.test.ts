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
