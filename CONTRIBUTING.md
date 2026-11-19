# Contributing to stellar-txwatch-web

Thanks for your interest in contributing! This is the web dashboard for the [Tx-wat](https://github.com/Tx-wat) org.

## Sister repos

| Repo | Description |
|------|-------------|
| [stellar-txwatch-core](https://github.com/Tx-wat/stellar-txwatch-core) | Rust monitoring engine |
| [stellar-txwatch-contracts](https://github.com/Tx-wat/stellar-txwatch-contracts) | Soroban smart contracts |
| [stellar-txwatch-web](https://github.com/Tx-wat/stellar-txwatch-web) | This repo - Next.js dashboard |

## Local setup

```bash
git clone https://github.com/Tx-wat/stellar-txwatch-web
cd stellar-txwatch-web
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Requirements

- Node.js 18+
- [Freighter wallet extension](https://www.freighter.app/) for wallet-gated features

## Branch naming

```
feat/<short-description>
fix/<short-description>
chore/<short-description>
```

## Commit style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(component): add X
fix(page): correct Y
chore: update deps
```

Releases are automated with [release-please](https://github.com/googleapis/release-please): commits on `main` are collected into a release PR that bumps the version and updates `CHANGELOG.md`. Merging it tags the release, publishes GitHub release notes and pushes the Docker image to GHCR. `feat` bumps the minor version, `fix` the patch, and a `!` / `BREAKING CHANGE:` footer the major (the minor while still on `0.x`).

## TypeScript types

All types live in `types/index.ts` and must stay in sync with the Rust structs in `stellar-txwatch-core`. Do not add fields here without a matching change in the core engine.

## Architecture decisions

Significant architectural decisions are recorded as ADRs in [`docs/adr/`](./docs/adr/README.md), using the MADR format. Read the existing ADRs before proposing changes in these areas:

- [ADR-0001: localStorage-first storage with optional core API](./docs/adr/0001-localstorage-first-storage.md)
- [ADR-0002: Freighter as the only supported wallet](./docs/adr/0002-freighter-only-wallet.md)

If your change introduces or reverses an architectural decision, add a new ADR from [`docs/adr/template.md`](./docs/adr/template.md) in the same PR.

## Pull requests

- Keep PRs focused - one feature or fix per PR
- All pages must be mobile responsive and dark-mode compatible
- Run `npm run build` before opening a PR - zero lint errors required
- Add a changelog entry under the `[Unreleased]` section in `CHANGELOG.md` for notable user-facing changes or new features
