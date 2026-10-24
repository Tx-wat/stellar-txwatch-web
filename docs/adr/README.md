# Architecture Decision Records

This folder records significant architectural decisions for stellar-txwatch-web, using the [MADR](https://adr.github.io/madr/) (Markdown Architectural Decision Records) format.

An ADR captures **one** decision: the context that forced it, the options that were considered, what was chosen and why, and the consequences. ADRs are immutable once accepted. To change a decision, write a new ADR that supersedes the old one and update the old one's status to `Superseded by ADR-NNNN`.

## Index

| ADR | Title | Status |
|---|---|---|
| [ADR-0001](./0001-localstorage-first-storage.md) | localStorage-first storage with optional core API | Accepted |
| [ADR-0002](./0002-freighter-only-wallet.md) | Freighter as the only supported wallet | Accepted |

## Writing a new ADR

1. Copy [`template.md`](./template.md) to `NNNN-short-title-with-dashes.md`, using the next free number padded to four digits.
2. Fill in the sections. Keep it short. Link to issues, PRs and code instead of repeating them.
3. Start with status `Proposed` and open a PR. Discussion happens on the PR.
4. When the PR is merged, set the status to `Accepted` and add the ADR to the index above.

Good candidates for an ADR are decisions that are expensive to reverse, affect several parts of the codebase, or that a new contributor would otherwise question, such as the choice of block explorer for transaction links.
