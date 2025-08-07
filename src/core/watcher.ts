// src/core/watcher.ts

export interface SilentWatchConfig {
  workflows?: string[];
  debug?: boolean;
  onDetect?: (failureInfo: any) => void;
}

export class SilentWatch {
  private config: SilentWatchConfig;
  private observer: MutationObserver | null = null;

  constructor(config: SilentWatchConfig = {}) {
    this.config = {
      workflows: ['login', 'contact', 'checkout'],
      debug: false,
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
      });
    });

    this.observer.observe(document.body, config);
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

// Utility functions
export function initSilentWatch(config?: SilentWatchConfig): SilentWatch {
  const instance = new SilentWatch(config);
  instance.init();
  return instance;
}

export function createSilentWatch(config?: SilentWatchConfig): SilentWatch {
  return new SilentWatch(config);
}

// For use in <script> tags in plain HTML
if (typeof window !== 'undefined') {
  (window as any).SilentWatch = {
    init: initSilentWatch,
    SilentWatch,
  };
}
