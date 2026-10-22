// entropynet verifier: a service worker that refuses any page, script or style the team didn't sign.
// POLICY is pinned in this file. A release is accepted only if `threshold` of these keys signed it.
/* __POLICY__ */
const SPEC = 'entropynet-seal/v1';
const RELEASE = '/seal/release.json';
const BLOCK = '/__entropynet/blocked';
const CHECKED = new Set(['document', 'script', 'style', 'worker', 'sharedworker', 'serviceworker', 'iframe', 'frame', 'manifest', '']);
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = (h) => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const sha = async (d) => hex(await crypto.subtle.digest('SHA-256', typeof d === 'string' ? enc.encode(d) : d));
const A58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(s) { let n = 0n; for (const c of s) n = n * 58n + BigInt(A58.indexOf(c)); let h = n.toString(16); if (h.length % 2) h = '0' + h; const o = h === '0' ? [] : [...unhex(h)]; for (const c of s) { if (c !== '1') break; o.unshift(0); } return new Uint8Array(o); }

async function edVerify(pubB58, sigHex, msg) {
  const pub = b58(pubB58), sig = unhex(sigHex), m = enc.encode(msg);
  try { const k = await crypto.subtle.importKey('raw', pub, { name: 'Ed25519' }, false, ['verify']); return await crypto.subtle.verify({ name: 'Ed25519' }, k, sig, m); }
  catch { try { return self.__ed.verify(sig, m, pub); } catch { return false; } }
}
const filesRoot = (files) => sha(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, h]) => `${p} ${h}\n`).join(''));
const releaseId = (r) => sha([SPEC, r.files_root, r.beacon.round, r.beacon.randomness, r.created, r.prev || ''].join('\n'));

async function validate(r) {
  if (!r || r.spec !== SPEC || !r.files) return { ok: false, why: 'not a sealed release' };
  if (await filesRoot(r.files) !== r.files_root) return { ok: false, why: 'file list does not match its root hash' };
  if (await releaseId(r) !== r.id) return { ok: false, why: 'release id does not match its contents' };
  const good = new Set();
  for (const s of r.signatures || []) if (POLICY.signers.includes(s.signer) && !good.has(s.signer) && await edVerify(s.signer, s.sig, `${SPEC}:${r.id}`)) good.add(s.signer);
  if (good.size < POLICY.threshold) return { ok: false, why: `only ${good.size} of the ${POLICY.threshold} required team signatures` };
  return { ok: true, signers: [...good] };
}

// ---------- state ----------
let current = null, lastCheck = 0, events = [];
const store = () => caches.open('entropynet-seal-v1');
async function loadCurrent() { if (current) return current; const r = await (await store()).match('/__entropynet/current'); current = r ? await r.json() : null; return current; }
async function saveCurrent(s) { current = s; await (await store()).put('/__entropynet/current', new Response(JSON.stringify(s))); }

// Fetch the published release. Accept it only if it is valid AND (first visit, same release, or a newer valid release).
async function refresh(force) {
  const cur = await loadCurrent();
  if (!force && cur && Date.now() - lastCheck < 30000) return cur;
  lastCheck = Date.now();
  let r; try { r = await (await fetch(RELEASE, { cache: 'no-store' })).json(); } catch { return cur; }
  if (cur && r.id === cur.release.id) { if (r.anchor && !cur.release.anchor) { cur.release.anchor = r.anchor; await saveCurrent(cur); anchorCheck(); } return cur; }
  const v = await validate(r);
  if (!v.ok) { await alarm({ kind: 'bad-release', path: RELEASE, detail: v.why, got: r && r.id }); return cur; }
  if (cur && !(r.created > cur.release.created)) { await alarm({ kind: 'rollback', path: RELEASE, detail: 'an older release was offered', got: r.id }); return cur; }
  const next = { release: r, signers: v.signers, accepted_at: Date.now(), first_visit: !cur, previous: cur ? cur.release.id : null, anchor_status: 'checking' };
  await saveCurrent(next); anchorCheck();
  return next;
}
async function anchorCheck() {
  const cur = await loadCurrent(); if (!cur) return;
  const a = cur.release.anchor; if (!a) { cur.anchor_status = 'not anchored yet'; return saveCurrent(cur); }
  const rpc = a.cluster === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com';
  try {
    const j = await (await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [a.tx, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }] }) })).json();
    const found = j.result && !j.result.meta.err && JSON.stringify(j.result.transaction).includes(`release=${cur.release.id}`);
    cur.anchor_status = found ? 'confirmed on ' + a.cluster : 'NOT FOUND on ' + a.cluster;
  } catch { cur.anchor_status = 'could not reach ' + a.cluster; }
  await saveCurrent(cur); broadcast({ type: 'status' });
}

// ---------- tamper alarm: signed evidence ----------
let evKey;
async function alarm(e) {
  e.time = Date.now(); e.release = current ? current.release.id : null; e.test = String(e.path || '').startsWith('/tamper-test/');
  events.unshift(e); events = events.slice(0, 20); broadcast({ type: 'tamper', event: e });
  try {
    evKey = evKey || await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    const body = JSON.stringify({ ...e, origin: self.location.origin, ua: navigator.userAgent.slice(0, 120) });
    const sig = hex(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, evKey.privateKey, enc.encode(body)));
    const pub = hex(await crypto.subtle.exportKey('raw', evKey.publicKey));
    await fetch('/api/tamper', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ evidence: body, sig, pub }) });
  } catch {}
}
async function broadcast(m) { for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage(m); }

// ---------- block screen ----------
const cut = (h) => { h = String(h || ''); return h.length > 40 ? h.slice(0, 20) + '…' + h.slice(-8) : h; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function blockPage(q) {
  const test = q.get('test') === '1';
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>blocked · entropynet seal</title>
<style>body{margin:0;background:#17171a;color:#f2f0e9;font:14px/1.6 ui-monospace,Menlo,monospace;display:grid;place-items:center;min-height:100vh}pre{margin:24px;white-space:pre-wrap;max-width:760px;overflow-wrap:anywhere}b{color:#e0673b}a{color:#f2f0e9}i{color:#9a978d;font-style:normal}</style>
<pre>┌──────────────────────────────────────────────────────────┐
│  <b>BLOCKED</b> · this file is not what the team signed          │
└──────────────────────────────────────────────────────────┘

<i>visitor@${esc(self.location.host)}:~</i> <b>[blocked]</b>
<i>$</i> entropynet verify ${esc(q.get('path'))}

[*]    file      ${esc(q.get('path'))}
[*]    sealed    ${esc(cut(q.get('want')))}
<b>[fire]</b> served    ${esc(cut(q.get('got')))}
[*]    release   ${esc(cut(q.get('rel')))}
<b>[OK]</b>   result    stopped before it ran · reported

Your browser stopped it before it ran. ${test ? '<b>This was the tamper test:</b> the server really did serve a swapped file (a harmless fake "drainer"), and the seal refused it.' : 'The server is sending code the team never signed. Do not connect a wallet here. The incident has been reported to the public tamper feed.'}

<i>// entropynet seal · checked in your browser, not by the server</i>
${test ? '<a href="/#seal" target="_top">← back to the site</a>' : '<i>this page stays blocked until the server sends the signed files again.</i>'}
</pre>`, { status: 451, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

// ---------- fetch interception ----------
self.addEventListener('install', (e) => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', (e) => { e.waitUntil((async () => { await self.clients.claim(); await refresh(true); })()); });
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'status') e.waitUntil((async () => { const s = await refresh(false); e.source.postMessage({ type: 'status', state: s && { id: s.release.id, files_root: s.release.files_root, created: s.release.created, beacon: s.release.beacon, signers: s.signers, threshold: POLICY.threshold, policy: POLICY.signers, files: Object.keys(s.release.files).length, anchor: s.release.anchor, anchor_status: s.anchor_status, first_visit: s.first_visit, previous: s.previous }, events }); })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== 'GET') return;
  if (url.pathname === BLOCK) return e.respondWith(blockPage(url.searchParams));
  if (url.pathname.startsWith('/api/') || url.pathname === RELEASE || url.pathname === '/sw.js') return;
  e.respondWith(guard(e));
});

async function guard(e) {
  const req = e.request, url = new URL(req.url);
  const s = await refresh(req.mode === 'navigate');
  if (!s) return fetch(req);   // no valid release could be loaded: fail open, but say so in the UI (see FAQ)
  const key = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
  const want = s.release.files[key] || (req.mode === 'navigate' ? s.release.files['/index.html'] : undefined);
  const dest = req.mode === 'navigate' ? 'document' : req.destination;
  const res = await fetch(req.mode === 'navigate' ? new Request(url.origin + (s.release.files[key] ? key : '/index.html'), { cache: 'no-cache' }) : new Request(req, { cache: 'no-cache' }));
  if (!want) {
    if (!CHECKED.has(dest) || !res.ok) return res;
    return block(e, { path: key, want: 'not in the sealed release', got: 'unsigned file', dest });
  }
  const buf = await res.arrayBuffer();
  const got = await sha(buf);
  if (got === want) { const h = new Headers(res.headers); h.delete('content-encoding'); h.delete('content-length'); return new Response(buf, { status: res.status, statusText: res.statusText, headers: h }); }
  return block(e, { path: key, want, got, dest, size: buf.byteLength, excerpt: new TextDecoder().decode(buf.slice(0, 300)) });
}

async function block(e, d) {
  const cur = await loadCurrent();
  await alarm({ kind: 'mismatch', path: d.path, expected: d.want, got: d.got, size: d.size, excerpt: d.excerpt });
  const q = new URLSearchParams({ path: d.path, want: d.want, got: d.got, rel: cur ? cur.release.id : '', test: d.path.startsWith('/tamper-test/') ? '1' : '0' });
  if (d.dest === 'document') return blockPage(q);
  // A sub-resource was swapped: stop it and take the whole tab to the block screen.
  const c = e.clientId && await self.clients.get(e.clientId);
  if (c && c.navigate) c.navigate(BLOCK + '?' + q).catch(() => {});
  return new Response('/* blocked by entropynet seal */', { status: 451, headers: { 'content-type': d.dest === 'style' ? 'text/css' : 'text/javascript' } });
}

// The SW can't police its own updates. It watches for them and raises the alarm.
setInterval(async () => {
  const cur = await loadCurrent(); if (!cur || !cur.release.files['/sw.js']) return;
  try { const b = await (await fetch('/sw.js', { cache: 'no-store' })).arrayBuffer(); const h = await sha(b); if (h !== cur.release.files['/sw.js']) alarm({ kind: 'verifier-changed', path: '/sw.js', expected: cur.release.files['/sw.js'], got: h }); } catch {}
}, 60000);
