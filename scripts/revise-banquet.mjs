// One user-requested reference edit. Production still requires visual approval.
import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

function cli(args) {
  return JSON.parse(execFileSync(process.execPath,
    ['scripts/dreamlayer.mjs', ...args, '--json', '--quiet'],
    { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] }));
}
const manifestPath = 'asset-sources/manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const version = process.argv[2] ?? 'v2';
if (!['v2', 'v3', 'v4', 'v5'].includes(version)) throw new Error('Expected a planned reference revision v2 through v5.');
const fresh = version === 'v4' || version === 'v5';
const id = `banquet.reference.${version}`;
if (manifest.assets.some(asset => asset.id === id))
  throw new Error('Revision already recorded. Inspect its execution before considering any new request.');
const capabilities = cli(['capabilities']);
const before = cli(['balance-current']);
if (capabilities.key_mode !== 'live' || !capabilities.operations.includes('image_to_image') ||
    capabilities.live_charge_credits_per_image !== 1 || before.available < 21)
  throw new Error('Reference-edit access, one-credit quote or 20-credit reserve check failed.');
const inputPath = version === 'v3' ? 'asset-sources/references/banquet-v2.png' : 'asset-sources/references/banquet.png';
const promptPath = `asset-sources/prompts/banquet-reference-${version}.txt`;
const entry = { id, status: 'planned', world: 'royal-supper',
  purpose: 'User-requested wider full-table reference with more diners, feast props and three-candle candelabra',
  referenceIds: [version === 'v3' ? 'banquet.reference.v2' : 'banquet.reference'], operation: fresh ? 'text_to_image' : 'image_to_image',
  inputPath, inputSha256: createHash('sha256').update(await readFile(inputPath)).digest('hex'),
  sourcePath: `asset-sources/references/banquet-${version}.png`, runtimePath: null, promptPath,
  provider: 'DreamLayer', idempotencyKey: `last-curator-m3-banquet-reference-20261005-${version}`,
  generatedAt: null, executionId: null, creditsSpent: null, balanceBefore: before.available,
  balanceAfter: null, pixelSize: null, preparationNotes: 'Awaiting inspection and user visual-direction approval.',
  approved: false, capabilityCheckAt: new Date().toISOString(), quotedCredits: 1 };
manifest.assets.push(entry);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(`Submitting one DreamLayer ${entry.operation} reference operation; quote 1 credit.`);
if (fresh) {
  entry.inputPath = null; entry.inputSha256 = null;
  entry.referenceUsage = 'Original banquet direction described in text; no image attached. Fresh panoramic composition after edit framing failures.';
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
}
const prompt = (await readFile(promptPath, 'utf8')).trim();
const args = fresh ? ['generate', prompt, '--aspect', '16:9'] : ['edit', inputPath, prompt];
const outcome = cli([...args,
  '--out', entry.sourcePath, '--idempotency-key', entry.idempotencyKey]);
entry.executionId = outcome.execution_id;
entry.conversationId = outcome.conversation_id;
entry.outputAssetId = outcome.asset?.asset_id ?? null;
entry.status = outcome.status === 'completed' ? 'generated' : 'planned';
entry.generatedAt = new Date().toISOString();
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const bytes = await readFile(entry.sourcePath);
entry.pixelSize = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
entry.sourceSha256 = createHash('sha256').update(bytes).digest('hex');
const after = cli(['balance-current']);
entry.balanceAfter = after.available;
entry.creditsSpent = before.available - after.available;
entry.creditEvidence = 'Sequential API available-balance delta; one active local job.';
manifest.balanceAfterReferences = after;
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
console.log(JSON.stringify({ executionId: entry.executionId, creditsSpent: entry.creditsSpent,
  available: after.available, pixelSize: entry.pixelSize }));
