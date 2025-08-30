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
  private pendingEvents: UserEvent[] = [];
  private networkCallDetected = false;
  private originalFetch: typeof window.fetch | null = null;

  constructor(config: SilentWatchConfig) {
    this.config = {
      silentFailureTimeoutMs: 700,
      ...config,
    };

    // store original fetch once
    this.originalFetch = window.fetch.bind(window);
    this.patchNetworkCalls();
  }

  private debugLog(...args: any[]) {
    if (this.config.debug) {
      console.log("[SilentWatch Debug]", ...args);
    }
  }

  // Called when ANY network attempt happens (success, fail, CORS, 404 etc.)
  private markLatestEventSatisfied(url: string, status: number | string) {
    this.debugLog("Network call detected:", url, "status:", status);
    this.networkCallDetected = true;
  }

  private patchNetworkCalls() {
    const self = this;

    // --- Patch fetch ---
    if (this.originalFetch) {
      window.fetch = function (
        this: typeof window,
        ...args: Parameters<typeof window.fetch>
      ): ReturnType<typeof window.fetch> {
        const url = args[0] instanceof Request ? args[0].url : String(args[0]);

        // Ignore SilentWatch’s own logs
        if (self.config.backendUrl && url.includes(self.config.backendUrl)) {
          return self.originalFetch!(...args);
        }

        return self.originalFetch!(...args)
          .then((response) => {
            self.markLatestEventSatisfied(url, response.status);
            return response;
          })
          .catch((err) => {
            self.markLatestEventSatisfied(url, "FETCH_ERROR");
            throw err;
          });
      };
    }

    // --- Patch XMLHttpRequest ---
    const originalXhrOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (
      this: XMLHttpRequest,
      ...args: Parameters<typeof originalXhrOpen>
    ): ReturnType<typeof originalXhrOpen> {
      const url = String(args[1]);

      if (self.config.backendUrl && url.includes(self.config.backendUrl)) {
        return originalXhrOpen.apply(this, args);
      }

      this.addEventListener("loadend", function () {
        self.markLatestEventSatisfied(url, this.status);
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
        "Network activity detected, skipping silent failure log for:",
        userEvent.eventInfo
      );
    }
    this.networkCallDetected = false;
  }

  public start() {
    const self = this;

    this.sendLog({
      type: "startup",
      message: "SilentWatch started",
      timestamp: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    });

    const queueEvent = (eventInfo: any) => {
      const timestamp = Date.now();
      self.networkCallDetected = false;

      // clear previous pending events
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
        self.debugLog("Click on disabled element — may be a silent failure");
      }

      const eventInfo = {
        type: "click",
        tag: target.tagName,
        text: target.innerText?.trim() || null,
        id: target.id || null,
        className: target.className || null,
        timestamp: new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
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
        timestamp: new Date().toLocaleString("en-IN", {
          timeZone: "Asia/Kolkata",
        }),
      };

      self.debugLog("Form submit detected:", eventInfo);
      queueEvent(eventInfo);
    });
  }

  public log(message: any) {
    this.sendLog({
      type: "log",
      payload: message,
      timestamp: new Date().toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
      }),
    });
  }
}

export function createSilentWatch(config: SilentWatchConfig) {
  return new SilentWatch(config);
}
