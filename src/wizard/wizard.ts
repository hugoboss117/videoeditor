import type { ProjectState } from "../types";
import { createProject } from "../state/projectStore";
import { loadProject, saveProject } from "../state/persistence";
import { STEPS, type Step, canEnter, nextStep, prevStep } from "./router";
import { renderSplash } from "./steps/splash";
import { renderOrientation } from "./steps/orientation";
import { renderIntro } from "./steps/intro";
import { renderClips } from "./steps/clips";
import { renderTrim } from "./steps/trim";
import { renderTransitions } from "./steps/transitions";
import { renderMusic } from "./steps/music";
import { renderReview } from "./steps/review";

export interface WizardCtx {
  project: ProjectState;
  go: (step: Step) => void;
  next: () => void;
  back: () => void;
  update: (mutator: (p: ProjectState) => ProjectState) => void;
}

export async function startWizard(root: HTMLElement) {
  let project = (await loadProject()) ?? createProject();
  let current: Step = "splash";

  const ctx: WizardCtx = {
    get project() { return project; },
    go(step) { if (canEnter(step, project)) { current = step; render(); } },
    next() { current = nextStep(current, project); render(); },
    back() { current = prevStep(current); render(); },
    update(mutator) { project = mutator(project); void saveProject(project); render(); },
  } as WizardCtx;

  function render() {
    root.innerHTML = "";
    const view = document.createElement("div");
    view.className = current === "splash" ? "splash" : "wizard";
    root.appendChild(view);
    switch (current) {
      case "splash": return renderSplash(view, ctx);
      case "orientation": return renderOrientation(view, ctx);
      case "intro": return renderIntro(view, ctx);
      case "clips": return renderClips(view, ctx);
      case "trim": return renderTrim(view, ctx);
      case "transitions": return renderTransitions(view, ctx);
      case "music": return renderMusic(view, ctx);
      case "review": return renderReview(view, ctx);
    }
  }

  void STEPS; // keep import used
  render();
}
