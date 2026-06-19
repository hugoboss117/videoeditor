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
