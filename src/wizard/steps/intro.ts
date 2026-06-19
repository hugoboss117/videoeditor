import type { WizardCtx } from "../wizard";
import { header, navBar } from "../../ui/components";
import { fetchIntroManifest, introsFor } from "../../data/manifest";
import { selectIntro } from "../../state/projectStore";
import type { IntroOption } from "../../types";

export async function renderIntro(view: HTMLElement, ctx: WizardCtx) {
  view.appendChild(header("Pick an intro", "Tap a card to preview, tap again to choose."));
  const list = document.createElement("div");
  list.className = "intro-list";
  view.appendChild(list);
  view.appendChild(navBar(() => ctx.back(),
    ctx.project.introId ? () => ctx.next() : null));

  const manifest = await fetchIntroManifest();
  const intros = introsFor(manifest, ctx.project.orientation!);
  for (const intro of intros) list.appendChild(card(intro, ctx));
}

function card(intro: IntroOption, ctx: WizardCtx) {
  const el = document.createElement("div");
  el.className = "intro-card" + (ctx.project.introId === intro.id ? " selected" : "");
  const thumb = document.createElement("img");
  thumb.src = intro.thumbnail;
  thumb.alt = intro.label;
  const label = document.createElement("div");
  label.className = "label";
  label.textContent = intro.label;
  el.append(thumb, label);
  let previewing = false;
  el.addEventListener("click", () => {
    if (!previewing) {
      previewing = true;
      const v = document.createElement("video");
      v.src = intro.file; v.controls = true; v.autoplay = true; v.playsInline = true;
      el.replaceChild(v, thumb);
    } else {
      ctx.update((p) => selectIntro(p, intro.id));
    }
  });
  return el;
}
