// src/core/watcher.ts
export interface SilentWatchConfig {
  backendUrl?: string;
  debug?: boolean;
  silentFailureTimeoutMs?: number; // default 700ms
}

interface UserEvent {
  eventInfo: any;
  timestamp: number;
  timerId?: number;
}

export class SilentWatch {
  private config: SilentWatchConfig;
  private networkCallDetected = false;
  private pendingEvents: UserEvent[] = [];

  constructor(config: SilentWatchConfig) {
    this.config = {
      silentFailureTimeoutMs: 700,
      ...config,
    };
    this.patchNetworkCalls();
  }

  private debugLog(...args: any[]) {
    if (this.config.debug) {
      console.log("[SilentWatch Debug]", ...args);
    }
  }

  /**
   * Patches fetch and XMLHttpRequest to detect if a network call was made
   */
  private patchNetworkCalls() {
    const self = this;

    // Patch fetch
    const originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function (
        this: typeof window,
        ...args: Parameters<typeof originalFetch>
      ): ReturnType<typeof originalFetch> {
        self.debugLog("Network call detected: fetch");
        self.networkCallDetected = true;
        return originalFetch.apply(this, args);
      };
    }

    // Patch XMLHttpRequest.open
    try {
      const originalXhrOpen = XMLHttpRequest.prototype.open;
      if (typeof originalXhrOpen === "function") {
        XMLHttpRequest.prototype.open = function (
          this: XMLHttpRequest,
          ...args: Parameters<typeof originalXhrOpen>
        ): ReturnType<typeof originalXhrOpen> {
          this.addEventListener("readystatechange", function () {
            if (this.readyState === 1) {
              self.debugLog("Network call detected: XHR open");
              self.networkCallDetected = true;
            }
          });
          return originalXhrOpen.apply(this, args);
        } as typeof originalXhrOpen;
      }
    } catch (err) {
      console.warn("[SilentWatch] Unable to patch XMLHttpRequest.open:", err);
    }
  }

  private sendLog(event: any) {
    this.debugLog("Sending log:", event);
    if (this.config.backendUrl) {
      fetch(this.config.backendUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event }),
      }).catch((err) =>
        console.error("[SilentWatch] Failed to send log:", err)
      );
    }
  }

  private processEvent(userEvent: UserEvent) {
    if (!this.networkCallDetected) {
      // No backend/network call after event => possible silent failure
      this.sendLog({ ...userEvent.eventInfo, silentFailure: true });
    } else {
      this.debugLog(
        "Network call detected, skipping silent failure log for:",
        userEvent.eventInfo
      );
    }
    // Reset for next event
    this.networkCallDetected = false;
  }

  public start() {
    const self = this;

    this.sendLog({
      type: "startup",
      message: "SilentWatch started from package",
      timestamp: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    });

    const queueEvent = (eventInfo: any) => {
      const timestamp = Date.now();
      self.networkCallDetected = false;

      // Clear pending timers
      if (self.pendingEvents.length > 0) {
        self.pendingEvents.forEach((e) => {
          if (e.timerId) clearTimeout(e.timerId);
        });
        self.pendingEvents = [];
      }

      const timerId = window.setTimeout(() => {
        self.processEvent({ eventInfo, timestamp });
        self.pendingEvents = self.pendingEvents.filter(
          (e) => e.timerId !== timerId
        );
      }, self.config.silentFailureTimeoutMs);

      self.pendingEvents.push({ eventInfo, timestamp, timerId });
    };

    /**
     * Monitor clicks only on actionable elements (button, link, etc.)
     */
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();

      // Track only buttons and links
      const actionableTags = ["button", "a"];
      if (!actionableTags.includes(tag)) {
        self.debugLog("Ignored click on non-actionable element:", tag);
        return;
      }

      // Skip disabled elements
      if ((target as HTMLButtonElement).disabled) {
        self.debugLog("Click on disabled element — marking as silent failure");
      }

      const eventInfo = {
        type: "click",
        tag: target.tagName,
        text: target.innerText?.trim() || null,
        id: target.id || null,
        className: target.className || null,
        timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      };

      self.debugLog("Actionable click detected:", eventInfo);
      queueEvent(eventInfo);
    });

    /**
     * Monitor form submissions
     */
    document.addEventListener("submit", (e) => {
      const form = e.target as HTMLFormElement;
      const eventInfo = {
        type: "form_submit",
        id: form.id || null,
        className: form.className || null,
        timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
      };

      self.debugLog("Form submit detected:", eventInfo);
      queueEvent(eventInfo);
    });
  }

  public log(message: any) {
    this.sendLog({
      type: "log",
      payload: message,
      timestamp: new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }),
    });
  }
}

export function createSilentWatch(config: SilentWatchConfig) {
  return new SilentWatch(config);
}
