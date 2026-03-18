# Solazzo Verification Evidence Log

Use this file to record each rehearsal run.
One run = one completed block below.

---

## Run Entry Template

- Run ID:
- Date (UTC):
- Tester:
- Environment: localnet / devnet
- App URL:
- App RPC:
- Wallet pubkey (under test):
- Program ID:

### Preconditions

- Validator/RPC healthy: PASS / FAIL
- Wallet funded: PASS / FAIL
- Protocol initialized: PASS / FAIL
- Slots filled status (if displacement test): value =

### Transaction Evidence

- Claim tx:
- Displace tx:
- Withdraw tx:

### State Evidence

- Claimable before displacement:
- Claimable after displacement:
- Claimable before withdraw:
- Claimable after withdraw:
- Wallet SOL before run:
- Wallet SOL after run:

### Result

- Outcome: PASS / FAIL
- Blocking issue(s):
- Notes:
- Follow-up action owner:
- Follow-up due date:

---

## Run 001

- Run ID:
- Date (UTC):
- Tester:
- Environment:
- App URL:
- App RPC:
- Wallet pubkey (under test):
- Program ID:

### Preconditions

- Validator/RPC healthy:
- Wallet funded:
- Protocol initialized:
- Slots filled status (if displacement test): value =

### Transaction Evidence

- Claim tx:
- Displace tx:
- Withdraw tx:

### State Evidence

- Claimable before displacement:
- Claimable after displacement:
- Claimable before withdraw:
- Claimable after withdraw:
- Wallet SOL before run:
- Wallet SOL after run:

### Result

- Outcome:
- Blocking issue(s):
- Notes:
- Follow-up action owner:
- Follow-up due date:

---

## Run 002

- Run ID:
- Date (UTC):
- Tester:
- Environment:
- App URL:
- App RPC:
- Wallet pubkey (under test):
- Program ID:

### Preconditions

- Validator/RPC healthy:
- Wallet funded:
- Protocol initialized:
- Slots filled status (if displacement test): value =

### Transaction Evidence

- Claim tx:
- Displace tx:
- Withdraw tx:

### State Evidence

- Claimable before displacement:
- Claimable after displacement:
- Claimable before withdraw:
- Claimable after withdraw:
- Wallet SOL before run:
- Wallet SOL after run:

### Result

- Outcome:
- Blocking issue(s):
- Notes:
- Follow-up action owner:
- Follow-up due date:

---

## Run 003 — Notifications Rollout Verification

- Date (UTC): 2025-03-18
- Environment: production (make.solazzo.fun)
- Scope: email notification subscribe + dispatch pipeline

### Actions Executed

1. **Subscribe endpoint** — `POST /api/notifications/subscribe` → success
2. **Dispatch endpoint** — `POST /api/notifications/dispatch` → success

### Dispatch Proof

```json
{"processed":1,"sent":1,"skipped":0,"errors":0,"details":[]}
```

### Result

- Outcome: PASS
- Notes: `NOTIFY_LAUNCH_ENABLED` should remain `false` after test send to prevent unintended campaign blasts.
- Known risk: subscriber and delivery records stored with public blob access (see make/README.md hardening notes).

