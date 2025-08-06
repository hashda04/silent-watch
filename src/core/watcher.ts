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

  public stop(): void {
    this.observer?.disconnect();
    if (this.config.debug) {
      console.log('[SilentWatch] Stopped observing.');
    }
  }
}

export function initSilentWatch(config?: SilentWatchConfig): SilentWatch {
  const instance = new SilentWatch(config);
  instance.init();
  return instance;
}

// ✅ Optional utility
export function createSilentWatch(config?: SilentWatchConfig): SilentWatch {
  return new SilentWatch(config);
}

// UMD global (for <script> usage)
if (typeof window !== 'undefined') {
  (window as any).SilentWatch = {
    init: initSilentWatch,
    SilentWatch,
  };
}
