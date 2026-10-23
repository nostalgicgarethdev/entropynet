const CFG = window.ENTROPY_CONFIG || {};
const $ = (s) => document.querySelector(s);
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = (h) => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const sha = async (data) => hex(await crypto.subtle.digest('SHA-256', typeof data === 'string' ? enc.encode(data) : data));
const PERIOD = 3, GENESIS = 1792612800;
const WM = ["██████╗ ██╗  ██╗██████╗ ███╗   ██╗███████╗████████╗", "██╔══██╗██║  ██║██╔══██╗████╗  ██║██╔════╝╚══██╔══╝", "██████╔╝███████║██████╔╝██╔██╗ ██║█████╗     ██║   ", "██╔═══╝ ██╔══██║██╔═══╝ ██║╚██╗██║██╔══╝     ██║   ", "██║     ██║  ██║██║     ██║ ╚████║███████╗   ██║   ", "╚═╝     ╚═╝  ╚═╝╚═╝     ╚═╝  ╚═══╝╚══════╝   ╚═╝   "];

/* ---------- CA strip ---------- */
document.querySelectorAll('.cacopy').forEach(b => { const ca = b.dataset.ca || CFG.ca; if (!ca) return; b.disabled = false;
  b.onclick = async () => { try { await navigator.clipboard.writeText(ca); } catch { const t = document.createElement('textarea'); t.value = ca; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); } b.textContent = 'copied'; setTimeout(() => b.textContent = 'copy', 1400); }; });
$('#fkey').textContent = CFG.beaconPublicKey.slice(0, 16) + '…'; $('#apikey').textContent = CFG.beaconPublicKey;

/* ---------- tabs ---------- */
function showTab() {
  const t = (location.hash.slice(1) || 'seal').split('/')[0];
  document.querySelectorAll('.tab').forEach(s => s.hidden = s.id !== 'tab-' + t);
  document.querySelectorAll('#tabs a').forEach(a => { a.classList.toggle('on', a.dataset.tab === t); if (a.dataset.tab === t) a.scrollIntoView({ inline: 'nearest', block: 'nearest' }); });
  if (t === 'launches') loadBoard(location.hash.split('/')[1]);
  if (t === 'seal') loadFeed();
  if (t === 'api') loadApi();
}
addEventListener('hashchange', () => { showTab(); scrollTo(0, 0); });

/* ---------- wordmark ---------- */
function drawWordmark(seed) {
  let k = 0;
  const W = WM[0].length, P = 4, N = W + P * 2;
  const bar = (l, r, fill = '━') => { const mid = N - l.length - r.length; return l + fill.repeat(Math.max(0, mid)) + r; };
  const pad = (s, n) => s + ' '.repeat(Math.max(0, n - s.length));
  const sp = (c, t) => `<span class="${c}">${t}</span>`;
  const body = WM.map(line => [...line].map(ch => {
    if (ch === '█') { const v = parseInt(seed[(k++) % 64], 16); return v === 0 ? sp('a', '█') : '█'; }
    return ch === ' ' ? ch : sp('s', ch);
  }).join(''));
  const tag = '· s i g n   e v e r y t h i n g ·   t r u s t   n o   s e r v e r ·';
  const lt = Math.floor((N - tag.length) / 2);
  const head = '━━ ' + sp('k', 'entropynet/v1') + ' ';
  const headR = ' ' + sp('hl', '◆') + ' ' + sp('k', 'sealed front-ends') + ' ━━';
  const headLen = 3 + 13 + 1, headRLen = 3 + 17 + 3;
  const footL = '━━ ' + sp('k', 'est. oct 21 2026') + ' ', footR = ' ' + sp('k', '2-of-3 · solana mainnet') + ' ━━';
  const footLen = 3 + 16 + 1, footRLen = 1 + 23 + 3;
  const blank = '┃' + ' '.repeat(N) + '┃';
  $('#wordmark').innerHTML = [
    sp('f', '┏' + head) + sp('f', '━'.repeat(N - headLen - headRLen)) + sp('f', headR + '┓'),
    sp('f', blank),
    ...body.map(b => sp('f', '┃') + ' '.repeat(P) + b + ' '.repeat(P) + sp('f', '┃')),
    sp('f', blank),
    sp('f', '┃') + ' '.repeat(lt) + sp('k', tag) + ' '.repeat(N - lt - tag.length) + sp('f', '┃'),
    sp('f', '┗' + footL) + sp('f', '━'.repeat(N - footLen - footRLen)) + sp('f', footR + '┛'),
  ].join('\n');
}
drawWordmark('1'.repeat(64));

/* ---------- entropy field ---------- */
const RAMP = ' ·∙:÷+×*#▓';
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
const msgOf = (r) => ['entropynet/v1', r.round, r.prev_round, r.prev_randomness, r.mix, r.solana.slot, r.solana.blockhash, r.time].join('|') + (r.seal ? '|seal:' + r.seal : '');
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

/* wallet: the creator's own browser wallet signs and pays. PHPNET never holds a key. */
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
    (L.onchain ? `<div class="pfoot"><a href="${L.onchain.pump}" target="_blank" rel="noopener">open on pump.fun →</a><a href="#verify/${L.fire.round}">verify round ${L.fire.round} →</a><a href="#check/mkpage/${L.onchain.mint}/${encodeURIComponent(L.ticker || '')}/${encodeURIComponent(L.name || '')}">launch a sealed page →</a></div>` : L.fire ? `<div class="pfoot"><span>fired by round ${L.fire.round}</span><a href="#verify/${L.fire.round}">verify →</a></div>` : L.timing ? `<div class="pfoot"><span>re-run: sha256(randomness + "|launch|${L.id}") mod ${L.window_seconds}</span><a href="#verify/${L.timing.round}">verify round ${L.timing.round} →</a></div>` : '');
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

/* ---------- seal: verifier status, tamper test, tamper feed, seal-your-site ---------- */
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const short = (h, n = 10) => h ? h.slice(0, n) + '…' + h.slice(-6) : '-';
const ago = (ms) => { const s = Math.max(0, Math.round((Date.now() - ms) / 1000)); return s < 60 ? s + 's ago' : s < 3600 ? Math.round(s / 60) + 'm ago' : s < 86400 ? Math.round(s / 3600) + 'h ago' : Math.round(s / 86400) + 'd ago'; };
function renderSeal(m) {
  const st = m.state;
  if (!st) { $('#s-state').textContent = 'not yet'; $('#s-badge').textContent = 'no release'; $('#sealstatus').textContent = '// the verifier is installed but no signed release was found yet.'; return; }
  const sigOk = st.signers.length >= st.threshold;
  $('#s-state').textContent = sigOk ? 'verified' : 'NOT VERIFIED';
  $('#s-rel').textContent = st.id.slice(0, 10);
  $('#s-sig').textContent = `${st.signers.length} of ${st.policy.length} (need ${st.threshold})`;
  $('#s-badge').textContent = sigOk ? '[ok] verified in your browser' : '[!!] not verified';
  const tx = st.anchor && st.anchor.tx;
  const txl = tx ? `<a href="https://explorer.solana.com/tx/${tx}${st.anchor.cluster === 'devnet' ? '?cluster=devnet' : ''}" target="_blank" rel="noopener">${short(tx, 12)}</a>` : '-';
  const M = { ok: '<span class="mk-ok">[OK]</span>  ', warn: '<span class="mk-warn">[warn]</span>', star: '[*]  ', go: '[>]  ' };
  const anc = st.anchor_status || 'checking';
  $('#sealstatus').innerHTML = [
    `<span class="dim">visitor@phpnet.xyz:~</span> <span class="hl">[${sigOk ? 'sealed' : 'UNSEALED'}]</span>`,
    `<span class="dim">$</span> phpnet status`,
    ``,
    `${M.star} release     ${short(st.id, 16)}`,
    `${M.star} files root  ${short(st.files_root, 16)}`,
    `${M.star} files       ${st.files} pinned · ${new Date(st.created * 1000).toISOString().replace('T', ' ').slice(0, 16)} utc`,
    `${M.star} beacon      <a href="#verify/${st.beacon.round}">round ${st.beacon.round}</a>`,
    ``,
    `    ┌─ signers ${'─'.repeat(23)}┐`,
    ...st.policy.map(p => `    │ ${st.signers.includes(p) ? '<span class="mk-ok">[x]</span>' : '[ ]'} ${short(p, 10)}${' '.repeat(Math.max(1, 21 - short(p, 10).length))}${st.signers.includes(p) ? 'signed  ' : '—       '}│`),
    `    └${'─'.repeat(33)}┘`,
    ``,
    `${sigOk ? M.ok : '<span class="mk-bad">[FAIL]</span>'} threshold   ${st.signers.length} of ${st.policy.length}, need ${st.threshold}`,
    `${/confirmed/.test(anc) ? M.ok : M.warn} solana      ${txl} ${esc(anc)}`,
    `${st.first_visit ? M.warn : M.ok} trust       ${st.first_visit ? 'first visit · trust on first use (faq)' : 'pinned · updates need ' + st.threshold + ' sigs'}`,
    `${M.ok} verifier    checking every page, script, style`,
  ].join('\n');
}
const swOn = 'serviceWorker' in navigator;
if (swOn) {
  navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => { $('#s-state').textContent = 'unsupported here'; });
  navigator.serviceWorker.addEventListener('message', (e) => {
    if (e.data.type === 'status' && e.data.state !== undefined) renderSeal(e.data);
    if (e.data.type === 'status' && e.data.state === undefined) askSeal();
    if (e.data.type === 'tamper') loadFeed();
  });
  const askSeal = () => navigator.serviceWorker.ready.then(r => (navigator.serviceWorker.controller || r.active).postMessage({ type: 'status' }));
  askSeal(); setInterval(askSeal, 20000);
  navigator.serviceWorker.addEventListener('controllerchange', askSeal);
} else { $('#s-state').textContent = 'unsupported here'; $('#sealstatus').textContent = '// this browser has no service workers, so it cannot check the seal.'; }

$('#ttest').onclick = async () => {
  const out = $('#tout');
  if (!navigator.serviceWorker?.controller) { out.textContent = '// the verifier is still starting. reload once, then try again.'; return; }
  out.textContent = '> loading /tamper-test/wallet-widget.js …';
  // Load it in a hidden frame so only the frame gets the block screen, not this page.
  const f = document.createElement('iframe'); f.style.cssText = 'width:100%;height:340px;border:1px solid var(--line);margin-top:8px;background:#17171a';
  f.src = '/tamper-test/?t=' + Date.now();
  out.innerHTML = '<span class="dim">$</span> phpnet tamper-test\n[*]   target   /tamper-test/wallet-widget.js\n[arm ] server   swapped in a fake "drainer" (harmless)\n[>]   fetch    frame requests the widget…';
  out.after(f); f.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  $('#ttest').disabled = true; setTimeout(() => { $('#ttest').disabled = false; loadFeed(); }, 2500);
  setTimeout(() => { try { const w = f.contentWindow.__entropynetWidget; out.innerHTML += w && /FAKE/.test(w) ? '\n<span class="mk-bad">[fire]</span>  ran      the fake script ran. seal NOT active.' : w ? '\n<span class="mk-warn">[warn]</span>  served   the sealed widget, no swap seen' : '\n[fire]  hash     sha256 ≠ sealed hash\n<span class="mk-ok">[OK]</span>    blocked  never ran · reported to the tamper feed'; } catch { out.innerHTML += '\n<span class="mk-ok">[OK]</span>    blocked  see the block screen below'; } }, 1800);
};

async function loadFeed() {
  try {
    const j = await (await fetch('/api/tamper')).json();
    $('#tcount').textContent = j.items.length ? `(${j.items.length} reports)` : '';
    $('#tfeed').innerHTML = j.items.length ? j.items.slice(0, 15).map(t =>
      `${ago(t.received * 1000).padStart(8)}  ${t.test ? '[test]' : '[ALERT]'} ${esc(t.kind)} ${esc(t.path)}  want ${short(t.expected, 8)} got ${short(t.got, 8)}  <a href="/api/tamper/${t.id}" target="_blank">evidence</a>`).join('\n')
      : '// no tamper reports. press the tamper test to make one.';
  } catch { $('#tfeed').textContent = '// feed unavailable'; }
}

$('#sdir').onchange = async (e) => {
  const fl = [...e.target.files]; if (!fl.length) return;
  const out = $('#sout'); out.textContent = `hashing ${fl.length} files…`;
  const hx = (b) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  const files = {};
  for (const f of fl) { const p = '/' + f.webkitRelativePath.split('/').slice(1).join('/'); if (p.split('/').some(s => s.startsWith('.'))) continue; files[p] = hx(await crypto.subtle.digest('SHA-256', await f.arrayBuffer())); }
  const lines = Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, h]) => `${p} ${h}\n`).join('');
  const root = hx(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(lines)));
  out.textContent = `files root  ${root}\nfiles       ${Object.keys(files).length}\n\n` + Object.entries(files).slice(0, 40).map(([p, h]) => `${h.slice(0, 16)}…  ${p}`).join('\n') + (Object.keys(files).length > 40 ? '\n…' : '') +
    `\n\nnext: run the same on your build machine and sign it.\nnpx entropynet seal ./dist  →  root should equal ${root.slice(0, 16)}…`;
};

/* ---------- check a site ---------- */
async function runCheck(u) {
  const out = $('#ckout'); if (!u) return;
  out.textContent = `$ phpnet check ${u}\n[*] fetching…`;
  try {
    const r = await (await fetch('/api/check?url=' + encodeURIComponent(u))).json();
    if (r.error) { out.innerHTML = `<span class="mk-bad">[!]</span> ${esc(r.error)}`; return; }
    const rows = (r.steps || []).map(s => `${s.ok ? '<span class="mk-ok">[OK]</span>' : '<span class="mk-bad">[!!]</span>'}  ${esc(s.k.padEnd(10))} ${esc(s.msg)}`).join('\n');
    const head = r.sealed ? '<span class="mk-ok">[*] SEALED</span>' : '<span class="mk-bad">[!] NOT SEALED</span>';
    const tx = r.anchor ? `\nrecord     <a href="https://explorer.solana.com/tx/${esc(r.anchor.tx)}${r.anchor.cluster === 'devnet' ? '?cluster=devnet' : ''}" target="_blank" rel="noopener">${esc(r.anchor.cluster)} tx ${esc(r.anchor.tx.slice(0, 16))}…</a>` : '';
    $('#mkbox').hidden = !!r.sealed;
    const RW = 46, rl = (t, plain) => '│ ' + t + ' '.repeat(Math.max(1, RW - 1 - plain.length)) + '│';
    const rsn = String(r.reason || '').slice(0, RW - 3), rel = r.release ? 'release ' + r.release.slice(0, 24) + '…' : '';
    const chk = 'checked ' + String(r.checked_at || '').replace('T', ' ').slice(0, 19) + (r.cached ? ' (cached)' : '');
    const hp = r.sealed ? '[*] SEALED' : '[!] NOT SEALED';
    out.innerHTML = `<span class="dim">$</span> phpnet check ${esc(r.origin || r.input || u)}\n${rows}\n\n` + [
      '╭─ receipt ' + '─'.repeat(RW - 10) + '╮',
      rl(head, hp), rl(esc(rsn), rsn), ...(rel ? [rl('<span class="dim">' + esc(rel) + '</span>', rel)] : []),
      rl('<span class="dim">' + esc(chk) + '</span>', chk),
      '╰' + '─'.repeat(RW - 13) + ' phpnet ─╯'].join('\n') + tx;
  } catch { out.innerHTML = '<span class="mk-bad">[!]</span> check failed, try again'; }
}
$('#ckform').addEventListener('submit', e => { e.preventDefault(); const u = $('#ckurl').value.trim(); location.hash = '#check/' + encodeURIComponent(u); });
$('#ckdemo').addEventListener('click', () => { $('#ckurl').value = 'https://phpnet.xyz'; location.hash = '#check/' + encodeURIComponent('https://phpnet.xyz'); });
const ckFromHash = () => { const k = location.hash.match(/^#check\/mkpage\/([^/]+)\/?([^/]*)\/?(.*)$/); if (k) { $('#mkbox').hidden = false; const f = $('#mkform'); f.mint.value = k[1]; f.ticker.value = decodeURIComponent(k[2] || ''); f.name.value = decodeURIComponent(k[3] || ''); f.slug.value ||= (decodeURIComponent(k[2] || '') || k[1].slice(0, 8)).toLowerCase().replace(/[^a-z0-9-]/g, ''); return; } const m = location.hash.match(/^#check\/(.+)/); if (m) { const u = decodeURIComponent(m[1]); $('#ckurl').value = u; runCheck(u); } };
ckFromHash(); addEventListener('hashchange', ckFromHash);

/* ---------- launch a sealed page: creator wallet signs the content; code is our sealed template ---------- */
const SITE_FIELDS = ['slug', 'mint', 'name', 'ticker', 'about', 'x', 'telegram', 'website', 'creator', 'created'];
const siteMsg = (d) => 'entropynet-site/v1\n' + SITE_FIELDS.map(k => `${k}=${d[k] ?? ''}`).join('\n');
let lastPage = null;
$('#mkform').addEventListener('submit', async (e) => {
  e.preventDefault(); const o = $('#mkout'); const f = e.target;
  try {
    const creator = wallet || await connectWallet();
    const d = { created: Math.floor(Date.now() / 1000), creator };
    for (const k of ['slug', 'mint', 'name', 'ticker', 'about', 'x', 'telegram', 'website']) d[k] = f[k].value.trim();
    d.slug = d.slug.toLowerCase();
    if (!f.ok.checked) throw new Error('tick the confirm box first');
    o.textContent = '[*] sign the page content in your wallet (a message, not a transaction, no SOL)…';
    const sig = await provider().signMessage(new TextEncoder().encode(siteMsg(d)), 'utf8');
    const bytes = sig.signature || sig; const hex = [...bytes].map(x => x.toString(16).padStart(2, '0')).join('');
    const r = await (await fetch('/api/site', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...d, signature: hex }) })).json();
    if (!r.ok) throw new Error(r.error);
    lastPage = r.page;
    o.innerHTML = `<span class="mk-ok">[OK]</span>  page   <a href="/s/${esc(d.slug)}" target="_blank">phpnet.xyz/s/${esc(d.slug)}</a>\n<span class="mk-ok">[OK]</span>  code   sealed 2-of-3 (entropynet release)\n<span class="mk-ok">[OK]</span>  content signed by ${esc(creator.slice(0, 4))}…${esc(creator.slice(-4))}\n[*]   optional: record it on solana (${esc(r.page.cluster)}), your wallet pays the ~0.000005 SOL fee <button class="btn ghost" id="mkrec">record</button>`;
    $('#mkrec').onclick = () => recordPage(lastPage).catch(x => o.innerHTML += `\n<span class="mk-bad">[!]</span> ${esc(x.message)}`);
  } catch (x) { o.innerHTML = `<span class="mk-bad">[!]</span> ${esc(x.message || x)}`; }
});
async function recordPage(p) {
  const o = $('#mkout'); const cl = p.cluster === 'devnet' ? 'devnet' : 'mainnet';
  const rpc = (m, params) => fetch('/api/relay?cluster=' + cl, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: m, params }) }).then(r => r.json());
  const w3 = await web3();
  const bh = (await rpc('getLatestBlockhash', [{ commitment: 'confirmed' }])).result.value.blockhash;
  const memo = `entropynet-site/v1 slug=${p.slug} sha=${p.message_sha256}`;
  const prog = cl === 'devnet' ? 'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo' : 'MemoSq4gqABAXKb96qnH8TyNmLxPf8YNXqU1zWvkeNA';
  const payer = new w3.PublicKey(p.creator);
  const msg = new w3.TransactionMessage({ payerKey: payer, recentBlockhash: bh, instructions: [new w3.TransactionInstruction({ programId: new w3.PublicKey(prog), keys: [{ pubkey: payer, isSigner: true, isWritable: false }], data: new TextEncoder().encode(memo) })] }).compileToV0Message();
  const signed = await walletSign(bytesToB64(new w3.VersionedTransaction(msg).serialize()));
  o.innerHTML += '\n[*]   sending…';
  const s = await rpc('sendTransaction', [signed, { encoding: 'base64' }]); if (!s.result) throw new Error(s.error?.message || 'send failed');
  const r = await (await fetch('/api/site', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'record', slug: p.slug, tx: s.result }) })).json();
  if (!r.ok) throw new Error(r.error);
  o.innerHTML += `\n<span class="mk-ok">[OK]</span>  record <a href="https://explorer.solana.com/tx/${esc(s.result)}${cl === 'devnet' ? '?cluster=devnet' : ''}" target="_blank" rel="noopener">${esc(s.result.slice(0, 16))}…</a>`;
}
