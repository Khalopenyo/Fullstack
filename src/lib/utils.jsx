export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

export function uniq(arr) {
  return Array.from(new Set(arr));
}

export function plural(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return few;
  return many;
}
