// Development-only DreamLayer production jobs. All secrets pass through the redacting bridge.
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const manifestPath = 'asset-sources/manifest.json';
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
for (const id of ['masterpiece.reference', 'banquet.reference.v5', 'player.reference']) {
  if (!manifest.assets.find(a => a.id === id)?.approved) throw new Error(`Visual approval missing: ${id}`);
}
const background = 'Derive a playable side-view scenery layer from this Royal Supper reference. Preserve its warm painterly candlelit red-and-gold palace, richly dressed diners eating and drinking, wine bottles, decanters, goblets, fruit and brass three-candle candelabra. Render the dining guests at the far side of the table, viewed straight across at tabletop height. Simplify the lower foreground into quiet dark warm colour and leave it free of route props, bread, platforms, butter, grapes, fork, jelly, pear or player. No near edge of an oblique table, perspective floor, UI, lettering or map. Background detail must stay softer and lower contrast than a tiny teal traveller. One flat wide image; no implied separate layers or transparent export.';
const bread = 'Derive one reusable game platform from the painterly Royal Supper reference: a single warm golden loaf or thick bread slice in strict side elevation, with a broad nearly horizontal upper landing edge, rounded crust at both ends and a visible crumb-textured side. One isolated loaf only, centred and fully visible on a plain contrasting background. No plate, basket, hands, cutlery, table, shadow extending beyond the loaf, text or character. Strong readable silhouette and rich hand-painted oil texture; lighting from upper left, cream highlights and warm brown crust. Width approximately 2.4 times its height. This is art for an existing rectangular collider; do not add spikes or raised toppings to its landing surface.';
const jobs = [
  { id: 'royal-supper.bread.cartoon-preview', stage: 'direction-preview', date: '20261006', operation: 'edit', aspect: '16:9', input: 'public/assets/supper/bread.png', ref: 'royal-supper.bread', name: 'bread-cartoon-preview', purpose: 'User-requested animation-film style comparison only; not a runtime replacement or approved new direction',
    prompt: 'Restyle the SAME existing bread game platform shown in the input as a charming stylized 2D animation-film illustration. Preserve its broad flat rectangular side-view silhouette, perfectly horizontal upper landing edge, straight vertical front face, and thin golden-brown crust border; do not turn it into a round loaf or change the playable shape. Use warm honey-gold colours, simplified large irregular crumb shapes, clean confident hand-drawn contours, soft cel shading and a few broad painted highlights. Strong readable silhouette and expressive designed texture, cohesive with a small illustrated teal traveller. Remove the photographic pores, realistic food photography, grain and hyper-detailed surface. The bread itself has no face, eyes or limbs. One fully visible bread platform centred on a flat dark burgundy background, wide aspect and generous quiet margin. No extra props, scenery, text, labels or signature. This is a single static cartoon-style direction comparison, not a moving animation.' },
  { id: 'player.idle', operation: 'cutout', input: 'asset-sources/references/player.png', ref: 'player.reference', name: 'player-idle-cutout', purpose: 'Standing restorer cutout for first camera slice' },
  { id: 'royal-supper.background', operation: 'edit', input: 'asset-sources/references/banquet-v5.png', ref: 'banquet.reference.v5', name: 'supper-background', prompt: background, purpose: 'Quiet side-view banquet scenery behind authored route' },
  { id: 'royal-supper.bread', operation: 'edit', input: 'asset-sources/references/banquet-v5.png', ref: 'banquet.reference.v5', name: 'bread-side', prompt: bread, purpose: 'Reusable side-view bread platform' },
  { id: 'royal-supper.bread.cutout', operation: 'cutout', input: 'asset-sources/production/bread-side.png', ref: 'royal-supper.bread', name: 'bread-cutout', purpose: 'Transparent reusable bread platform' },
  { id: 'royal-supper.food-sheet', stage: 'props', date: '20261006', operation: 'edit', aspect: '4:3', input: 'asset-sources/references/banquet-v5.png', ref: 'banquet.reference.v5', name: 'food-sheet', purpose: 'Only required basket, butter, crumb, grape, jelly and cake artwork',
    prompt: 'Create a static game prop sheet in the warm hand-painted oil style and lighting of this royal banquet. EXACTLY SIX fully separated objects in a strict THREE COLUMN by TWO ROW grid, one object centred in each equal cell, all in strict SIDE ELEVATION. Top row left: low woven bread basket with a broad flat horizontal rim; top middle: a wide rectangular slab of golden butter with perfectly flat top; top right: one jagged golden bread crumb. Bottom row left: ONE round purple grape, no bunch or stem; bottom middle: a shallow wide rectangular purple-pink jelly pad, flat top; bottom right: a horizontal chocolate cake slice with flat cream icing top. Preserve warm rich painted brushwork, strong silhouettes, light from upper left. All objects fully visible with generous separate margins. Entire background solid vivid magenta #ff00ff for local masking. No shadows beyond objects, no plate or table, no character, no text, labels, borders, signature or scenery. This is one ordinary static reference edit, not an animation.' },
  { id: 'royal-supper.crockery-sheet', stage: 'props', date: '20261006', operation: 'edit', aspect: '4:3', input: 'asset-sources/references/banquet-v5.png', ref: 'banquet.reference.v5', name: 'crockery-sheet', purpose: 'Required plate, goblet, cover dish and unlit wax pillar artwork',
    prompt: 'Create a static game prop sheet in the warm hand-painted oil style and lighting of this royal banquet. EXACTLY FOUR fully separated objects in a strict TWO COLUMN by TWO ROW grid, one object centred in each equal cell, strict SIDE ELEVATION. Top left: white porcelain platter with brass-gold rim, long perfectly flat horizontal top and shallow side thickness, no food. Top right: a complete elegant gold goblet, wide bowl and narrow stem and base. Bottom left: a high straight-sided rectangular covered serving terrine, rich blue porcelain with gold trim, wide flat lid, vertical sides; NOT an arched dome, because its protection silhouette must fill a rectangle. Bottom right: one short thick ivory wax cylinder, flat horizontal top, unlit wick, no flame or holder. Strong readable silhouettes, warm brushwork, lighting upper left. Entire background solid vivid magenta #ff00ff for local masking. Generous margins; no table, people, extra objects, labels, text, signature, cell borders or scenery. One ordinary static reference edit, not animation.' },
  { id: 'royal-supper.mechanics-sheet', stage: 'props', date: '20261006', operation: 'edit', aspect: '4:3', input: 'asset-sources/references/banquet-v5.png', ref: 'banquet.reference.v5', name: 'mechanics-sheet', purpose: 'Required fork, rotating fan, trident metal reference and watchful diner portrait',
    prompt: 'Create a static game prop sheet in this royal banquet\'s warm hand-painted oil style. EXACTLY FOUR fully separated objects in a strict TWO COLUMN by TWO ROW grid, one centred in each cell. Top left: one long elegant silver dinner fork, upright vertical, four tines at TOP, narrow long straight shaft, handle at BOTTOM, complete silhouette, viewed flat from front. Top right: one four-bladed blue-and-brass hand fan rotor, viewed straight from FRONT, circular symmetrical silhouette, no stand or background. Bottom left: a wide low brass TRIDENT candelabrum holder with EXACTLY THREE evenly spaced empty cups and common central stem and foot; NO wax or flames. Bottom right: one Renaissance male diner\'s head and shoulders, pale face with dark hair, front-facing, eyes looking slightly down, matching the painted banquet guests; no hands or table. Clear silhouettes and separate generous margins. Entire background solid vivid magenta #ff00ff for local masking. No writing, labels, signature, grid lines, extra objects, scenery or modern clothing. One ordinary static reference edit, not animation.' },
];
const recover = process.argv.includes('--recover');
const selected = process.argv.slice(2).filter(arg => arg !== '--recover');
if (selected.some(id => jobs.find(j => j.id === id)?.stage === 'props') && !manifest.sliceValidation?.passed)
  throw new Error('The initial player/background/platform slice must be camera-validated before prop generation.');
if (recover && selected.length !== 1) throw new Error('Recovery requires exactly one saved asset ID.');
if (selected.length && selected.some(id => !jobs.some(j => j.id === id))) throw new Error('Unknown production job.');
async function rawCli(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/dreamlayer.mjs', ...args, '--json', '--quiet']);
    let out = '', err = '';
    child.stdout.on('data', chunk => { out += chunk; }); child.stderr.on('data', chunk => { err += chunk; });
    child.on('error', () => reject(new Error('DreamLayer bridge failed to start.')));
    child.on('close', code => {
      if (code !== 0) {
        const error = new Error(`DreamLayer bridge exited ${code}: ${out || err}`);
        try { error.publicError = JSON.parse(out || err).error; } catch {}
        return reject(error);
      }
      try { resolve(JSON.parse(out)); } catch { reject(new Error('DreamLayer output is not JSON.')); }
    });
  });
}
async function cli(args) {
  const readOnly = ['capabilities', 'balance-current'].includes(args[0]);
  const attempts = readOnly ? 5 : 3;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try { return await rawCli(args); }
    catch (error) {
      if (attempt + 1 === attempts || (!readOnly && error.publicError?.retryable !== true)) throw error;
      console.log(`${args[0]}: unavailable; ${readOnly ? 'retrying read-only query' : 'recovering the identical saved idempotency key'}.`);
      await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
    }
  }
}
const save = () => writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
await mkdir('asset-sources/production', { recursive: true });
// Recover an already-priced request directly. It is the same operation, not a
// new batch; its saved preflight/input/prompt/key remain authoritative.
const recoveringEntry = recover ? manifest.assets.find(a => a.id === selected[0]) : null;
if (recover && (!recoveringEntry || recoveringEntry.status !== 'planned')) throw new Error('No interrupted planned job to recover.');
const lastCheck = manifest.productionChecks?.at(-1);
const freshPreflight = !recover || !lastCheck || Date.now() - Date.parse(lastCheck.checkedAt) > 60 * 60 * 1000;
const capabilities = freshPreflight ? await cli(['capabilities']) : lastCheck.capabilities;
const balance = freshPreflight ? await cli(['balance-current']) : { available: recoveringEntry.balanceBefore };
if (capabilities.key_mode !== 'live' || capabilities.live_charge_credits_per_image !== 1) throw new Error('Expected live one-credit ordinary image access.');
manifest.productionChecks ??= [];
if (freshPreflight) manifest.productionChecks.push({ checkedAt: new Date().toISOString(), capabilities, balance, batch: selected.length ? selected : 'slice', reserveCredits: 20 });
const unreconciled = recover ? [] : manifest.assets.filter(a => a.provider === 'DreamLayer' && ['generated','prepared','integrated'].includes(a.status) && a.creditsSpent === null);
if (unreconciled.length > 1) throw new Error('Multiple unreconciled jobs; inspect their billing evidence before continuing.');
if (unreconciled.length === 1) {
  const entry = unreconciled[0]; entry.balanceAfter = balance.available; entry.creditsSpent = entry.balanceBefore - balance.available;
  entry.creditEvidence = 'Recovered sequential available-balance delta before any next local job.';
  manifest.balanceAfterProduction = balance;
  console.log(`${entry.id}: reconciled observed ${entry.creditsSpent} credit(s); remaining ${balance.available}.`);
}
await save();
let availableBalance = balance;
for (const job of jobs.filter(j => !selected.length ? !j.stage : selected.includes(j.id))) {
  const existing = manifest.assets.find(a => a.id === job.id);
  if (existing) {
    if (['generated', 'prepared', 'integrated', 'approved', 'rejected'].includes(existing.status)) { console.log(`${job.id}: already recorded; skipping.`); continue; }
    if (!recover) throw new Error(`${job.id}: interrupted planned operation; recover saved idempotency/execution identity before resubmitting.`);
    if (existing.aspect !== (job.aspect ?? null) || existing.inputSha256 !== hash(await readFile(job.input)) ||
        (existing.promptPath && (await readFile(existing.promptPath, 'utf8')).trim() !== job.prompt))
      throw new Error('Recovery input/prompt changed. Preserve the saved request identity.');
  }
  const before = existing && recover ? { available: existing.balanceBefore } : availableBalance;
  if (before.available < 21) throw new Error('20-credit reserve would be breached.');
  const promptPath = job.prompt ? `asset-sources/prompts/${job.name}.txt` : null;
  if (promptPath && !existing) await writeFile(promptPath, job.prompt + '\n');
  const entry = existing ?? { id: job.id, status: 'planned', world: job.id.startsWith('player.') ? 'shared' : 'royal-supper', purpose: job.purpose,
    referenceIds: [job.ref], operation: job.operation, inputPath: job.input, inputSha256: hash(await readFile(job.input)),
    sourcePath: `asset-sources/production/${job.name}.png`, runtimePath: null, promptPath, provider: 'DreamLayer',
    idempotencyKey: `last-curator-m3-${job.name}-${job.date ?? '20261005'}-v1`, aspect: job.aspect ?? null, executionId: null, generatedAt: null,
    creditsSpent: null, quotedCredits: 1, balanceBefore: before.available, balanceAfter: null, pixelSize: null,
    approved: false, preparationNotes: 'Awaiting output inspection and camera validation.' };
  if (!existing) manifest.assets.push(entry);
  else entry.recoveryAttemptedAt = new Date().toISOString();
  await save();
  console.log(`${job.id}: ${job.operation}; quoted 1 credit; balance ${before.available}.`);
  let result;
  try {
    result = await cli([job.operation, job.input, ...(job.prompt ? [job.prompt] : []), ...(job.aspect ? ['--aspect', job.aspect] : []), '--out', entry.sourcePath, '--idempotency-key', entry.idempotencyKey]);
  } catch (error) {
    entry.lastAttemptError = error.publicError ?? { code: 'BRIDGE_UNAVAILABLE' };
    entry.lastAttemptFailedAt = new Date().toISOString(); await save(); throw error;
  }
  entry.executionId = result.execution_id; entry.conversationId = result.conversation_id;
  entry.outputAssetId = result.asset?.asset_id ?? null; entry.generatedAt = new Date().toISOString();
  entry.status = result.status === 'completed' ? 'generated' : 'planned'; await save();
  if (entry.status !== 'generated') throw new Error('Operation requires recovery/answer before continuing.');
  const bytes = await readFile(entry.sourcePath); entry.sourceSha256 = hash(bytes);
  entry.pixelSize = { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) }; await save();
  const after = await cli(['balance-current']); entry.balanceAfter = after.available; entry.creditsSpent = entry.balanceBefore - after.available;
  availableBalance = after;
  entry.creditEvidence = 'Sequential available-balance delta; one active local job.'; manifest.balanceAfterProduction = after; await save();
  console.log(`${job.id}: completed ${entry.executionId}; observed ${entry.creditsSpent} credit(s); remaining ${after.available}.`);
}
