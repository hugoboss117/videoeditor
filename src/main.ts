import "./styles/app.css";
import { loadTheme, applyTheme } from "./theme";

async function boot() {
  applyTheme(await loadTheme());
  const app = document.querySelector<HTMLDivElement>("#app")!;
  app.textContent = document.title; // placeholder until the wizard is wired in (Task 8)
}
boot();
