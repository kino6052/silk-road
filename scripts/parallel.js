// Runs npm scripts concurrently; fails if any of them fails. Output is buffered per
// script so logs stay readable. Usage: node scripts/parallel.js lint typecheck coverage
import { spawn } from 'node:child_process';

const run = (script) =>
  new Promise((resolve) => {
    const started = process.hrtime.bigint();
    const child = spawn('npm', ['run', '--silent', script], { shell: false });
    let output = '';
    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (code) => {
      const seconds = Number(process.hrtime.bigint() - started) / 1e9;
      resolve({ script, code, output, seconds });
    });
  });

const results = await Promise.all(process.argv.slice(2).map(run));
for (const { script, code, output, seconds } of results) {
  const status = code === 0 ? 'ok  ' : 'FAIL';
  console.log(`[${status}] ${script} (${seconds.toFixed(1)}s)`);
  if (code !== 0) console.log(output);
}
process.exitCode = results.some((result) => result.code !== 0) ? 1 : 0;
