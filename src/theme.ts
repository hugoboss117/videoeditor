export interface Theme {
  appName: string; bg: string; fg: string; silver: string; accent: string;
}

const FALLBACK: Theme = {
  appName: "Promo Editor", bg: "#0a0a0a", fg: "#ffffff",
  silver: "#c0c0c0", accent: "#ff7a00",
};

export async function loadTheme(base = "assets/"): Promise<Theme> {
  try {
    const res = await fetch(`${base}branding/theme.json`);
    return { ...FALLBACK, ...(await res.json()) };
  } catch {
    return FALLBACK;
  }
}

export function applyTheme(t: Theme): void {
  const r = document.documentElement.style;
  r.setProperty("--bg", t.bg);
  r.setProperty("--fg", t.fg);
  r.setProperty("--silver", t.silver);
  r.setProperty("--accent", t.accent);
  document.title = t.appName;
}
