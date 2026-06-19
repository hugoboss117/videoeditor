import type { WizardCtx } from "../wizard";
import { header, navBar } from "../../ui/components";
import { reorderClip, trimClip } from "../../state/projectStore";

function fmt(s: number) {
  const m = Math.floor(s / 60), sec = (s % 60).toFixed(1);
  return `${m}:${sec.padStart(4, "0")}`;
}

export function renderTrim(view: HTMLElement, ctx: WizardCtx) {
  view.appendChild(header("Arrange & trim", "Reorder clips and set start/end. Or leave as-is."));
  const body = document.createElement("div");
  body.className = "step-body";

  ctx.project.clips.forEach((c, idx) => {
    const card = document.createElement("div");
    card.className = "trim-card";

    const top = document.createElement("div");
    top.className = "row";
    const name = document.createElement("span");
    name.className = "name"; name.textContent = `${idx + 1}. ${c.name}`;
    const move = document.createElement("span");
    move.className = "move";
    const up = document.createElement("button"); up.textContent = "↑";
    up.disabled = idx === 0;
    up.addEventListener("click", () => ctx.update((p) => reorderClip(p, idx, idx - 1)));
    const down = document.createElement("button"); down.textContent = "↓";
    down.disabled = idx === ctx.project.clips.length - 1;
    down.addEventListener("click", () => ctx.update((p) => reorderClip(p, idx, idx + 1)));
    move.append(up, down);
    top.append(name, move);

    const times = document.createElement("div");
    times.className = "trim-times";
    // Local live values for the readout only; the authoritative trim is committed
    // to the store (via trimClip) on the slider "change" event — never mutate the
    // project state object directly here.
    let liveIn = c.trimInSec;
    let liveOut = c.trimOutSec;
    const render = () => { times.textContent = `In ${fmt(liveIn)}  →  Out ${fmt(liveOut)}`; };
    render();

    const start = document.createElement("input");
    start.type = "range"; start.min = "0"; start.max = String(c.durationSec); start.step = "0.1";
    start.value = String(c.trimInSec);
    const end = document.createElement("input");
    end.type = "range"; end.min = "0"; end.max = String(c.durationSec); end.step = "0.1";
    end.value = String(c.trimOutSec);
    const commit = () => ctx.update((p) =>
      trimClip(p, c.id, parseFloat(start.value), parseFloat(end.value)));
    start.addEventListener("input", () => { liveIn = parseFloat(start.value); render(); });
    end.addEventListener("input", () => { liveOut = parseFloat(end.value); render(); });
    start.addEventListener("change", commit);
    end.addEventListener("change", commit);

    card.append(top, times, start, end);
    body.appendChild(card);
  });

  view.appendChild(body);
  view.appendChild(navBar(() => ctx.back(), () => ctx.next()));
}
