// Live pump.fun launch helpers. No server-held wallet: every transaction built here is unsigned.
// The creator's (or raffle winner's) own wallet signs and pays in the browser. The server never signs.
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const sdk = () => req('@pump-fun/pump-sdk');
const BN = () => req('bn.js');
let _w3; export const w3 = async () => (_w3 ||= await import('@solana/web3.js'));

export const PUMP_PROGRAM = '6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P';
const CU = 250_000, PRIORITY = 200_000; // micro-lamports per CU
export async function connection() {
  const { Connection } = await w3();
  const env = (process.env.SOLANA_RPC || '').trim();
  return new Connection(/^https:\/\/\S+$/.test(env) ? env : 'https://api.mainnet-beta.solana.com', 'confirmed');
}
export async function isPubkey(s) { if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s || '')) return false; try { const { PublicKey } = await w3(); new PublicKey(s); return true; } catch { return false; } }

// Metadata + image to IPFS through pump.fun's own endpoint. Returns metadataUri.
export async function uploadMetadata({ name, symbol, description, imageDataUrl, twitter, website }) {
  const m = /^data:(image\/(png|jpeg|gif|webp));base64,(.+)$/.exec(imageDataUrl || '');
  if (!m) throw new Error('Add a png, jpg, gif or webp image.');
  const bytes = Buffer.from(m[3], 'base64');
  if (bytes.length > 1_000_000) throw new Error('Image must be under 1 MB.');
  const fd = new FormData();
  fd.append('file', new Blob([bytes], { type: m[1] }), 'image.' + (m[2] === 'jpeg' ? 'jpg' : m[2]));
  fd.append('name', name); fd.append('symbol', symbol); fd.append('description', description || `${name}, launched fair with entropynet.`);
  if (twitter) fd.append('twitter', twitter);
  fd.append('website', website || 'https://entropynet.space'); fd.append('showName', 'true');
  const r = await fetch('https://pump.fun/api/ipfs', { method: 'POST', body: fd });
  if (!r.ok) throw new Error('pump.fun metadata upload failed (' + r.status + '). Try again.');
  const j = await r.json(); if (!j.metadataUri) throw new Error('pump.fun returned no metadata URI.');
  return j.metadataUri;
}

async function v0(payer, ixs) {
  const { PublicKey, TransactionMessage, VersionedTransaction, ComputeBudgetProgram } = await w3();
  const c = await connection();
  const { blockhash, lastValidBlockHeight } = await c.getLatestBlockhash('confirmed');
  const msg = new TransactionMessage({ payerKey: new PublicKey(payer), recentBlockhash: blockhash,
    instructions: [ComputeBudgetProgram.setComputeUnitLimit({ units: CU }), ComputeBudgetProgram.setComputeUnitPrice({ microLamports: PRIORITY }), ...ixs] }).compileToV0Message();
  return { tx: new VersionedTransaction(msg), lastValidBlockHeight };
}

// create_v2 (SOL quote). creator = user = fee payer = the creator's wallet. The mint keypair is generated in the creator's browser.
// devBuySol > 0 adds the creator's own first buy in the same transaction (still signed and paid by the creator).
export async function buildCreate({ creator, mint, name, symbol, uri, devBuySol = 0 }) {
  const { PublicKey } = await w3(); const s = sdk(); const bn = BN();
  const c = await connection();
  const creatorPk = new PublicKey(creator), mintPk = new PublicKey(mint);
  let ixs;
  if (devBuySol > 0) {
    const online = new s.OnlinePumpSdk(c);
    const global = await online.fetchGlobal(); const feeConfig = await online.fetchFeeConfig().catch(() => null);
    const solAmount = new bn(Math.round(devBuySol * 1e9));
    const amount = s.getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: null, bondingCurve: null, amount: solAmount });
    ixs = await s.PUMP_SDK.createV2AndBuyInstructions({ global, mint: mintPk, name, symbol, uri, creator: creatorPk, user: creatorPk, amount, solAmount, mayhemMode: false });
  } else {
    ixs = [await s.PUMP_SDK.createV2Instruction({ mint: mintPk, name, symbol, uri, creator: creatorPk, user: creatorPk, mayhemMode: false })];
  }
  return v0(creator, ixs);
}

// The raffle winner's own buy, signed and paid by the winner.
export async function buildBuy({ user, mint, sol, slippage = 15 }) {
  const { PublicKey } = await w3(); const s = sdk(); const bn = BN();
  const c = await connection(); const online = new s.OnlinePumpSdk(c);
  const mintPk = new PublicKey(mint), userPk = new PublicKey(user);
  const global = await online.fetchGlobal(); const feeConfig = await online.fetchFeeConfig().catch(() => null);
  const mintInfo = await c.getAccountInfo(mintPk);
  if (!mintInfo) throw new Error('That coin is not on chain yet.');
  const tokenProgram = mintInfo.owner;
  const st = await online.fetchBuyState(mintPk, userPk, tokenProgram);
  if (st.quoteMint.toBase58() !== 'So11111111111111111111111111111111111111112') throw new Error('This coin is not quoted in SOL.');
  if (st.bondingCurve.complete) throw new Error('This coin has left the bonding curve. Buy it on pump.fun.');
  const solAmount = new bn(Math.round(sol * 1e9));
  const amount = s.getBuyTokenAmountFromSolAmount({ global, feeConfig, mintSupply: st.bondingCurve.tokenTotalSupply, bondingCurve: st.bondingCurve, amount: solAmount });
  const ixs = await s.PUMP_SDK.buyInstructions({ global, ...st, mint: mintPk, user: userPk, amount, solAmount, slippage, tokenProgram });
  return v0(user, ixs);
}

export async function simulate(tx) {
  const c = await connection();
  const r = await c.simulateTransaction(tx, { sigVerify: false, replaceRecentBlockhash: true });
  return { err: r.value.err, units: r.value.unitsConsumed ?? null, logs: (r.value.logs || []).slice(-12) };
}
export const b64 = (tx) => Buffer.from(tx.serialize()).toString('base64');

// Relay a tx the user already signed in their wallet. Checks the fee payer is who we expect first.
export async function relay(b64tx, expectPayer, mustInclude) {
  const { VersionedTransaction } = await w3();
  const tx = VersionedTransaction.deserialize(Buffer.from(b64tx, 'base64'));
  const payer = tx.message.staticAccountKeys[0].toBase58();
  if (payer !== expectPayer) throw new Error('This transaction is not paid by the expected wallet.');
  if (mustInclude && !tx.message.staticAccountKeys.some(k => k.toBase58() === mustInclude)) throw new Error('This transaction is not for this coin.');
  const c = await connection();
  return c.sendRawTransaction(tx.serialize(), { skipPreflight: false, maxRetries: 3 });
}

// Verify on chain that `sig` is a successful pump.fun create of `mint`, paid by `creator`.
export async function verifyCreate(sig, mint, creator) {
  const c = await connection();
  const t = await c.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
  if (!t) return { ok: false, pending: true };
  if (t.meta?.err) return { ok: false, error: 'transaction failed on chain' };
  const keys = t.transaction.message.staticAccountKeys.map(k => k.toBase58());
  const ok = keys[0] === creator && keys.includes(mint) && keys.includes(PUMP_PROGRAM);
  return { ok, slot: t.slot, blockTime: t.blockTime, error: ok ? null : 'not a pump.fun create of this mint by the creator' };
}
