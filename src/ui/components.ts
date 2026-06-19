export function bigButton(label: string, onClick: () => void, opts: { primary?: boolean } = {}) {
  const b = document.createElement("button");
  b.textContent = label;
  b.className = "big-btn" + (opts.primary ? " primary" : "");
  b.addEventListener("click", onClick);
  return b;
}

export function header(title: string, subtitle?: string) {
  const h = document.createElement("div");
  h.className = "step-header";
  const t = document.createElement("h1");
  t.textContent = title;
  h.appendChild(t);
  if (subtitle) {
    const s = document.createElement("p");
    s.textContent = subtitle;
    h.appendChild(s);
  }
  return h;
}

export function navBar(onBack: (() => void) | null, onNext: (() => void) | null, nextLabel = "Next") {
  const nav = document.createElement("div");
  nav.className = "nav-bar";
  if (onBack) nav.appendChild(bigButton("Back", onBack));
  else nav.appendChild(document.createElement("span"));
  if (onNext) nav.appendChild(bigButton(nextLabel, onNext, { primary: true }));
  return nav;
}
