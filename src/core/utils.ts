export function nowISO(): string {
  return new Date().toISOString();
}

export function uuid(): string {
  // Fallback UUID v4 generator if crypto.randomUUID is not available
  if (typeof crypto?.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Custom UUID v4 fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
