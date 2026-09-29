// Entry point: wires the pipeline to the real file system. Run with `npm run data`.
import { readFileSync, writeFileSync } from 'node:fs';
import { runPipeline } from './build.ts';

runPipeline({
  readText: (path) => readFileSync(path, 'utf8'),
  readBytes: (path) => readFileSync(path),
  writeText: (path, text) => {
    writeFileSync(path, text);
  },
});
console.log('Generated content is up to date.');
