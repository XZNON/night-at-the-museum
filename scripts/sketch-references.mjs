// Sequential DreamLayer Sketch reference pass. Never imports into browser code.
// Usage: node scripts/sketch-references.mjs <version> <name:aspect | name<parent>...
// Each <name> reads asset-sources/prompts/sketch-<name>[-<version>].txt.
// name<parent edits the existing references/sketch/<parent>-<version>.png;
// name<parent-vN edits that exact earlier version instead.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const root = 'asset-sources';
const [version, ...requests] = process.argv.slice(2);
if (!/^v\d+$/.test(version ?? '') || requests.length === 0)
  throw new Error('Usage: node scripts/sketch-references.mjs <vN> <name:aspect>...');
await mkdir(`${root}/references/sketch`, { recursive: true });
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
if (capabilities.key_mode !== 'live' || capabilities.live_charge_credits_per_image !== 1
  || initial.available < requests.length + 20)
  throw new Error('Expected live access, one-credit pricing and the request plus a 20-credit reserve.');
const manifestPath = `${root}/manifest.json`;
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const request of requests) {
  const [head, parent = null] = request.split('<');
  const [name, aspect = '1:1'] = head.split(':').length === 3
    ? [head.split(':')[0], head.split(':').slice(1).join(':')] : [head, '1:1'];
  const parentFile = parent && (/-v\d+$/.test(parent) ? parent : `${parent}-${version}`);
  const parentPath = parent && `${root}/references/sketch/${parentFile}.png`;
  if (parentPath) await access(parentPath);
  const id = `sketch.${name}.reference-${version}`;
  if (manifest.assets.some(asset => asset.id === id)) {
    console.log(`${id}: already recorded; inspect or recover it instead of resubmitting.`); continue;
  }
  const sourcePath = `${root}/references/sketch/${name}-${version}.png`;
  try { await access(sourcePath); throw new Error(`${sourcePath}: unrecorded output exists; inspect first.`); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  let promptPath = `${root}/prompts/sketch-${name}-${version}.txt`;
  try { await access(promptPath); } catch { promptPath = `${root}/prompts/sketch-${name}.txt`; }
  const prompt = (await readFile(promptPath, 'utf8')).trim();
  const before = await cli(['balance-current']);
  const entry = { id, status: 'planned', world: 'unfinished-sketch',
    purpose: 'Sketch mechanism style reference; not integrated',
    referenceIds: parent ? [`sketch.${parentFile.replace(/-(v\d+)$/, '.reference-$1')}`] : [],
    operation: parent ? 'image_to_image' : 'text_to_image', parentPath, sourcePath, runtimePath: null, promptPath, provider: 'DreamLayer',
    idempotencyKey: `last-curator-sketch-${name}-reference-${version}`, generatedAt: null,
    executionId: null, creditsSpent: null, balanceBefore: before.available, balanceAfter: null,
    pixelSize: null, preparationNotes: 'Reference only. Awaiting user review.', approved: false };
  manifest.assets.push(entry);
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${id}: submitting one ${parent ? `edit of ${parent}` : `image (${aspect})`}, quoted 1 credit.`);
  const outcome = await cli([...(parent ? ['edit', parentPath, prompt] : ['generate', prompt, '--aspect', aspect]),
    '--out', sourcePath, '--idempotency-key', entry.idempotencyKey]);
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
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`${id}: ${entry.executionId}; observed ${entry.creditsSpent} credit(s); remaining ${after.available}.`);
}
