/** Decodes `value.count,value.count,…` (base 36) into `size` cells. */
export function decodeRuns(text: string, size: number): Uint8Array {
  const cells = new Uint8Array(size);
  let offset = 0;
  for (const run of text === '' ? [] : text.split(',')) {
    const [value = '0', count = '0'] = run.split('.');
    const length = parseInt(count, 36);
    cells.fill(parseInt(value, 36), offset, offset + length);
    offset += length;
  }
  if (offset !== size)
    throw new Error(`run-length size mismatch: ${String(offset)} ≠ ${String(size)}`);
  return cells;
}
