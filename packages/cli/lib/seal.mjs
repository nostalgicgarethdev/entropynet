// entropynet seal: manifest, release id, k-of-n signatures, Solana memo anchor.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const SPEC = 'entropynet-seal/v1';
export const MEMO_PROGRAM = 'MemoSq4gqABAXKb96qnH8TyNmLxPf8YNXqU1zWvkeNA';
export const MEMO_V1 = 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo';
export const RELEASE_PATH = '/seal/release.json';
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

const B58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function b58encode(buf) { let n = BigInt('0x' + (Buffer.from(buf).toString('hex') || '0')), s = ''; while (n > 0n) { s = B58[Number(n % 58n)] + s; n /= 58n; } for (const x of buf) { if (x) break; s = '1' + s; } return s; }
export function b58decode(s) { let n = 0n; for (const c of s) { const i = B58.indexOf(c); if (i < 0) throw new Error('bad base58'); n = n * 58n + BigInt(i); } let hex = n.toString(16); if (hex.length % 2) hex = '0' + hex; let out = Buffer.from(n ? hex : '', 'hex'); let z = 0; for (const c of s) { if (c !== '1') break; z++; } return Buffer.concat([Buffer.alloc(z), out]); }

export function walk(dir) {
  const out = [];
  const rec = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) rec(p); else if (e.isFile()) out.push(p); } };
  rec(dir); return out;
}
// files: { "/index.html": sha256hex, ... } (the release file itself is excluded)
export function manifest(dir) {
  const files = {};
  for (const p of walk(dir)) { const rel = '/' + path.relative(dir, p).split(path.sep).join('/'); if (rel === RELEASE_PATH) continue; files[rel] = sha(fs.readFileSync(p)); }
  return Object.fromEntries(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)));
}
export const filesRoot = (files) => sha(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, h]) => `${p} ${h}\n`).join(''));
export function releaseId(r) { return sha([SPEC, r.files_root, r.beacon.round, r.beacon.randomness, r.created, r.prev || ''].join('\n')); }
export const signMessage = (id) => Buffer.from(`${SPEC}:${id}`);

export function loadKey(file) {
  const sk = Uint8Array.from(JSON.parse(fs.readFileSync(file, 'utf8')));   // Solana CLI keypair format (64 bytes)
  const priv = crypto.createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), Buffer.from(sk.slice(0, 32))]), format: 'der', type: 'pkcs8' });
  return { priv, pub: b58encode(Buffer.from(sk.slice(32))) };
}
export function verifySig(pubB58, sigHex, msg) {
  const pub = crypto.createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), b58decode(pubB58)]), format: 'der', type: 'spki' });
  return crypto.verify(null, msg, pub, Buffer.from(sigHex, 'hex'));
}

export async function draft(dir, { beaconUrl = 'https://entropynet.space', prev = null, uri = '' } = {}) {
  const files = manifest(dir);
  const b = await (await fetch(beaconUrl + '/api/round/latest')).json();
  const r = { spec: SPEC, created: Math.floor(Date.now() / 1000), uri, prev, beacon: { round: b.round, randomness: b.randomness, url: beaconUrl }, files_root: filesRoot(files), files, signatures: [], anchor: null };
  r.id = releaseId(r);
  return r;
}
export function sign(r, keyFile) {
  const { priv, pub } = loadKey(keyFile);
  if (r.id !== releaseId(r)) throw new Error('release id does not match its contents');
  r.signatures = r.signatures.filter(s => s.signer !== pub);
  r.signatures.push({ signer: pub, sig: crypto.sign(null, signMessage(r.id), priv).toString('hex') });
  return r;
}
// Returns { ok, valid: [signers], reasons: [] }
export function check(r, policy, dir) {
  const reasons = [];
  if (r.spec !== SPEC) reasons.push('unknown spec');
  if (filesRoot(r.files) !== r.files_root) reasons.push('files_root does not match files');
  if (releaseId(r) !== r.id) reasons.push('release id does not match');
  const valid = [...new Set(r.signatures.filter(s => policy.signers.includes(s.signer) && (() => { try { return verifySig(s.signer, s.sig, signMessage(r.id)); } catch { return false; } })()).map(s => s.signer))];
  if (valid.length < policy.threshold) reasons.push(`only ${valid.length} of ${policy.threshold} required signatures`);
  if (dir) { const now = manifest(dir); for (const [p, h] of Object.entries(r.files)) if (now[p] !== h) reasons.push(`changed: ${p}`); for (const p of Object.keys(now)) if (!(p in r.files)) reasons.push(`not sealed: ${p}`); }
  return { ok: reasons.length === 0, valid, reasons };
}
export const memoText = (r) => `${SPEC} release=${r.id} files=${r.files_root} round=${r.beacon.round} uri=${r.uri || '-'}`;

export async function anchor(r, payerFile, { cluster = 'devnet', rpc } = {}) {
  if (cluster === 'mainnet-beta' && process.env.ENTROPYNET_ALLOW_MAINNET !== '1') throw new Error('mainnet anchoring is off. Set ENTROPYNET_ALLOW_MAINNET=1 only with the owner\'s OK.');
  const w3 = await import('@solana/web3.js');
  const url = rpc || (cluster === 'devnet' ? 'https://api.devnet.solana.com' : w3.clusterApiUrl(cluster));
  const c = new w3.Connection(url, 'confirmed');
  const payer = w3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(payerFile, 'utf8'))));
  if (cluster === 'devnet' && (await c.getBalance(payer.publicKey)) < 5_000_000) {
    await c.requestAirdrop(payer.publicKey, 1_000_000_000); for (let i = 0; i < 30 && (await c.getBalance(payer.publicKey)) < 5_000_000; i++) await new Promise(r => setTimeout(r, 1500));
  }
  // Memo v2 where deployed; some clusters (devnet at time of writing) only carry Memo v1.
  const prog = (await c.getAccountInfo(new w3.PublicKey(MEMO_PROGRAM))) ? MEMO_PROGRAM : MEMO_V1;
  const ix = new w3.TransactionInstruction({ programId: new w3.PublicKey(prog), keys: [{ pubkey: payer.publicKey, isSigner: true, isWritable: false }], data: Buffer.from(memoText(r)) });
  const tx = new w3.Transaction().add(ix); tx.feePayer = payer.publicKey; tx.recentBlockhash = (await c.getLatestBlockhash('confirmed')).blockhash; tx.sign(payer);
  const sig = await c.sendRawTransaction(tx.serialize());
  for (let i = 0; i < 40; i++) { const st = (await c.getSignatureStatuses([sig])).value[0]; if (st && st.err) throw new Error('memo failed: ' + JSON.stringify(st.err)); if (st && (st.confirmationStatus === 'confirmed' || st.confirmationStatus === 'finalized')) break; if (i === 39) throw new Error('memo not confirmed: ' + sig); await new Promise(r => setTimeout(r, 1500)); }
  r.anchor = { cluster, program: prog, tx: sig, payer: payer.publicKey.toBase58(), memo: memoText(r) };
  return r;
}
