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
