/** Returns a looked-up value that valid content guarantees, or fails loudly. */
export function required<T>(value: T | undefined, what: string): T {
  if (value === undefined) throw new Error(`missing ${what}`);
  return value;
}
