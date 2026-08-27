"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Registers the service worker and surfaces a custom "Install app" button when the browser
 * fires beforeinstallprompt. Hidden once installed or when already running standalone.
 */
export function PWARegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (standalone) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDeferred(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred || dismissed) return null;

  return (
    <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border border-white/10 bg-ink-800/95 px-4 py-3 shadow-2xl backdrop-blur">
      <div className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-brand-400 to-purple-500 text-sm font-bold">
        ▲
      </div>
      <div className="text-sm">
        <div className="font-semibold">Install Clipwave</div>
        <div className="text-xs text-slate-400">Run it like a native app, offline-ready.</div>
      </div>
      <button
        className="btn-primary py-1.5 text-xs"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          setDeferred(null);
        }}
      >
        Install
      </button>
      <button className="px-1 text-slate-500 hover:text-slate-300" onClick={() => setDismissed(true)} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
}
