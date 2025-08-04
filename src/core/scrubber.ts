const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z]{2,}\b/gi;
const ccRegex = /\b(?:\d[ -]*?){13,16}\b/g;

export function scrub(obj: any): any {
  try {
    const copy = JSON.parse(JSON.stringify(obj));
    const iter = (v: any): any => {
      if (typeof v === 'string') {
        return v.replace(emailRegex, '[REDACTED_EMAIL]').replace(ccRegex, '[REDACTED_CC]');
      } else if (Array.isArray(v)) {
        return v.map(iter);
      } else if (v && typeof v === 'object') {
        for (const k of Object.keys(v)) {
          v[k] = iter(v[k]);
        }
        return v;
      }
      return v;
    };
    return iter(copy);
  } catch {
    return obj;
  }
}
