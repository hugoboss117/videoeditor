import type { WizardCtx } from "../wizard";
import { header, navBar, bigButton } from "../../ui/components";
import { setTransition, setAllTransitions } from "../../state/projectStore";
import type { TransitionType } from "../../types";

function gapLabel(i: number, names: string[]) {
  const left = i === 0 ? "Intro" : names[i - 1];
  return `${left}  →  ${names[i]}`;
}

export function renderTransitions(view: HTMLElement, ctx: WizardCtx) {
  view.appendChild(header("Transitions", "How each clip joins the next."));
  const names = ctx.project.clips.map((c, i) => `Clip ${i + 1}`);

  view.appendChild(bigButton("Set all to Fade", () => ctx.update((p) => setAllTransitions(p, "fade"))));
  view.appendChild(bigButton("Set all to Cut", () => ctx.update((p) => setAllTransitions(p, "cut"))));

  const body = document.createElement("div");
  body.className = "step-body";
  ctx.project.transitions.forEach((t, i) => {
    const row = document.createElement("div");
    row.className = "gap-row";
    const label = document.createElement("span");
    label.className = "label"; label.textContent = gapLabel(i, names);
    const toggle = document.createElement("div");
    toggle.className = "toggle";
    const mk = (val: TransitionType, text: string) => {
      const b = document.createElement("button");
      b.textContent = text;
      if (t === val) b.classList.add("on");
      b.addEventListener("click", () => ctx.update((p) => setTransition(p, i, val)));
      return b;
    };
    toggle.append(mk("cut", "Cut"), mk("fade", "Fade"));
    row.append(label, toggle);
    body.appendChild(row);
  });

  view.appendChild(body);
  view.appendChild(navBar(() => ctx.back(), () => ctx.next()));
}
