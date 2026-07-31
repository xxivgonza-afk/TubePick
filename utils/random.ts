export function pickRandom<T>(values: readonly T[]): T {
  return values[Math.floor(Math.random() * values.length)];
}
