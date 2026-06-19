import type { ProjectState } from "../types";

export const STEPS = [
  "splash", "orientation", "intro", "clips", "trim", "transitions", "music", "review",
] as const;
export type Step = (typeof STEPS)[number];

export function canEnter(step: Step, p: ProjectState): boolean {
  switch (step) {
    case "splash":
    case "orientation":
      return true;
    case "intro":
      return p.orientation !== null;
    case "clips":
      return p.orientation !== null && p.introId !== null;
    case "trim":
    case "transitions":
    case "music":
    case "review":
      return p.orientation !== null && p.introId !== null && p.clips.length > 0;
  }
}

export function nextStep(current: Step, p: ProjectState): Step {
  const i = STEPS.indexOf(current);
  for (let j = i + 1; j < STEPS.length; j++) {
    if (canEnter(STEPS[j], p)) return STEPS[j];
  }
  return current;
}

export function prevStep(current: Step): Step {
  const i = STEPS.indexOf(current);
  return i <= 0 ? current : STEPS[i - 1];
}
