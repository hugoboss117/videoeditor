import type { WizardCtx } from "../wizard";
import { bigButton } from "../../ui/components";

export function renderSplash(view: HTMLElement, ctx: WizardCtx) {
  const img = document.createElement("img");
  img.src = "assets/branding/logo.png";
  img.alt = "Logo";
  img.onerror = () => { img.style.display = "none"; };
  const title = document.createElement("h1");
  title.textContent = document.title;
  const start = bigButton("Start", () => ctx.go("orientation"), { primary: true });
  view.append(img, title, start);
}
