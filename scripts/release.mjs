// Seal the site for release. Run on a team machine, never on the host or in CI env vars.
//   node scripts/release.mjs [--sign key1.json,key2.json] [--anchor payer.json] [--no-anchor]
// The served /tamper-test/wallet-widget.js is a harmless fake "drainer"; the release seals the
// real widget (packages/verifier/test-fixtures/wallet-widget.sealed.js) in its place, so the
// live site always carries one deliberate mismatch for the tamper test.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync } from 'node:child_process';
import { draft, sign, check, anchor, RELEASE_PATH } from '../packages/cli/lib/seal.mjs';
const root = path.resolve(new URL('..', import.meta.url).pathname);
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const policy = JSON.parse(fs.readFileSync(path.join(root, 'seal.policy.json'), 'utf8'));
const secrets = process.env.ENTROPYNET_KEYS_DIR || '/workspace/tt2-secrets';
const keys = (arg('--sign') || `${secrets}/entropynet-seal-signer-1.json,${secrets}/entropynet-seal-signer-2.json`).split(',');
const payer = arg('--anchor') || `${secrets}/entropynet-seal-devnet-payer.json`;
for (const k of ['VERCEL', 'CI', 'RAILWAY_ENVIRONMENT']) if (process.env[k]) { console.error(`refusing to sign: ${k} is set. Seal keys never run on the host or CI.`); process.exit(1); }

execFileSync('node', [path.join(root, 'packages/verifier/build.mjs')], { stdio: 'inherit' });
const site = path.join(root, 'site');
const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'seal-'));
fs.cpSync(site, stage, { recursive: true });
fs.copyFileSync(path.join(root, 'packages/verifier/test-fixtures/wallet-widget.sealed.js'), path.join(stage, 'tamper-test/wallet-widget.js'));
fs.rmSync(path.join(stage, RELEASE_PATH.slice(1)), { force: true });

let prev = null; try { prev = JSON.parse(fs.readFileSync(path.join(site, RELEASE_PATH.slice(1)), 'utf8')).id; } catch {}
let r = await draft(stage, { prev, uri: 'https://entropynet.space' + RELEASE_PATH });
for (const k of keys) r = sign(r, k);
const c = check(r, policy, stage);
if (!c.ok) { console.error('release fails policy:', c.reasons); process.exit(1); }
if (!process.argv.includes('--no-anchor')) r = await anchor(r, payer, { cluster: policy.anchor_cluster || 'devnet', rpc: process.env.ENTROPYNET_DEVNET_RPC || undefined });
fs.mkdirSync(path.join(site, 'seal'), { recursive: true });
fs.writeFileSync(path.join(site, RELEASE_PATH.slice(1)), JSON.stringify(r, null, 1));
console.log(JSON.stringify({ id: r.id, files_root: r.files_root, files: Object.keys(r.files).length, round: r.beacon.round, signers: c.valid, anchor: r.anchor }, null, 1));
