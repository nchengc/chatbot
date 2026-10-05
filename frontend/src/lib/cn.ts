/**
 * Tailwind-friendly className combinator. Conditional classes without
 * pulling in `clsx` (the API mirrors a tiny subset of it).
 */
export type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, boolean | null | undefined>
  | ClassValue[];

export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  for (const v of values) {
    if (!v) continue;
    if (typeof v === "string" || typeof v === "number") {
      out.push(String(v));
    } else if (Array.isArray(v)) {
      const inner = cn(...v);
      if (inner) out.push(inner);
    } else if (typeof v === "object") {
      for (const [key, val] of Object.entries(v)) {
        if (val) out.push(key);
      }
    }
  }
  return out.join(" ");
}