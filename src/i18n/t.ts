export type Catalog = Readonly<Record<string, string>>;
export type Params = Readonly<Record<string, string | number>>;

/**
 * Returns `t(key, params)`. Unknown keys fall back to the key itself and unknown
 * placeholders stay visible, so gaps show up in the UI instead of crashing it.
 */
export function createTranslator(catalog: Catalog): (key: string, params?: Params) => string {
  return (key, params = {}) =>
    (catalog[key] ?? key).replace(/\{(\w+)\}/g, (placeholder, name: string) =>
      name in params ? String(params[name]) : placeholder,
    );
}
