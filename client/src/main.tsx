import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

createRoot(document.getElementById("root")!).render(<App />);

const disableSwValue = String(import.meta.env.VITE_DISABLE_SW || "");
const disableSw =
  disableSwValue === "1" || disableSwValue.toLowerCase() === "true";
const shouldRegisterSW = !import.meta.env.DEV && !disableSw;

if ("serviceWorker" in navigator) {
  if (!shouldRegisterSW) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      registrations.forEach((registration) => registration.unregister());
    }).catch((error) => {
      console.warn("[SW] Failed to unregister service workers:", error);
    });
  } else {
    const updateSW = registerSW({
      onNeedRefresh() {
        const ok = window.confirm("更新があります。再読み込みしますか？");
        if (ok) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        // No-op: keep UX minimal
      },
    });
  }
}
