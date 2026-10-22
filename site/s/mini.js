// sealed mini-site renderer. Fetches /api/site?slug=, rebuilds the signed message and checks the creator's
// ed25519 wallet signature in the browser before rendering anything. Links are only https.
(async () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(() => {});
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const FIELDS = ['slug', 'mint', 'name', 'ticker', 'about', 'x', 'telegram', 'website', 'creator', 'created'];
  const A58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  const b58 = (s) => { let n = 0n; for (const c of s) n = n * 58n + BigInt(A58.indexOf(c)); return Uint8Array.from(n.toString(16).padStart(64, '0').match(/../g).map(x => parseInt(x, 16))); };
  const unhex = (h) => Uint8Array.from(h.match(/../g).map(x => parseInt(x, 16)));
  const slug = location.pathname.split('/')[2] || '';
  const out = $('#mout');
  let d; try { const r = await fetch('/api/site?slug=' + encodeURIComponent(slug), { cache: 'no-store' }); d = await r.json(); if (!r.ok) throw new Error(d.error); }
  catch (e) { out.innerHTML = `<span class="mk-bad">[!]</span> ${esc(e.message || 'no sealed page here')}\n\n<a href="/#check">→ make one</a>`; return; }
  const msg = 'entropynet-site/v1\n' + FIELDS.map(k => `${k}=${d[k] ?? ''}`).join('\n');
  let ok = false;
  try { const k = await crypto.subtle.importKey('raw', b58(d.creator), { name: 'Ed25519' }, false, ['verify']); ok = await crypto.subtle.verify({ name: 'Ed25519' }, k, unhex(d.signature), new TextEncoder().encode(msg)); } catch { ok = null; }
  const safe = (u) => /^https:\/\//.test(u || '') ? u : '';
  const link = (k, u) => safe(u) ? `\n${k.padEnd(10)} <a href="${esc(u)}" target="_blank" rel="noopener nofollow">${esc(u)}</a>` : '';
  document.title = `${d.name}${d.ticker ? ' $' + d.ticker : ''} · sealed page`;
  $('#mt').textContent = `┌─ ${d.name}${d.ticker ? ' · $' + d.ticker : ''} · sealed page`;
  if (ok === false) { out.innerHTML = `<span class="mk-bad">[!] NOT SEALED</span>  creator signature does not match. do not trust this page.`; return; }
  const rec = d.record ? `<a href="https://explorer.solana.com/tx/${esc(d.record.tx)}${d.record.cluster === 'devnet' ? '?cluster=devnet' : ''}" target="_blank" rel="noopener">${esc(d.record.cluster)} ${esc(d.record.tx.slice(0, 16))}…</a>` : '<span class="dim">not recorded on-chain yet</span>';
  out.innerHTML = `<span class="dim">visitor@entropynet.space:~/s/${esc(slug)}$</span> cat coin.txt

${esc(d.name)}${d.ticker ? '  $' + esc(d.ticker) : ''}
${d.about ? esc(d.about) + '\n' : ''}
ca         <b>${esc(d.mint)}</b> <button class="btn ghost" id="cpy">copy</button>
buy        <a href="https://pump.fun/coin/${esc(d.mint)}" target="_blank" rel="noopener">pump.fun</a> · <a href="https://jup.ag/swap/SOL-${esc(d.mint)}" target="_blank" rel="noopener">jupiter</a> · <a href="https://dexscreener.com/solana/${esc(d.mint)}" target="_blank" rel="noopener">chart</a>${link('x', d.x)}${link('telegram', d.telegram)}${link('website', d.website)}

${ok ? '<span class="mk-ok">[OK]</span>' : '<span class="mk-warn">[warn]</span>'}  creator   ${esc(d.creator)} ${ok ? 'signed this content' : '(this browser cannot check ed25519)'}
<span class="mk-ok">[OK]</span>  code      sealed 2-of-3 in entropynet release ${esc((d.template_release || '').slice(0, 16))}…
[*]   record    ${rec}`;
  const c = $('#cpy'); if (c) c.onclick = () => navigator.clipboard.writeText(d.mint).then(() => c.textContent = 'copied');
})();
