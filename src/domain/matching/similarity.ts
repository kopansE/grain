/**
 * String similarity primitives. Jaro-Winkler for short strings such as
 * names; token-set ratio for word-order and extra-word tolerance
 * ("Maria Garcia Lopez" vs "Maria Garcia", "Chen Sarah" vs "Sarah J. Chen").
 */

export function jaro(a: string, b: string): number {
  if (a === b) return 1;
  const la = a.length;
  const lb = b.length;
  if (la === 0 || lb === 0) return 0;
  const matchWindow = Math.max(0, Math.floor(Math.max(la, lb) / 2) - 1);
  const aMatched = new Array<boolean>(la).fill(false);
  const bMatched = new Array<boolean>(lb).fill(false);
  let matches = 0;
  for (let i = 0; i < la; i++) {
    const lo = Math.max(0, i - matchWindow);
    const hi = Math.min(lb - 1, i + matchWindow);
    for (let j = lo; j <= hi; j++) {
      if (bMatched[j] || a[i] !== b[j]) continue;
      aMatched[i] = true;
      bMatched[j] = true;
      matches++;
      break;
    }
  }
  if (matches === 0) return 0;
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < la; i++) {
    if (!aMatched[i]) continue;
    while (!bMatched[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;
  return (matches / la + matches / lb + (matches - transpositions) / matches) / 3;
}

export function jaroWinkler(a: string, b: string, prefixScale = 0.1): number {
  const j = jaro(a, b);
  let prefix = 0;
  for (let i = 0; i < Math.min(4, a.length, b.length); i++) {
    if (a[i] === b[i]) prefix++;
    else break;
  }
  return j + prefix * prefixScale * (1 - j);
}

/**
 * Token-set similarity on whitespace-separated tokens.
 * - One side is a token subset of the other with two or more shared tokens
 *   ("maria garcia lopez" vs "maria garcia", "chen sarah" vs "sarah chen"): 1.
 * - A single shared token against a longer name ("chen" vs "sarah chen"): 0.8 cap.
 * - Both sides have leftover tokens: Jaro on the sorted token strings with the
 *   Winkler prefix bonus disabled, so a shared surname cannot inflate two
 *   different first names ("levi david" vs "levi daniel").
 */
export function tokenSetRatio(a: string, b: string): number {
  const ta = new Set(a.split(/\s+/).filter(Boolean));
  const tb = new Set(b.split(/\s+/).filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  const inter = [...ta].filter((t) => tb.has(t)).sort();
  const restA = [...ta].filter((t) => !tb.has(t)).sort();
  const restB = [...tb].filter((t) => !ta.has(t)).sort();
  const t1 = [...inter, ...restA].join(' ').trim();
  const t2 = [...inter, ...restB].join(' ').trim();
  if (inter.length === 0) return jaroWinkler(t1, t2, 0);
  if (restA.length === 0 || restB.length === 0) {
    if (inter.length >= 2) return 1;
    return Math.min(0.8, jaroWinkler(t1, t2));
  }
  return jaroWinkler(t1, t2, 0);
}

/** Symmetric best-of similarity for company strings that are already normalized. */
export function companySimilarity(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  // One contains the other as a whole token sequence: "adyen" vs "adyen payments".
  if (a.includes(b) || b.includes(a)) return 0.9;
  return Math.max(jaroWinkler(a, b), tokenSetRatio(a, b));
}
