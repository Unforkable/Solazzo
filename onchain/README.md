# Solazzo On-Chain

Anchor workspace for Solazzo Solana programs.

## Prerequisites

- [Rust](https://rustup.rs/) (toolchain pinned in `rust-toolchain.toml`)
- [Solana CLI](https://docs.solanalabs.com/cli/install) (v2+)
- [Anchor CLI](https://www.anchor-lang.com/docs/installation) (v0.32+)
- Node.js + Yarn

## Commands

```bash
# Build programs
anchor build

# Run tests (starts local validator automatically)
anchor test

# Start local validator manually
solana-test-validator

# Deploy to devnet
anchor build
solana config set --url devnet
anchor deploy --provider.cluster devnet

# Format Rust code
cargo fmt --all

# Lint Rust code
cargo clippy --all-targets -- -D warnings

# Lint TypeScript
yarn lint

# Fix TypeScript formatting
yarn lint:fix
```

## Structure

```
onchain/
├── programs/
│   └── solazzo-core/   # Main program
├── tests/              # Integration tests (TypeScript)
├── Anchor.toml         # Anchor config
└── Cargo.toml          # Workspace config
```
