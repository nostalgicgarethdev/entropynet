# entropynet beacon spec v1

Base URL: `https://entropynet.space` (API under `/api`).

## Timing
- `PERIOD = 3` seconds, `GENESIS = 1792612800` (unix seconds).
- Round number by clock: `floor((now - GENESIS) / 3)`. Round time: `GENESIS + 3n`.

## Nodes (commit-reveal)
- Nodes: `n1-cpt n2-fra n3-iad n4-sin n5-gru` (run by the operator in v1).
- `reveal_i,n` is 32 bytes. `commit_i,n = sha256(reveal_i,n)`.
- Round n publishes `next_commits` for round n+1, so a node can't change its secret after seeing the others.

## Output
```
mix        = sha256(reveal_1 || ... || reveal_5)                     (raw bytes)
message    = "entropynet/v1|round|prev_round|prev_randomness|mix|slot|blockhash|time"
randomness = sha256(message)
signature  = ed25519(message + "|" + randomness)
```
- `slot` and `blockhash` come from a finalized Solana mainnet block taken when the round is produced.
- `prev_round` / `prev_randomness` point at the previous published round (-1 / zeros for genesis).

## Publication
Rounds are produced on demand when the beacon is read, and are stored once and never overwritten. If nobody reads the beacon for a while, the gap is recorded in `skipped` and the next round links to the last one that was published. Commits are only pre-published for back-to-back rounds.

## Verifying a round
1. `sha256(reveal) == commit` for every node.
2. If `prev_round == round - 1`: commits equal the previous round's `next_commits`.
3. Recompute `mix`, `message`, `randomness`.
4. Check the ed25519 `signature` against the published key.
5. `prev_randomness` equals the previous round's `randomness`.
6. Optional: `getBlock(slot).blockhash == blockhash` on any Solana RPC.

## Fair launches
- Inputs: `window_start`, `window_seconds`, `raffle`.
- Raffle signups close at `window_start`.
- Decision round: the first published round at or after `round_at(window_start) + 1`.
- `offset = sha256(randomness + "|launch|" + id) mod window_seconds`, `launch_at = window_start + offset`.
- Raffle round: the first published round at or after `round_at(launch_at)`.
- `winner = signups[sha256(randomness + "|raffle|" + id) mod entrants]`.

## Seal (entropynet-seal/v1)
```
files      = { "/path": sha256(bytes) }        (all files except /seal/release.json)
files_root = sha256( for each path sorted: path + " " + hash + "\n" )
id         = sha256( spec \n files_root \n round \n randomness \n created \n prev )
signature  = ed25519( "entropynet-seal/v1:" + id )   by a key in seal.policy.json
memo       = "entropynet-seal/v1 release=<id> files=<root> round=<n> uri=<uri>"
```
- Valid release: root and id recompute, and at least `threshold` distinct policy keys signed.
- Update: accepted only if valid and `created` is newer than the pinned release. Older → `rollback` report.
- Beacon chaining: once `/api/seal` accepts a release, each later round's message gets `|seal:<id>` appended (before signing).
- Verifier: checks every same-origin GET except `/api/*`, `/sw.js`, `/seal/release.json`. Unknown documents/scripts/styles/workers are blocked.
- Tamper evidence: JSON signed with a per-browser ECDSA P-256 key (P1363 signature, raw public key), `POST /api/tamper`. Proves integrity of the report, not the identity of the sender.
