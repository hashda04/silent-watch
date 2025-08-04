import { nowISO, uuid } from './utils';
import { scrub } from './scrubber';
import { ProbabilisticSampler } from './sampler';
import { RateLimiter } from './rateLimiter';
import { enqueueEvent, drainQueue } from './queue';

export interface SilentWatchConfig {
  logEndpoint: string;
  expectedSelectors?: string[];
  heartbeatIntervalMs?: number;
  noFollowupDelayMs?: number;
  sessionKey?: string;
  samplingRate?: number; // 0..1
  maxEventsPerMinute?: number;
}

export function createSilentWatch(rawConfig: Partial<SilentWatchConfig>) {
  const config: Required<SilentWatchConfig> = {
    logEndpoint: rawConfig.logEndpoint || '/monitor/logs',
    expectedSelectors: rawConfig.expectedSelectors || [],
    heartbeatIntervalMs: rawConfig.heartbeatIntervalMs ?? 30000,
    noFollowupDelayMs: rawConfig.noFollowupDelayMs ?? 3000,
    sessionKey: rawConfig.sessionKey || 'sw_session',
    samplingRate: rawConfig.samplingRate ?? 1,
    maxEventsPerMinute: rawConfig.maxEventsPerMinute ?? 500,
  };

  let sessionId = localStorage.getItem(config.sessionKey);
  if (!sessionId) {
    sessionId = uuid();
    localStorage.setItem(config.sessionKey, sessionId);
  }

  const sampler = new ProbabilisticSampler(config.samplingRate);
  const rateLimiter = new RateLimiter(config.maxEventsPerMinute, 60000);

  const enqueue = async (event: any) => {
    if (!sampler.shouldSample()) return;
    if (!rateLimiter.allow()) return;

    const base = {
      sessionId,
      page: location.href,
      timestamp: nowISO(),
      event: scrub(event),
    };

    try {
      await fetch(config.logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: [base], page: location.href, timestamp: nowISO() }),
        keepalive: true,
      });
    } catch (e) {
      await enqueueEvent(base);
    }
  };

  // Offline queue draining
  setInterval(() => {
    drainQueue(async (events) => {
      await fetch(config.logEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events, page: location.href, timestamp: nowISO() }),
        keepalive: true,
      });
    });
  }, 10000);

  // console_error
  const originalConsoleError = console.error;
  console.error = function (...args: any[]) {
    enqueue({
      type: 'console_error',
      message: args.map(String).join(' '),
    });
    originalConsoleError.apply(console, args);
  };

  // unhandled promise
  window.addEventListener('unhandledrejection', (e: any) => {
    enqueue({
      type: 'unhandled_promise_rejection',
      reason: e.reason,
    });
  });

  // button click no follow-up
  document.addEventListener('click', (e: any) => {
    const btn = e.target.closest('button, [data-watch-button]');
    if (!btn) return;
    const btnText = (btn.innerText || btn.name || 'unknown').trim();
    let resolved = false;
    const originalFetch = window.fetch;

    window.fetch = function (...args: any[]) {
      resolved = true;
      window.fetch = originalFetch;
      return originalFetch.apply(this, args);
    };

    setTimeout(() => {
      if (!resolved) {
        enqueue({
          type: 'button_click_no_followup',
          text: btnText,
          note: 'No network activity shortly after click',
        });
      }
      window.fetch = originalFetch;
    }, config.noFollowupDelayMs);
  });

  // heartbeat + missing selector
  setInterval(() => {
    enqueue({ type: 'heartbeat', viewport: { w: innerWidth, h: innerHeight }, userAgent: navigator.userAgent });
    config.expectedSelectors.forEach((sel) => {
      if (!document.querySelector(sel)) {
        enqueue({
          type: 'missing_dom_element',
          selector: sel,
          note: 'Expected element not found',
        });
      }
    });
  }, config.heartbeatIntervalMs);

  return {
    log: (type: string, data: Record<string, any> = {}) => enqueue({ type, ...data }),
    getSessionId: () => sessionId,
    flush: async () => {
      await drainQueue(async (events) => {
        await fetch(config.logEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ events, page: location.href, timestamp: nowISO() }),
          keepalive: true,
        });
      });
    },
  };
}
