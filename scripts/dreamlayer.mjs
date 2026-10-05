// Development-only CLI bridge. Secrets stay in this process and its child.
import { spawn } from 'node:child_process';
import { loadEnvFile } from 'node:process';

try { loadEnvFile('.env'); } catch (error) {
  if (error.code !== 'ENOENT') throw new Error('Unable to load local credentials.');
}
const key = process.env.DREAMLAYER_API_KEY || process.env.DREAM_LAYER_API_KEY;
if (!key) throw new Error('Local DreamLayer credential is missing.');
if (process.argv[2] === 'balance-current') {
  const { ManagedClient } = await import('../node_modules/dreamlayer/dist/client.js');
  try {
    const api = new ManagedClient(key, 'https://api.dreamlayer.io');
    process.stdout.write(JSON.stringify(await api.request('/v1/balance?pricing=current'), null, 2) + '\n');
  } catch { process.stderr.write('Current pricing balance check failed.\n'); process.exitCode = 1; }
} else {
const child = spawn(process.execPath, ['node_modules/dreamlayer/dist/cli.js', ...process.argv.slice(2)], {
  env: { ...process.env, DREAMLAYER_API_KEY: key },
  stdio: ['inherit', 'pipe', 'pipe'],
});
// Redact before emitting; buffer whole streams so split chunks cannot expose a key.
let stdout = '', stderr = '';
child.stdout.on('data', chunk => { stdout += chunk; });
child.stderr.on('data', chunk => { stderr += chunk; });
child.on('error', () => { process.stderr.write('DreamLayer CLI could not start.\n'); process.exitCode = 1; });
child.on('close', code => {
  process.stdout.write(stdout.split(key).join('[REDACTED]'));
  process.stderr.write(stderr.split(key).join('[REDACTED]'));
  process.exitCode = code ?? 1;
});
}
