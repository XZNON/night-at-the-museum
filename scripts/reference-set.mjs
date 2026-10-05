// Small, sequential DreamLayer reference batch. Never imports into browser code.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = 'asset-sources';
await mkdir(`${root}/references`, { recursive: true });
async function cli(args) {
  return await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/dreamlayer.mjs', ...args, '--json', '--quiet']);
    let out = '', err = '';
    child.stdout.on('data', chunk => { out += chunk; });
    child.stderr.on('data', chunk => { err += chunk; });
    child.on('error', () => reject(new Error('CLI failed to start.')));
    child.on('close', code => {
      if (code !== 0) return reject(new Error(`CLI exited ${code}: ${out || err}`));
      try { resolve(JSON.parse(out)); } catch { reject(new Error('CLI output was not JSON.')); }
    });
  });
}
const capabilities = await cli(['capabilities']);
const initial = await cli(['balance-current']);
if (capabilities.key_mode !== 'live' || capabilities.live_charge_credits_per_image !== 1 || initial.available < 23)
  throw new Error('Expected live image access, one-credit pricing and at least 23 available credits.');
const manifestPath = `${root}/manifest.json`;
let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); } catch (error) {
  if (error.code !== 'ENOENT') throw error;
  manifest = { schemaVersion: 1, provider: 'DreamLayer', checkedAt: new Date().toISOString(),
    capabilities, balanceBeforeReferences: initial, reserveCredits: 20,
    pricingSources: ['https://docs.dreamlayer.io/pricing', 'https://docs.dreamlayer.io/cli'],
    assets: [] };
}
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
for (const [name, world, aspect] of [
  ['masterpiece', 'masterpiece', '16:9'], ['banquet', 'royal-supper', '16:9'], ['player', 'shared', '3:4'],
]) {
  const id = `${name}.reference`;
  let entry = manifest.assets.find(asset => asset.id === id);
  if (entry && ['generated', 'approved', 'prepared', 'integrated', 'rejected'].includes(entry.status)) {
    console.log(`${id}: completed reference already recorded; skipping.`); continue;
  }
  if (entry) throw new Error(`${id}: interrupted request; recover its saved identity before resubmitting.`);
  const sourcePath = `${root}/references/${name}.png`;
  try { await access(sourcePath); throw new Error('Unrecorded output exists; inspect before generating.'); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  const promptPath = `${root}/prompts/${name}-reference.txt`;
  const prompt = (await readFile(promptPath, 'utf8')).trim();
  const before = await cli(['balance-current']);
  entry = { id, status: 'planned', world, purpose: 'Visual-direction approval reference', referenceIds: [],
    operation: 'text_to_image', sourcePath, runtimePath: null, promptPath, provider: 'DreamLayer',
    idempotencyKey: `last-curator-m3-${name}-reference-20261005-v1`, generatedAt: null,
    executionId: null, creditsSpent: null, balanceBefore: before.available, balanceAfter: null,
    pixelSize: null, preparationNotes: 'Reference only. Awaiting user visual-direction approval.', approved: false };
  manifest.assets.push(entry);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${id}: submitting one image, quoted 1 credit.`);
  const outcome = await cli(['generate', prompt, '--aspect', aspect, '--out', sourcePath,
    '--idempotency-key', entry.idempotencyKey]);
  entry.executionId = outcome.execution_id;
  entry.conversationId = outcome.conversation_id;
  entry.outputAssetId = outcome.asset?.asset_id ?? null;
  entry.status = outcome.status === 'completed' ? 'generated' : 'planned';
  entry.generatedAt = new Date().toISOString();
  const bytes = await readFile(sourcePath);
  entry.pixelSize = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  entry.sourceSha256 = createHash('sha256').update(bytes).digest('hex');
  // Save delivered identity before the read-only balance call can fail.
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  const after = await cli(['balance-current']);
  entry.balanceAfter = after.available;
  entry.creditsSpent = before.available - after.available;
  entry.creditEvidence = 'Sequential API available-balance delta; one active local job.';
  manifest.balanceAfterReferences = after;
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${id}: ${entry.executionId}; observed ${entry.creditsSpent} credit(s); remaining ${after.available}.`);
}
