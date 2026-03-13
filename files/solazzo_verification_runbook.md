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

