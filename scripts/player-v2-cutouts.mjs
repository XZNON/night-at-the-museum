// Sequential DreamLayer background removal for the approved game-wide
// heroine poses. Never imports into browser code.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = 'asset-sources';
const poses = {
  idle: 'player-a-v1', 'walk-a': 'player-a-walk-a-v1', 'walk-b': 'player-a-walk-b-v2', jump: 'player-a-jump-v1',
};
await mkdir(`${root}/production/player-v2`, { recursive: true });
async function cli(args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/dreamlayer.mjs', ...args, '--json', '--quiet']);
    let out = '', err = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });
    child.on('error', () => reject(new Error('CLI failed to start.')));
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`CLI exited ${code}: ${out || err}`));
      try { resolve(JSON.parse(out.slice(out.indexOf('{')))); } catch { reject(new Error('CLI output was not JSON.')); }
    });
  });
}
const capabilities = await cli(['capabilities']);
const initial = await cli(['balance-current']);
if (capabilities.key_mode !== 'live' || capabilities.live_charge_credits_per_image !== 1 || initial.available < 24)
  throw new Error('Expected live access, one-credit pricing and the request plus a 20-credit reserve.');
const manifestPath = `${root}/manifest.json`;
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const [pose, reference] of Object.entries(poses)) {
  const id = `player-v2.${pose}.cutout`;
  if (manifest.assets.some(asset => asset.id === id)) { console.log(`${id}: already recorded; skipping.`); continue; }
  const inputPath = `${root}/references/sketch/${reference}.png`;
  const sourcePath = `${root}/production/player-v2/${pose}-cutout.png`;
  try { await access(sourcePath); throw new Error(`${sourcePath}: unrecorded output exists; inspect first.`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const before = await cli(['balance-current']);
  const entry = { id, status: 'planned', world: 'shared', purpose: `Game-wide heroine ${pose} pose cutout`,
    referenceIds: [`sketch.${reference.replace(/-(v\d+)$/, '.reference-$1')}`], operation: 'background_remove',
    inputPath, sourcePath, runtimePath: null, promptPath: null, provider: 'DreamLayer',
    idempotencyKey: `last-curator-player-v2-${pose}-cutout-v1`, generatedAt: null, executionId: null,
    creditsSpent: null, balanceBefore: before.available, balanceAfter: null, pixelSize: null,
    preparationNotes: 'Cutout of the approved heroine pose; registered locally before runtime use.', approved: false };
  manifest.assets.push(entry);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${id}: submitting one background removal, quoted 1 credit.`);
  const outcome = await cli(['cutout', inputPath, '--out', sourcePath, '--idempotency-key', entry.idempotencyKey]);
  entry.executionId = outcome.execution_id;
  entry.outputAssetId = outcome.asset?.asset_id ?? null;
  entry.status = outcome.status === 'completed' ? 'generated' : 'planned';
  entry.generatedAt = new Date().toISOString();
  const bytes = await readFile(sourcePath);
  entry.pixelSize = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  entry.sourceSha256 = createHash('sha256').update(bytes).digest('hex');
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const after = await cli(['balance-current']);
  entry.balanceAfter = after.available;
  entry.creditsSpent = before.available - after.available;
  entry.creditEvidence = 'Sequential API available-balance delta; one active local job.';
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${id}: ${entry.executionId}; observed ${entry.creditsSpent} credit(s); remaining ${after.available}.`);
}
