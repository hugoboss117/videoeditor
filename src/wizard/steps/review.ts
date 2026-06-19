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
