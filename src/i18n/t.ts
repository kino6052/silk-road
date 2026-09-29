export type Catalog = Readonly<Record<string, string>>;
export type Params = Readonly<Record<string, string | number>>;

export function createTranslator(_catalog: Catalog): (key: string, params?: Params) => string {
  throw new Error('not implemented');
}
