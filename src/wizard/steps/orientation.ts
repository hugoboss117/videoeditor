import type { WizardCtx } from "../wizard";
import { header } from "../../ui/components";
import { setOrientation } from "../../state/projectStore";
import type { Orientation } from "../../types";

export function renderOrientation(view: HTMLElement, ctx: WizardCtx) {
  view.appendChild(header("Choose a format", "How should the finished video look?"));
  const grid = document.createElement("div");
  grid.className = "choice-grid";
  const make = (label: string, value: Orientation) => {
    const b = document.createElement("button");
    b.className = "big-btn" + (ctx.project.orientation === value ? " primary" : "");
    b.textContent = label;
    b.addEventListener("click", () => {
      ctx.update((p) => setOrientation(p, value));
      ctx.next();
    });
    return b;
  };
  grid.append(make("Portrait ↕", "portrait"), make("Landscape ↔", "landscape"));
  view.appendChild(grid);
}
