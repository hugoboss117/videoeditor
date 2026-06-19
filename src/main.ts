import "./styles/app.css";
import { loadTheme, applyTheme } from "./theme";
import { startWizard } from "./wizard/wizard";

async function boot() {
  applyTheme(await loadTheme());
  const app = document.querySelector<HTMLDivElement>("#app")!;
  startWizard(app);
}
boot();
