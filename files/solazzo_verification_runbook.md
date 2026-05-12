# Solazzo Verification Runbook (Localnet + Devnet)

This runbook is the repeatable checklist for proving core protocol behavior before release.

Primary goals:
- Verify claim flow works end-to-end.
- Verify displacement logic works when collection is full.
- Verify displaced principal is credited and withdrawable.
- Verify app/wallet/network alignment and error handling.

---

## 1) Network Truth Table

- `localnet` = your own validator at `http://127.0.0.1:8899` (best for full rehearsal).
- `devnet` = public development network (best for wallet UX and realistic frontend checks).
- `testnet` is not needed for this runbook.

Rule: app RPC, wallet network, and deployed program must point to the same chain.

---

## 2) Required Inputs

- Program ID in use: `3zYyfExhUGd8dh3wZZP285iwdjdnSphpqWks4x8L1gvy`
- Studio app: `make/` served at `http://localhost:3001`
- On-chain workspace: `onchain/`

---

## 3) Localnet Full Rehearsal (Authoritative)

Use this section to prove displacement + withdraw behavior.

### Step A — Reset validator

```bash
cd /Users/jonas/Repo/Solazzo
pkill -f solana-test-validator || true
solana-test-validator --reset
```

Expected: validator shows RPC at `http://127.0.0.1:8899`.

### Step B — Deploy and initialize protocol

In a new terminal:

```bash
cd /Users/jonas/Repo/Solazzo/onchain
anchor deploy
```

Then initialize protocol:

```bash
cd /Users/jonas/Repo/Solazzo/onchain
ANCHOR_WALLET="$HOME/.config/solana/id.json" node -e "const anchor=require('@coral-xyz/anchor'); const {PublicKey,SystemProgram}=require('@solana/web3.js'); const idl=require('./target/idl/solazzo_core.json'); (async()=>{ const provider=anchor.AnchorProvider.local('http://127.0.0.1:8899'); anchor.setProvider(provider); const program=new anchor.Program(idl, provider); const pid=program.programId; const admin=provider.wallet.publicKey; const [protocolConfig]=PublicKey.findProgramAddressSync([Buffer.from('protocol_config')], pid); const [vault]=PublicKey.findProgramAddressSync([Buffer.from('vault')], pid); const [slotBook]=PublicKey.findProgramAddressSync([Buffer.from('slot_book')], pid); const params={ adminMultisig: admin, treasuryAccount: admin, oracleFeedPubkey: admin, slotCount:1000, minLockLamports:new anchor.BN(1_000_000_000), minIncrementLamports:new anchor.BN(1_000_000_000), displacementFeeLamports:new anchor.BN(100_000_000), oracleMaxStalenessSec:90, oracleMaxConfBps:100, settleThresholdPriceE8:new anchor.BN('100000000000'), settleWindowSec:3600, settleDeadlineTs:new anchor.BN('1899849600')}; const sig=await program.methods.initializeProtocol(params).accounts({ admin, protocolConfig, vault, slotBook, systemProgram:SystemProgram.programId }).rpc(); console.log(sig); })().catch(e=>{console.error(e); process.exit(1);});"
```

Expected: tx signature printed, no error.

### Step C — Start make app against localnet

In `make/`:

```bash
cd /Users/jonas/Repo/Solazzo/make
NEXT_PUBLIC_SOLANA_RPC_URL=http://127.0.0.1:8899 SOLANA_RPC_URL=http://127.0.0.1:8899 NEXT_PUBLIC_SOLAZZO_PROGRAM_ID=3zYyfExhUGd8dh3wZZP285iwdjdnSphpqWks4x8L1gvy npm run dev
```

Expected in UI: `App RPC network: localnet`.

### Step D — Fund test wallet

```bash
cd /Users/jonas/Repo/Solazzo
solana airdrop 20 <WALLET_PUBKEY> --url http://127.0.0.1:8899
solana balance <WALLET_PUBKEY> --url http://127.0.0.1:8899
```

Expected: balance >= 20 SOL.

### Step E — Browser claim (wallet-under-test)

In browser with wallet on local/localhost network:
- Open studio page.
- Generate portrait and claim with `1 SOL`.

Expected: claim tx succeeds; slot is occupied by that wallet.

### Step F — Initialize claimable account for test wallet

```bash
cd /Users/jonas/Repo/Solazzo/onchain
ANCHOR_WALLET="$HOME/.config/solana/id.json" node -e "const anchor=require('@coral-xyz/anchor'); const {PublicKey,SystemProgram}=require('@solana/web3.js'); const idl=require('./target/idl/solazzo_core.json'); (async()=>{ const provider=anchor.AnchorProvider.local('http://127.0.0.1:8899'); anchor.setProvider(provider); const program=new anchor.Program(idl, provider); const pid=new PublicKey('3zYyfExhUGd8dh3wZZP285iwdjdnSphpqWks4x8L1gvy'); const owner=new PublicKey('<WALLET_PUBKEY>'); const [cb]=PublicKey.findProgramAddressSync([Buffer.from('claimable_balance'), owner.toBuffer()], pid); try{const sig=await program.methods.initClaimableBalance().accounts({ payer:provider.wallet.publicKey, owner, claimableBalance:cb, systemProgram:SystemProgram.programId }).rpc(); console.log(sig);}catch(e){console.log('already exists');} })().catch(e=>{console.error(e); process.exit(1);});"
```

Expected: created or `already exists`.

### Step G — Prefill remaining slots to 1000

Use CLI wallet for speed (any owner is fine for rehearsal):

```bash
cd /Users/jonas/Repo/Solazzo/onchain
ANCHOR_WALLET="$HOME/.config/solana/id.json" node -e "const anchor=require('@coral-xyz/anchor'); const {PublicKey,SystemProgram}=require('@solana/web3.js'); const idl=require('./target/idl/solazzo_core.json'); (async()=>{ const provider=anchor.AnchorProvider.local('http://127.0.0.1:8899'); anchor.setProvider(provider); const program=new anchor.Program(idl, provider); const pid=new PublicKey('3zYyfExhUGd8dh3wZZP285iwdjdnSphpqWks4x8L1gvy'); const [pc]=PublicKey.findProgramAddressSync([Buffer.from('protocol_config')], pid); const [vault]=PublicKey.findProgramAddressSync([Buffer.from('vault')], pid); const [slotBook]=PublicKey.findProgramAddressSync([Buffer.from('slot_book')], pid); const ONE=new anchor.BN(1_000_000_000); for(let i=0;i<1000;i++){ const b=Buffer.alloc(2); b.writeUInt16LE(i); const [slot]=PublicKey.findProgramAddressSync([Buffer.from('slot'),b], pid); try{ await program.methods.claimUnfilledSlot(i, ONE).accounts({ claimer:provider.wallet.publicKey, protocolConfig:pc, vault, slotBook, slot, systemProgram:SystemProgram.programId }).rpc(); }catch(_){} if(i%100===0) console.log('progress',i); } const cfg=await program.account.protocolConfig.fetch(pc); console.log('slotsFilled', cfg.slotsFilled.toString()); })().catch(e=>{console.error(e); process.exit(1);});"
```

Expected: `slotsFilled 1000`.

### Step H — Displace the wallet-under-test slot

Option 1 (UI): use a second wallet in browser and displace lowest.

Option 2 (CLI): force known displacement to credit test wallet:

```bash
cd /Users/jonas/Repo/Solazzo/onchain
ANCHOR_WALLET="$HOME/.config/solana/id.json" node -e "const anchor=require('@coral-xyz/anchor'); const {PublicKey,SystemProgram}=require('@solana/web3.js'); const idl=require('./target/idl/solazzo_core.json'); (async()=>{ const provider=anchor.AnchorProvider.local('http://127.0.0.1:8899'); anchor.setProvider(provider); const program=new anchor.Program(idl, provider); const pid=new PublicKey('3zYyfExhUGd8dh3wZZP285iwdjdnSphpqWks4x8L1gvy'); const displacedOwner=new PublicKey('<WALLET_PUBKEY>'); const [pc]=PublicKey.findProgramAddressSync([Buffer.from('protocol_config')], pid); const [slotBook]=PublicKey.findProgramAddressSync([Buffer.from('slot_book')], pid); const [vault]=PublicKey.findProgramAddressSync([Buffer.from('vault')], pid); const b=Buffer.alloc(2); b.writeUInt16LE(0); const [slot]=PublicKey.findProgramAddressSync([Buffer.from('slot'),b], pid); const [cb]=PublicKey.findProgramAddressSync([Buffer.from('claimable_balance'), displacedOwner.toBuffer()], pid); const before=await program.account.claimableBalance.fetch(cb); const sig=await program.methods.displaceLowest(0, new anchor.BN(1_000_000_000), new anchor.BN(2_000_000_000)).accounts({ challenger:provider.wallet.publicKey, protocolConfig:pc, slotBook, vault, slot, treasury:provider.wallet.publicKey, claimableBalance:cb, systemProgram:SystemProgram.programId }).rpc(); const after=await program.account.claimableBalance.fetch(cb); console.log('tx', sig); console.log('before', before.claimableLamports.toString()); console.log('after', after.claimableLamports.toString()); })().catch(e=>{console.error(e); process.exit(1);});"
```

Expected: claimable increases by displaced principal (e.g., `+1 SOL`).

### Step I — Withdraw in browser (wallet-under-test)

With wallet-under-test connected:
- Open `/gallery`.
- Click `Withdraw`.
- Approve tx.

Expected: success toast/banner and no remaining claimable balance.

### Step J — Verify claimable is zero

```bash
cd /Users/jonas/Repo/Solazzo/onchain
ANCHOR_WALLET="$HOME/.config/solana/id.json" node -e "const anchor=require('@coral-xyz/anchor'); const {PublicKey}=require('@solana/web3.js'); const idl=require('./target/idl/solazzo_core.json'); (async()=>{ const provider=anchor.AnchorProvider.local('http://127.0.0.1:8899'); anchor.setProvider(provider); const program=new anchor.Program(idl, provider); const pid=new PublicKey('3zYyfExhUGd8dh3wZZP285iwdjdnSphpqWks4x8L1gvy'); const owner=new PublicKey('<WALLET_PUBKEY>'); const [cb]=PublicKey.findProgramAddressSync([Buffer.from('claimable_balance'), owner.toBuffer()], pid); const acct=await program.account.claimableBalance.fetch(cb); console.log('claimable_lamports', acct.claimableLamports.toString()); })().catch(e=>{console.error(e); process.exit(1);});"
```

Expected: `claimable_lamports 0`.

---

## 4) Devnet Verification (Product Sanity)

Use devnet for normal browser testing and wallet UX.

### Start app with devnet env

```bash
cd /Users/jonas/Repo/Solazzo/make
npm run dev
```

Expected in modal: `App RPC network: devnet`.

Checks:
- claim + publish should work.
- displacement should show `collection not full` until all 1000 slots are filled on devnet.
- no network-mismatch popup if wallet is also on devnet.

---

## 5) Common Failures and Fixes

- `Network mismatch` in wallet popup:
  - Align wallet network with app RPC network.
- `Program not found`:
  - wrong program deployment for that network, or wrong `NEXT_PUBLIC_SOLAZZO_PROGRAM_ID`.
- `Failed to fetch`:
  - bad RPC URL or local validator not running.
- `All slots must be filled before displacement`:
  - expected behavior until `slotsFilled == 1000`.
- `WalletSendTransactionError` generic:
  - inspect modal error mapping + console details; most cases are network mismatch.
- `Failed to load slot availability…` or `Slot availability is not initialized…`:
  - transient variant: RPC read failure — click "Refresh assignment", check RPC URL reachability.
  - uninitialized variant: SlotBook PDA does not exist on the connected network — verify program ID matches deployed program and that `initializeProtocol` has been run.

---

## 6) Evidence Logging

Record every rehearsal in:

- `files/solazzo_verification_evidence_log.md`

Minimum required evidence per run:

- environment + RPC + wallet + program ID,
- claim/displace/withdraw tx signatures,
- claimable before and after withdraw,
- PASS/FAIL outcome with follow-up owner for failures.

---

## 7) Exit Criteria

Runbook passes when all are true:
- Claim succeeds from browser wallet.
- Displacement credits displaced owner claimable balance.
- Withdraw succeeds and claimable returns to zero.
- No unresolved network mismatch or RPC alignment issues.

---

## 8) Release Smoke Flow (pre-deploy or post-deploy sanity)

A short, repeatable smoke for the claim → challenge → publish path. Most of it is automated; the wallet-signed final step requires a human + browser.

### 8.1 Preconditions

| Item | Expected value |
| --- | --- |
| Cluster | `https://api.devnet.solana.com` (production today; check `vercel env pull --environment=production`) |
| Program ID | `3zYyfExhUGd8dh3wZZP285iwdjdnSphpqWks4x8L1gvy` (devnet) |
| Bundled IDL `.address` (`make/src/lib/onchain/idl/solazzo_core.json`) | must equal the program ID |
| Vercel env `NEXT_PUBLIC_SOLAZZO_PROGRAM_ID` (make, all 3 tiers) | must equal the program ID |
| `PUBLISH_CHALLENGE_SECRET` | set, ≥ 32 chars, present in production env |
| Test wallet | devnet keypair with ≥ 2 SOL |

### 8.2 Automated checks — single command

From the repo root:

```bash
SOLANA_RPC_URL=https://api.devnet.solana.com node scripts/smoke-release.mjs
```

The script (read-only) runs the four checks below and prints a PASS/FAIL summary. Exit code reflects the outcome — wire it into your release script.

| # | Check | What it asserts |
| --- | --- | --- |
| 1 | Bundled IDL vs built IDL canonical equality | `make/src/lib/onchain/idl/solazzo_core.json` matches `onchain/target/idl/solazzo_core.json` byte-for-byte after recursive key sort (this is the same compare CI runs). Built IDL must exist locally — run `cd onchain && anchor build` first if the file is absent. |
| 2 | Program account on configured RPC | `getAccountInfo(programId)` returns a record with `executable === true`, owner = BPF upgradeable loader. |
| 3 | ProtocolConfig PDA exists with the expected discriminator | PDA derived from `["protocol_config"]` is present, owned by the program, and its 8-byte discriminator matches `[207, 91, 250, 28, 152, 179, 215, 209]`. |
| 4 | SlotBook PDA exists with the expected discriminator | PDA derived from `["slot_book"]`; discriminator matches `[174, 179, 156, 123, 56, 7, 117, 186]`. |

### 8.3 Repo health checks

```bash
cd make             && npm test && npx tsc --noEmit
cd ../onchain/indexer && npx tsc --noEmit
```

Expected: 93 make tests + 29 indexer tests pass; both typechecks exit 0.

### 8.4 Manual wallet step (browser-only)

Required for the publish path because Ed25519 wallet signing cannot be automated server-side without keys.

1. Open `https://make.solazzo.fun` (or the preview URL).
2. Connect a devnet wallet with ≥ 2 SOL.
3. Generate a portrait.
4. Click **Claim** with a `1 SOL` lock. Approve the wallet tx.
5. Click **Publish**. The site asks you to sign a challenge message that begins:
   ```
   SOLAZZO Publish Authorization v1
   wallet:<your_wallet>
   slotId:<n>
   claimTxSig:<base58 sig>
   ...
   ```
6. Approve the signature.

Expected: the gallery card appears, `/api/gallery` returns the new entry, and the response is `{ "id": "<uuid>" }` or `{ "id": "...", "deduped": true }` on retry.

### 8.5 PASS / FAIL criteria

**PASS** when all of the following are true:
- `scripts/smoke-release.mjs` exits 0.
- Repo-health commands in §8.3 all exit 0.
- Manual wallet step in §8.4 produces a gallery card without error.

**FAIL** if any check above fails.

### 8.6 Common failure modes & remediation

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| Smoke script: "IDL drift" | Someone changed `declare_id!` without resyncing the bundled IDL | `cp onchain/target/idl/solazzo_core.json make/src/lib/onchain/idl/solazzo_core.json && cd make && npm test` then commit |
| Smoke script: "Program account not found" | RPC points at the wrong cluster (mainnet vs devnet), or `NEXT_PUBLIC_SOLAZZO_PROGRAM_ID` is wrong | `vercel env pull` and compare against runbook §8.1 |
| Smoke script: "ProtocolConfig PDA missing" | Program is deployed but `initialize_protocol` hasn't run | Run main runbook §3 Step B (initialize) |
| Smoke script: discriminator mismatch | Bundled client is built against a different program version than the deployed one | Rebuild + redeploy `onchain/`, then resync bundled IDL |
| Browser publish: `Challenge token integrity check failed` | `PUBLISH_CHALLENGE_SECRET` differs between issue and verify (e.g. only set on Production but request hit Preview) | Set the same secret on all three Vercel environments |
| Browser publish: `Slot not found on-chain` | Wallet on different cluster than the app | Switch wallet to devnet |
| Browser publish: `Wallet does not own this slot` | Replay of a stale claim, or wallet impersonation | Re-claim, then retry publish |

