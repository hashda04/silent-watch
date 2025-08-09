// src/core/watcher.ts
export class SilentWatch {
  private config: { backendUrl?: string; debug?: boolean };

  constructor(config: { backendUrl?: string; debug?: boolean }) {
    this.config = config;
  }

  private sendLog(event: any) {
    if (this.config.debug) {
      console.log("[SilentWatch Debug] Sending log:", event);
    }
    if (this.config.backendUrl) {
      fetch(this.config.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      }).catch((err) => console.error("[SilentWatch] Failed to send log:", err));
    }
  }

  public start() {
    // Startup log
    this.sendLog({ type: "startup", message: "SilentWatch started from package" });

    // Log all clicks
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const info = {
        type: "click",
        tag: target.tagName,
        text: target.innerText?.trim() || null,
        id: target.id || null,
        className: target.className || null,
        timestamp: new Date().toISOString(),
      };
      this.sendLog(info);
    });

    // Log all form submissions
    document.addEventListener("submit", (e) => {
      const form = e.target as HTMLFormElement;
      const info = {
        type: "form_submit",
        id: form.id || null,
        className: form.className || null,
        timestamp: new Date().toISOString(),
      };
      this.sendLog(info);
    });

    // Optional: detect DOM changes
    const observer = new MutationObserver(() => {
      this.sendLog({ type: "dom_mutation", timestamp: new Date().toISOString() });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  public log(message: any) {
    this.sendLog({ type: "log", payload: message, timestamp: new Date().toISOString() });
  }
}

export function createSilentWatch(config: { backendUrl?: string; debug?: boolean }) {
  return new SilentWatch(config);
}
