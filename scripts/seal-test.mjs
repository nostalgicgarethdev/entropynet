// Offline tests for the seal: threshold, foreign keys, tampered files, release-id binding, api check.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import crypto from 'node:crypto';
import { manifest, filesRoot, releaseId, sign, check, SPEC } from '../packages/cli/lib/seal.mjs';
import { check as apiCheck } from '../api/seal.js';
const policy = JSON.parse(fs.readFileSync(new URL('../seal.policy.json', import.meta.url)));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'st-'));
// throwaway keys: test policy built from fresh keys, so no real seal keys are needed
const mk = () => { const { privateKey } = crypto.generateKeyPairSync('ed25519'); const d = privateKey.export({ format: 'jwk' }); const sk = Buffer.from(d.d, 'base64url'), pk = Buffer.from(d.x, 'base64url'); const f = path.join(tmp, crypto.randomBytes(4).toString('hex') + '.json'); fs.writeFileSync(f, JSON.stringify([...sk, ...pk])); return f; };
const ks = [mk(), mk(), mk(), mk()];
const { b58encode } = await import('../packages/cli/lib/seal.mjs');
const pub = (f) => b58encode(Buffer.from(JSON.parse(fs.readFileSync(f))).subarray(32));
const pol = { threshold: 2, signers: ks.slice(0, 3).map(pub) };
const site = path.join(tmp, 'site'); fs.mkdirSync(site); fs.writeFileSync(path.join(site, 'index.html'), '<h1>ok</h1>'); fs.writeFileSync(path.join(site, 'app.js'), 'ok()');
const base = () => { const files = manifest(site); const r = { spec: SPEC, created: 1, uri: '', prev: null, beacon: { round: 1, randomness: 'aa' }, files_root: filesRoot(files), files, signatures: [], anchor: null }; r.id = releaseId(r); return r; };
let n = 0, fail = 0; const t = (name, cond) => { n++; if (!cond) fail++; console.log((cond ? 'ok   ' : 'FAIL ') + name); };
t('0 signatures rejected', !check(base(), pol).ok);
t('1 of 3 rejected', !check(sign(base(), ks[0]), pol).ok);
t('2 of 3 accepted', check(sign(sign(base(), ks[0]), ks[1]), pol, site).ok);
t('same key twice counts once', !check(sign(sign(base(), ks[0]), ks[0]), pol).ok);
t('outside key does not count', !check(sign(sign(base(), ks[0]), ks[3]), pol).ok);
const good = sign(sign(base(), ks[0]), ks[1]);
fs.writeFileSync(path.join(site, 'app.js'), 'drain()');
t('changed file detected', check(good, pol, site).reasons.includes('changed: /app.js'));
fs.writeFileSync(path.join(site, 'x.js'), '1'); t('unsealed extra file detected', check(good, pol, site).reasons.includes('not sealed: /x.js'));
const forged = JSON.parse(JSON.stringify(good)); forged.files['/app.js'] = 'f'.repeat(64);
t('editing the manifest breaks the root', !check(forged, pol).ok);
const forged2 = JSON.parse(JSON.stringify(good)); forged2.files_root = filesRoot(forged.files = forged.files); forged2.files = forged.files;
t('re-rooting breaks the release id / signatures', !check(forged2, pol).ok);
// api/seal uses the real policy: a release signed by throwaway keys must be refused
t('api refuses non-policy signers', apiCheck(good) !== null && policy.signers.length === 3);
console.log(`${n - fail}/${n} passed`); process.exit(fail ? 1 : 0);
