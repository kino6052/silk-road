export interface PipelineIo {
  readText(path: string): string;
  readBytes(path: string): Uint8Array;
  writeText(path: string, text: string): void;
}
export function runPipeline(_io: PipelineIo): void {
  throw new Error('not implemented');
}
