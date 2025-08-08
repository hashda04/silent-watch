// src/core/watcher.ts

export interface SilentWatchConfig {
  workflows?: string[];
  debug?: boolean;
  backendUrl?: string; // NEW
}

export class SilentWatch {
  private config: SilentWatchConfig;
  private observer: MutationObserver | null = null;

  constructor(config: SilentWatchConfig = {}) {
    this.config = {
      workflows: ['login', 'contact', 'checkout'],
      debug: false,
      backendUrl: '', // NEW
      ...config,
    };
  }

  public init(): void {
    if (this.config.debug) {
      console.log('[SilentWatch] Initializing with config:', this.config);
    }

    this.observeDOM();
  }

  private observeDOM(): void {
    const config = { childList: true, subtree: true };
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (this.config.debug) {
          console.log('[SilentWatch] DOM mutation observed:', mutation);
        }

        // ✅ Log to backend if URL is set
        if (this.config.backendUrl) {
          this.sendToBackend({
            type: 'dom_mutation',
            detail: mutation,
            timestamp: new Date().toISOString(),
          });
        }
      });
    });

    this.observer.observe(document.body, config);
  }

  private async sendToBackend(payload: any) {
    try {
      await fetch(this.config.backendUrl!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: payload }),
      });

      if (this.config.debug) {
        console.log('[SilentWatch] Log sent to backend:', payload);
      }
    } catch (err) {
      if (this.config.debug) {
        console.warn('[SilentWatch] Failed to send log to backend:', err);
      }
    }
  }

  public start(): void {
    this.init();
  }

  public stop(): void {
    this.observer?.disconnect();
    if (this.config.debug) {
      console.log('[SilentWatch] Stopped observing.');
    }
  }

  public log(message: any): void {
    if (this.config.debug) {
      console.log('[SilentWatch]', message);
    }
  }
}

export function initSilentWatch(config?: SilentWatchConfig): SilentWatch {
  const instance = new SilentWatch(config);
  instance.init();
  return instance;
}

export function createSilentWatch(config?: SilentWatchConfig): SilentWatch {
  return new SilentWatch(config);
}

if (typeof window !== 'undefined') {
  (window as any).SilentWatch = {
    init: initSilentWatch,
    SilentWatch,
  };
}
