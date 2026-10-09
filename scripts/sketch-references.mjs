// Kept so recorded Sketch commands still work; see art-references.mjs.
process.argv.splice(2, 0, 'sketch');
await import('./art-references.mjs');
