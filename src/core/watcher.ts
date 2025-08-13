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

  private patchNetworkCalls() {
    const self = this;

    // Patch fetch
    const originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function (
        this: typeof window,
        ...args: Parameters<typeof originalFetch>
      ): ReturnType<typeof originalFetch> {
        const url = args[0] instanceof Request ? args[0].url : String(args[0]);
        if (self.config.backendUrl && url.includes(self.config.backendUrl)) {
          return originalFetch.apply(this, args); // ignore own logs
        }
        return originalFetch.apply(this, args).then((response) => {
          if (response.ok) {
            self.debugLog("Network call detected (success): fetch", url);
            self.networkCallDetected = true;
          } else {
            self.debugLog("Ignored network error:", response.status, url);
          }
          return response;
        }).catch((err) => {
          self.debugLog("Fetch error ignored:", err);
          throw err; // preserve original behavior
        });
      };
    }

    // Patch XMLHttpRequest
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      ...args: Parameters<typeof originalXhrOpen>
    ): ReturnType<typeof originalXhrOpen> {
      const url = String(args[1]);
      if (self.config.backendUrl && url.includes(self.config.backendUrl)) {
        return originalXhrOpen.apply(this, args); // ignore own logs
      }
      this.addEventListener("load", function () {
        if (this.status >= 200 && this.status < 300) {
          self.debugLog("Network call detected (success): XHR", url);
          self.networkCallDetected = true;
        } else {
          self.debugLog("Ignored XHR error:", this.status, url);
        }
      });
      return originalXhrOpen.apply(this, args);
    } as typeof originalXhrOpen;
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
      this.sendLog({ ...userEvent.eventInfo, silentFailure: true });
    } else {
      this.debugLog(
        "Network call detected, skipping silent failure log for:",
        userEvent.eventInfo
      );
    }
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

    // Monitor actionable clicks
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();

      const actionableTags = ["button", "a"];
      if (!actionableTags.includes(tag)) {
        self.debugLog("Ignored click on non-actionable element:", tag);
        return;
      }

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

    // Monitor form submissions
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
