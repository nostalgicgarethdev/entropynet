// Builds site/sw.js: the noble ed25519 fallback + the verifier, with the signer policy pinned in.
import fs from 'node:fs';
const here = new URL('.', import.meta.url).pathname;
const policy = JSON.parse(fs.readFileSync(new URL('../../seal.policy.json', import.meta.url)));
const pinned = `const POLICY = ${JSON.stringify({ threshold: policy.threshold, signers: policy.signers })};`;
const out = fs.readFileSync(here + 'vendor-ed25519.js', 'utf8') + '\n' + fs.readFileSync(here + 'sw.src.js', 'utf8').replace('/* __POLICY__ */', pinned);
fs.writeFileSync(process.argv[2] || new URL('../../site/sw.js', import.meta.url), out);
console.log('built sw.js', out.length, 'bytes');
