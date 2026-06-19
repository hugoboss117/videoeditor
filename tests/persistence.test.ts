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
