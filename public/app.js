const CFG = window.ENTROPY_CONFIG || {};
const $ = (s) => document.querySelector(s);
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = (h) => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const sha = async (data) => hex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : data));
const PERIOD = 3, GENESIS = 1792612800;
const WM = ["\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588    \u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588   \u2588\u2588\u2588\u2588\u2588\u2588  \u2588\u2588\u2588\u2588\u2588\u2588  \u2588\u2588    \u2588\u2588 \u2588\u2588\u2588    \u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588\u2588", "\u2588\u2588      \u2588\u2588\u2588\u2588   \u2588\u2588    \u2588\u2588    \u2588\u2588   \u2588\u2588 \u2588\u2588    \u2588\u2588 \u2588\u2588   \u2588\u2588  \u2588\u2588  \u2588\u2588  \u2588\u2588\u2588\u2588   \u2588\u2588 \u2588\u2588         \u2588\u2588", "\u2588\u2588\u2588\u2588\u2588   \u2588\u2588 \u2588\u2588  \u2588\u2588    \u2588\u2588    \u2588\u2588\u2588\u2588\u2588\u2588  \u2588\u2588    \u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588    \u2588\u2588\u2588\u2588   \u2588\u2588 \u2588\u2588  \u2588\u2588 \u2588\u2588\u2588\u2588\u2588      \u2588\u2588", "\u2588\u2588      \u2588\u2588  \u2588\u2588 \u2588\u2588    \u2588\u2588    \u2588\u2588   \u2588\u2588 \u2588\u2588    \u2588\u2588 \u2588\u2588         \u2588\u2588    \u2588\u2588  \u2588\u2588 \u2588\u2588 \u2588\u2588         \u2588\u2588", "\u2588\u2588\u2588\u2588\u2588\u2588\u2588 \u2588\u2588   \u2588\u2588\u2588\u2588    \u2588\u2588    \u2588\u2588   \u2588\u2588  \u2588\u2588\u2588\u2588\u2588\u2588  \u2588\u2588         \u2588\u2588    \u2588\u2588   \u2588\u2588\u2588\u2588 \u2588\u2588\u2588\u2588\u2588\u2588\u2588    \u2588\u2588"];

/* ---------- CA strip ---------- */
if (CFG.ca) { $('#ca').textContent = CFG.ca; $('#ca2').textContent = CFG.ca; const b = $('#cacopy'); b.disabled = false;
  b.onclick = async () => { await navigator.clipboard.writeText(CFG.ca); b.textContent = 'copied'; setTimeout(() => b.textContent = 'copy', 1400); }; }
$('#fkey').textContent = CFG.beaconPublicKey.slice(0, 16) + '…'; $('#apikey').textContent = CFG.beaconPublicKey;

/* ---------- tabs ---------- */
function showTab() {
  const t = (location.hash.slice(1) || 'beacon').split('/')[0];
  document.querySelectorAll('.tab').forEach(s => s.hidden = s.id !== 'tab-' + t);
  document.querySelectorAll('#tabs a').forEach(a => { a.classList.toggle('on', a.dataset.tab === t); if (a.dataset.tab === t) a.scrollIntoView({ inline: 'nearest', block: 'nearest' }); });
  if (t === 'launches') loadBoard(location.hash.split('/')[1]);
  if (t === 'api') loadApi();
}
addEventListener('hashchange', () => { showTab(); scrollTo(0, 0); });

/* ---------- wordmark ---------- */
function drawWordmark(seed) {
  let k = 0;
  $('#wordmark').innerHTML = WM.map(line => [...line].map(ch => {
    if (ch !== '█') return ch;
    const v = parseInt(seed[(k++) % 64], 16);
    return v === 0 ? '<span class="o">█</span>' : '█';
  }).join('')).join('\n');
}
drawWordmark('1'.repeat(64));

/* ---------- entropy field ---------- */
const RAMP = ' .·:-=+*#%';
let cols = 0, rows = 13, cells = [];
function sizeField() {
  const w = $('#field').clientWidth - 28; const cw = parseFloat(getComputedStyle($('#field')).fontSize) * 0.6;
  cols = Math.max(24, Math.min(96, Math.floor(w / cw)));
}
async function fieldBytes(rand) {
  const out = [];
  for (let r = 0; out.length < rows * cols; r++) out.push(...unhex(await sha(rand + ':' + r)));
  return out;
}
let fieldTimer;
async function drawField(rand, animate) {
  sizeField();
  const bytes = await fieldBytes(rand);
  const el = $('#field');
  if (!cells.length || el.dataset.cols != cols) {
    el.dataset.cols = cols; el.innerHTML = '';
    cells = [];
    for (let y = 0; y < rows; y++) { for (let x = 0; x < cols; x++) { const s = document.createElement('span'); s.textContent = ' '; el.appendChild(s); cells.push(s); } el.appendChild(document.createTextNode('\n')); }
  }
  const glyph = (i) => { const v = bytes[i]; const g = RAMP[Math.floor((v / 256) * RAMP.length)]; return [g, v > 246 ? 'var(--acc)' : v > 110 ? 'var(--ink)' : 'var(--dim)']; };
  clearInterval(fieldTimer);
  const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;
  let x = 0;
  const step = () => {
    for (let y = 0; y < rows; y++) { const i = y * cols + x; const [g, c] = glyph(i); const el = cells[i]; if (el) { el.textContent = g; el.style.color = c; } }
    if (++x >= cols) clearInterval(fieldTimer);
  };
  if (!animate || reduce) { while (x < cols) step(); } else fieldTimer = setInterval(() => { step(); step(); }, 14);
}

/* ---------- beacon polling ---------- */
let last = null; const seen = [];
async function poll() {
  try {
    const r = await (await fetch('/api/round/latest', { cache: 'no-store' })).json();
    if (r.round && (!last || r.round > last.round)) { last = r; onRound(r); }
  } catch {}
}
function onRound(r) {
  $('#h-round').textContent = r.round.toLocaleString('en-US'); $('#h-slot').textContent = r.solana.slot.toLocaleString('en-US');
  $('#f-hash').textContent = r.randomness; $('#f-verify').href = '#verify/' + r.round;
  drawWordmark(r.randomness); drawField(r.randomness, true);
  seen.unshift(r); seen.length = Math.min(seen.length, 12);
  const t = (s) => new Date(s * 1000).toLocaleTimeString('en-GB', { hour12: false });
  $('#stream').innerHTML = '<span class="dim">round       time      randomness                                                        solana slot   sig</span>\n' +
    seen.map((x, i) => `<span class="${i ? '' : 'new'}"><span class="n">${String(x.round).padEnd(11)}</span> ${t(x.time)}  ${x.randomness}  ${String(x.solana.slot).padEnd(12)}  ed25519 ✓${x.skipped ? `  <i>+${x.skipped} idle</i>` : ''}</span>`).join('\n');
}
setInterval(() => {
  const now = Date.now() / 1000, n = Math.floor((now - GENESIS) / PERIOD), left = PERIOD - ((now - GENESIS) % PERIOD);
  $('#h-next').textContent = left.toFixed(1) + 's'; $('#clock').textContent = 'round ' + n.toLocaleString('en-US');
}, 100);
setInterval(poll, PERIOD * 1000); poll();
addEventListener('resize', () => { if (last) { cells = []; drawField(last.randomness, false); } });

/* ---------- verifier ---------- */
let edKey;
async function edVerify(pubHex, sigHex, msg) {
  try {
    edKey = edKey || await crypto.subtle.importKey('raw', unhex(pubHex), { name: 'Ed25519' }, false, ['verify']);
    return await crypto.subtle.verify({ name: 'Ed25519' }, edKey, unhex(sigHex), enc.encode(msg));
  } catch {
    const ed = await import('https://esm.sh/@noble/ed25519@2.2.3');
    ed.etc.sha512Async = async (...m) => new Uint8Array(await crypto.subtle.digest('SHA-512', ed.etc.concatBytes(...m)));
    return ed.verifyAsync(unhex(sigHex), enc.encode(msg), unhex(pubHex));
  }
}
const msgOf = (r) => ['entropynet/v1', r.round, r.prev_round, r.prev_randomness, r.mix, r.solana.slot, r.solana.blockhash, r.time].join('|');
export async function verifyRound(r, prev) {
  const res = [];
  const ok = (c, label) => res.push([!!c, label]);
  for (const nd of r.nodes) ok(await sha(unhex(nd.reveal)) === nd.commit, `reveal matches commit · ${nd.node}`);
  if (prev && prev.round === r.round - 1) {
    const pc = Object.fromEntries(prev.next_commits.map(c => [c.node, c.commit]));
    ok(r.nodes.every(nd => pc[nd.node] === nd.commit), 'commits were published one round earlier');
  } else if (prev) res.push([null, `beacon was idle for ${r.skipped} rounds, so commits were not pre-published this time`]);
  ok(await sha(unhex(r.nodes.map(n => n.reveal).join(''))) === r.mix, 'mix = sha256(all reveals)');
  const m = msgOf(r);
  ok(await sha(m) === r.randomness, 'randomness = sha256(message)');
  ok(r.public_key === CFG.beaconPublicKey, 'signed by the pinned beacon key');
  ok(await edVerify(CFG.beaconPublicKey, r.signature, m + '|' + r.randomness), 'ed25519 signature valid');
  if (prev) ok(prev.randomness === r.prev_randomness && prev.round === r.prev_round, `chained to round ${r.prev_round}`);
  else ok(r.prev_round === -1, 'genesis round');
  return { res, m };
}
async function runVerify(n) {
  const out = $('#vout'); out.textContent = '// fetching…';
  try {
    const r = await (await fetch('/api/round/' + (n || 'latest'), { cache: 'no-store' })).json();
    if (r.error) { out.textContent = '// ' + r.error; return; }
    const prev = r.prev_round >= 0 ? await (await fetch('/api/round/' + r.prev_round)).json() : null;
    const { res, m } = await verifyRound(r, prev);
    const pass = res.every(x => x[0] !== false);
    out.innerHTML = `round ${r.round} · ${new Date(r.time * 1000).toISOString()}\nrandomness ${r.randomness}\nsolana     slot ${r.solana.slot} · ${r.solana.blockhash}\nmessage    ${m}\n\n` +
      res.map(([s, l]) => s === null ? `<span class="dim">[ · ] ${l}</span>` : `<span class="${s ? 'ok' : 'bad'}">[${s ? 'ok' : '!!'}] ${l}</span>`).join('\n') +
      `\n\n<b class="${pass ? 'ok' : 'bad'}">${pass ? 'VERIFIED' : 'FAILED'}</b>`;
    out.dataset.slot = r.solana.slot; out.dataset.bh = r.solana.blockhash; $('#vn').value = r.round;
    window.__lastVerify = pass;
  } catch (e) { out.textContent = '// error: ' + e.message; }
}
$('#vgo').onclick = () => runVerify($('#vn').value.trim());
$('#vsol').onclick = async () => {
  const o = $('#vout'); if (!o.dataset.slot) return runVerify('');
  o.innerHTML += '\n\n// asking a public solana node for slot ' + o.dataset.slot + '…';
  try {
    const j = await (await fetch('https://api.mainnet-beta.solana.com', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getBlock', params: [Number(o.dataset.slot), { transactionDetails: 'none', rewards: false, maxSupportedTransactionVersion: 0 }] }) })).json();
    const good = j.result && j.result.blockhash === o.dataset.bh;
    o.innerHTML += `\n<span class="${good ? 'ok' : 'bad'}">[${good ? 'ok' : '!!'}] solana block hash ${good ? 'matches mainnet' : 'could not be confirmed (public RPC may be rate limiting)'}</span>`;
  } catch { o.innerHTML += '\n<span class="dim">[ · ] public RPC unreachable from this browser, try again</span>'; }
};

/* ---------- launches ---------- */
const fmtT = (s) => new Date(s * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
let LIVE = false;
const post = async (body) => (await fetch('/api/launch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();

/* wallet: the creator's own browser wallet signs and pays. entropynet never holds a key. */
const provider = () => window.phantom?.solana || window.solflare || window.backpack?.solana || window.solana || null;
let wallet = null;
async function connectWallet() {
  const p = provider(); if (!p) throw new Error('No Solana wallet found in this browser. Install Phantom, Solflare or Backpack.');
  const r = await p.connect(); wallet = (r?.publicKey || p.publicKey).toString();
  document.querySelectorAll('.wallet-btn').forEach(b => b.textContent = wallet.slice(0, 4) + '…' + wallet.slice(-4));
  return wallet;
}
document.addEventListener('click', (e) => { if (e.target.closest('.wallet-btn')) { e.preventDefault(); connectWallet().catch(x => alert(x.message)); } });
let _w3; const web3 = async () => (_w3 ||= await import('https://esm.sh/@solana/web3.js@1.98.0'));
const b64ToBytes = (b) => Uint8Array.from(atob(b), c => c.charCodeAt(0));
const bytesToB64 = (u) => { let s = ''; u.forEach(x => s += String.fromCharCode(x)); return btoa(s); };
async function walletSign(b64tx, extraSigner) {
  const { VersionedTransaction } = await web3();
  const tx = VersionedTransaction.deserialize(b64ToBytes(b64tx));
  const signed = await provider().signTransaction(tx);   // the wallet shows the transaction; the user approves
  if (extraSigner) signed.sign([extraSigner]);
  return bytesToB64(signed.serialize());
}

async function loadBoard(openId) {
  try {
    const j = await (await fetch('/api/launch', { cache: 'no-store' })).json();
    LIVE = j.live; document.body.classList.toggle('live', LIVE);
    $('#mode').innerHTML = LIVE ? 'mode: <b>live</b> · launches create real pump.fun coins · signed and paid by the creator\'s own wallet' : 'mode: <b>paper</b> · timing, raffles and receipts are real · no coin is created on-chain yet';
    $('#lcount').textContent = j.items.length + ' launches';
    $('#board').innerHTML = j.items.length ? j.items.map(L => `<a class="li" href="#launches/${L.id}"><b>$${L.ticker}</b><span>${L.name}<br><i>${L.status === 'live' ? 'live on pump.fun' : L.fire ? 'beacon fired ' + fmtT(L.fire.time) : L.timing ? 'launch second ' + fmtT(L.timing.launch_at) : 'window opens ' + fmtT(L.window_start)}</i></span><span class="tag ${L.status}">${L.status}</span></a>`).join('') : '<p class="hint">// no launches yet. schedule the first one.</p>';
  } catch { $('#board').innerHTML = '<p class="hint">// board unavailable, retrying</p>'; }
  if (openId) openReceipt(openId);
}

let rcTimer, launching = false; const attempted = new Set();
async function creatorLaunch(L, out) {
  if (launching) return; launching = true;
  try {
    const { Keypair } = await web3();
    const mint = Keypair.generate();   // fresh mint key, made and kept in this browser only
    out.textContent = '// beacon fired. building your create transaction…';
    const b = await post({ action: 'build', id: L.id, creator: wallet, mint: mint.publicKey.toBase58() });
    if (b.error) throw new Error(b.error);
    out.textContent = '// approve the launch in your wallet now (2-minute window)';
    const signed = await walletSign(b.tx, mint);
    out.textContent = '// sending…';
    const r = await post({ action: 'send', id: L.id, tx: signed });
    if (r.error) throw new Error(r.error);
    out.textContent = '// sent ' + r.sig.slice(0, 12) + '… waiting for confirmation';
  } catch (e) { out.textContent = '// ' + (/reject|cancel/i.test(e.message) ? 'You cancelled in your wallet. Nothing was sent. You can try again until the window closes.' : e.message); }
  launching = false;
}
async function winnerBuy(L, out) {
  try {
    const sol = Number($('#wbsol').value) || 0.1;
    const b = await post({ action: 'winner-buy', id: L.id, wallet, sol }); if (b.error) throw new Error(b.error);
    const signed = await walletSign(b.tx);
    const r = await post({ action: 'winner-send', id: L.id, tx: signed }); if (r.error) throw new Error(r.error);
    out.textContent = '// buy sent ' + r.sig.slice(0, 12) + '…';
  } catch (e) { out.textContent = '// ' + e.message; }
}

async function openReceipt(id) {
  clearTimeout(rcTimer);
  const L = await (await fetch('/api/launch/' + id, { cache: 'no-store' })).json(); if (L.error) return;
  const box = $('#receipt'); box.hidden = false;
  const now = Date.now() / 1000;
  const lines = [`"launch": "$${L.ticker} · ${L.name}",`, `"id": "${L.id}",`, `"status": "${L.status}",`, `"mode": "${L.live ? 'live' : 'paper'}",`,
    `"window": "${fmtT(L.window_start)} → ${fmtT(L.window_start + L.window_seconds)}",`];
  if (L.live) {
    lines.push(`"creator": "${L.creator}",`, `"rounds": "#${L.first_round} → #${L.last_round}",`);
    if (L.fire) lines.push(`"fired_by_round": ${L.fire.round}, <i>// ${L.fire.rule}</i>`, `"fired_at": "${fmtT(L.fire.time)}",`, `"randomness": "${L.fire.randomness}",`);
    if (L.onchain) lines.push(`"mint": "${L.onchain.mint}",`, `"tx": "${L.onchain.sig}",`, `"landed": "${L.onchain.seconds_after_fire}s after the beacon fired",`);
    if (L.dev_buy_sol) lines.push(`"creator_first_buy_sol": ${L.dev_buy_sol},`);
  } else {
    lines.push(`"decided_by_round": ${L.timing ? L.timing.round : `"first round at or after #${L.decision_round_target}"`},`);
    if (L.timing) lines.push(`"randomness": "${L.timing.randomness}",`, `"offset": ${L.timing.offset_seconds}, <i>// ${L.timing.formula}</i>`, `"launch_second": "${fmtT(L.timing.launch_at)}",`);
  }
  if (L.raffle) lines.push(`"raffle_entrants": ${L.signups.length},`);
  if (L.raffle_result) lines.push(`"raffle_round": ${L.raffle_result.round},`, `"winner": "${L.raffle_result.winner}", <i>// ${L.raffle_result.formula}</i>`);
  if (L.note) lines.push(`<i>// ${L.note}</i>`);
  let extra = '';
  if (L.raffle && now < L.window_start) extra += `<div class="vrow"><label>wallet <input id="sw" placeholder="your solana address" style="width:30ch"></label><button class="btn" id="sbtn">join raffle</button><span class="err" id="serr"></span></div>`;
  if (L.live && ['scheduled', 'armed', 'fired'].includes(L.status)) extra += `<div class="vrow"><span class="dim">${L.status === 'fired' ? 'creator: approve in your wallet' : 'creator: keep this page open. your wallet pops up within ~3s of the beacon firing; you then have 2 minutes to approve'}</span><button class="btn ghost wallet-btn">${wallet ? wallet.slice(0, 4) + '…' + wallet.slice(-4) : 'connect wallet'}</button></div><pre class="rc" id="lout"></pre>`;
  if (L.live && L.status === 'live' && L.raffle_result) extra += `<div class="vrow"><span class="dim">raffle winner: buy first from here (your wallet signs and pays)</span><label>sol <input id="wbsol" value="0.1" style="width:6ch"></label><button class="btn ghost wallet-btn">${wallet ? wallet.slice(0, 4) + '…' : 'connect wallet'}</button><button class="btn" id="wbbtn">buy</button></div><pre class="rc" id="wbout"></pre>`;
  const keepOut = $('#lout')?.textContent;
  box.innerHTML = `<div class="ptitle"><span>┌─ entropy receipt</span><span class="dim">${now < L.window_start ? 'window opens in ' + Math.ceil(L.window_start - now) + 's' : ''}</span></div><pre class="rc">{\n  ${lines.join('\n  ')}\n}</pre>${extra}` +
    (L.onchain ? `<div class="pfoot"><a href="${L.onchain.pump}" target="_blank" rel="noopener">open on pump.fun →</a><a href="#verify/${L.fire.round}">verify round ${L.fire.round} →</a></div>` : L.fire ? `<div class="pfoot"><span>fired by round ${L.fire.round}</span><a href="#verify/${L.fire.round}">verify →</a></div>` : L.timing ? `<div class="pfoot"><span>re-run: sha256(randomness + "|launch|${L.id}") mod ${L.window_seconds}</span><a href="#verify/${L.timing.round}">verify round ${L.timing.round} →</a></div>` : '');
  if (keepOut && $('#lout')) $('#lout').textContent = keepOut;
  const sb = $('#sbtn'); if (sb) sb.onclick = async () => { const r = await post({ action: 'signup', id, wallet: $('#sw').value.trim() }); if (r.error) $('#serr').textContent = r.error; else openReceipt(id); };
  const wb = $('#wbbtn'); if (wb) wb.onclick = async () => { if (!wallet) await connectWallet(); winnerBuy(L, $('#wbout')); };
  if (L.live && L.status === 'fired' && wallet === L.creator && !L.sig) {
    if (!attempted.has(L.id)) { attempted.add(L.id); creatorLaunch(L, $('#lout')); }
    else if (!launching && $('#lout') && !$('#lretry')) { const b = document.createElement('button'); b.className = 'btn'; b.id = 'lretry'; b.textContent = 'sign the launch again'; b.style.margin = '0 14px 14px'; b.onclick = () => creatorLaunch(L, $('#lout')); $('#lout').after(b); }
  }
  const done = ['launched-paper', 'live', 'missed'].includes(L.status);
  if (!done) rcTimer = setTimeout(() => { if (location.hash === '#launches/' + id && !document.activeElement?.matches('#sw,#wbsol')) openReceipt(id); }, L.status === 'armed' || L.status === 'fired' ? 2500 : 5000);
}
async function fileToDataUrl(f) {
  if (!f) return '';
  if (f.size > 1_000_000) throw new Error('Image must be under 1 MB.');
  return new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(f); });
}
$('#lform').onsubmit = async (e) => {
  e.preventDefault(); $('#lerr').textContent = '';
  try {
    const f = new FormData(e.target); const b = Object.fromEntries(f); b.raffle = f.get('raffle') === 'on'; delete b.image;
    if (LIVE) {
      b.creator = wallet || await connectWallet();
      b.image = await fileToDataUrl(f.get('image')?.size ? f.get('image') : null);
      if (!b.image) throw new Error('Add an image for your coin.');
      $('#lerr').textContent = 'uploading metadata to ipfs…';
    }
    const r = await post(b);
    if (r.error) throw new Error(r.error);
    e.target.reset(); $('#lerr').textContent = ''; location.hash = '#launches/' + r.id;
  } catch (x) { $('#lerr').textContent = x.message; }
};

/* ---------- api tab ---------- */
async function loadApi() { try { const r = await (await fetch('/api/round/latest')).json(); $('#apilive').textContent = JSON.stringify(r, null, 2); } catch {} }

showTab();
const vh = location.hash.match(/^#verify\/(\d+)/); if (vh) runVerify(vh[1]);
addEventListener('hashchange', () => { const m = location.hash.match(/^#verify\/(\d+)/); if (m) runVerify(m[1]); });
document.querySelector('.file input')?.addEventListener('change', (e) => { const f = e.target.files[0]; e.target.nextElementSibling.textContent = f ? f.name.slice(0, 24) : 'choose file'; });
