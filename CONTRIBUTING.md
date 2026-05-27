# Contributing to stellar-txwatch-web

Thanks for your interest in contributing! This is the web dashboard for the [Tx-wat](https://github.com/Tx-wat) org.

## Sister repos

| Repo | Description |
|------|-------------|
| [stellar-txwatch-core](https://github.com/Tx-wat/stellar-txwatch-core) | Rust monitoring engine |
| [stellar-txwatch-contracts](https://github.com/Tx-wat/stellar-txwatch-contracts) | Soroban smart contracts |
| [stellar-txwatch-web](https://github.com/Tx-wat/stellar-txwatch-web) | This repo — Next.js dashboard |

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

## Issue labels

When opening or triaging issues, use labels that make scope and priority easy to scan:

- `good first issue` for small, well-contained tasks
- `bug` for broken behavior or regressions
- `ui` for layout, styling, and interaction changes
- `tests` for missing or improved test coverage
- `wallet` for Freighter or wallet connection work

## Commit style

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(component): add X
fix(page): correct Y
chore: update deps
```

## TypeScript types

All types live in `types/index.ts` and must stay in sync with the Rust structs in `stellar-txwatch-core`. Do not add fields here without a matching change in the core engine.

## Pull requests

- Keep PRs focused — one feature or fix per PR
- All pages must be mobile responsive and dark-mode compatible
- Run `npm run build` before opening a PR — zero lint errors required
