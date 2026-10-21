import crypto from 'node:crypto';
import { put } from '@vercel/blob';

export const PERIOD = 3;                 // seconds per round
export const GENESIS = 1792612800;       // unix seconds, round 0
export const NODES = ['n1-cpt', 'n2-fra', 'n3-iad', 'n4-sin', 'n5-gru'];
const DOMAIN = 'entropynet/v1';

const sha = (...parts) => { const h = crypto.createHash('sha256'); for (const p of parts) h.update(p); return h.digest('hex'); };
export const roundAt = (t = Date.now() / 1000) => Math.floor((t - GENESIS) / PERIOD);
export const timeOf = (n) => GENESIS + n * PERIOD;

function nodeKey(i) { return crypto.createHmac('sha256', process.env.ENTROPY_NODE_MASTER || 'dev').update('node:' + NODES[i]).digest(); }
export function reveal(i, n) { return crypto.createHmac('sha256', nodeKey(i)).update('round:' + n).digest('hex'); }
export const commit = (i, n) => sha(Buffer.from(reveal(i, n), 'hex'));

let _priv, _pubHex;
function keys() {
  if (!_priv) {
    _priv = crypto.createPrivateKey({ key: Buffer.from(process.env.ENTROPY_BEACON_KEY || '', 'base64'), format: 'der', type: 'pkcs8' });
    _pubHex = crypto.createPublicKey(_priv).export({ type: 'spki', format: 'der' }).subarray(12).toString('hex');
  }
  return { priv: _priv, pub: _pubHex };
}
export const publicKeyHex = () => keys().pub;

// canonical message the beacon signs (verifier rebuilds this exactly)
export function message(r) {
  return [DOMAIN, r.round, r.prev_round, r.prev_randomness, r.mix, r.solana.slot, r.solana.blockhash, r.time].join('|');
}
export function mixOf(reveals) { return sha(Buffer.from(reveals.map(x => x.reveal).join(''), 'hex')); }

// ---------- storage ----------
const storeBase = () => {
  const m = (process.env.BLOB_READ_WRITE_TOKEN || '').match(/^vercel_blob_rw_([A-Za-z0-9]+)_/);
  return m ? `https://${m[1].toLowerCase()}.public.blob.vercel-storage.com` : '';
};
const pad = (n) => String(n).padStart(10, '0');
export async function getJSON(path) {
  const r = await fetch(`${storeBase()}/${path}?v=${Date.now()}`, { cache: 'no-store' });
  if (!r.ok) return null;
  return r.json();
}
export async function putJSON(path, obj, overwrite = false) {
  return put(path, JSON.stringify(obj), { access: 'public', addRandomSuffix: false, allowOverwrite: overwrite, contentType: 'application/json', cacheControlMaxAge: overwrite ? 60 : 31536000 });
}
export const getRound = (n) => getJSON(`rounds/${pad(n)}.json`);

// ---------- solana ----------
async function rpc(method, params) {
  const urls = [];
  const env = (process.env.SOLANA_RPC || '').trim();
  if (/^https:\/\/\S+$/.test(env)) urls.push(env);
  urls.push('https://api.mainnet-beta.solana.com');
  let err;
  for (const url of urls) {
    try {
      const r = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) });
      const j = await r.json(); if (j.error) throw new Error(j.error.message); return j.result;
    } catch (e) { err = e; }
  }
  throw err;
}
async function solanaAnchor() {
  let slot = await rpc('getSlot', [{ commitment: 'finalized' }]);
  for (let k = 0; k < 6; k++, slot--) {
    try { const b = await rpc('getBlock', [slot, { commitment: 'finalized', transactionDetails: 'none', rewards: false, maxSupportedTransactionVersion: 0 }]); if (b) return { slot, blockhash: b.blockhash }; } catch {}
  }
  throw new Error('no finalized block');
}

// ---------- production (lazy, idempotent) ----------
let head = null; // warm-instance cache
async function findHead(target) {
  if (head && head.round <= target) {
    // fast path: maybe someone else produced newer rounds
    const h = await getJSON('head.json'); if (h && h.round > head.round) head = await getRound(h.round) || head;
    return head;
  }
  const h = await getJSON('head.json');
  if (h) { const r = await getRound(h.round); if (r) { head = r; return r; } }
  return null;
}

export async function produce(r0, anchor) {
  const n = roundAt();
  const prev = r0;
  const reveals = NODES.map((id, i) => ({ node: id, reveal: reveal(i, n), commit: commit(i, n) }));
  const r = {
    v: 1, round: n, time: timeOf(n),
    prev_round: prev ? prev.round : -1,
    prev_randomness: prev ? prev.randomness : '0'.repeat(64),
    nodes: reveals,
    next_commits: NODES.map((id, i) => ({ node: id, commit: commit(i, n + 1) })),
    mix: mixOf(reveals),
    solana: anchor,
  };
  r.randomness = sha(Buffer.from(message(r)));
  r.signature = crypto.sign(null, Buffer.from(message(r) + '|' + r.randomness), keys().priv).toString('hex');
  r.public_key = keys().pub;
  r.skipped = prev ? Math.max(0, n - prev.round - 1) : 0;
  return r;
}

export async function latest() {
  const n = roundAt();
  let h = await findHead(n);
  if (h && h.round >= n) return h;
  const anchor = await solanaAnchor();
  const r = await produce(h, anchor);
  try {
    await putJSON(`rounds/${pad(r.round)}.json`, r, false);
    await putJSON('head.json', { round: r.round }, true);
    head = r; return r;
  } catch (e) {
    // another instance won the race: use theirs
    const other = await getRound(r.round); if (other) { head = other; return other; }
    throw e;
  }
}
