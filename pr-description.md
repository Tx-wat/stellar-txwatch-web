# feat: highlight newly-created contract card in dashboard after redirect

## Summary

When a user registers a new contract and gets redirected to `/contracts/:id`, returning to the dashboard provided no visual indication of which card was just created. This PR wires up the existing `highlight` prop on `ContractCard` to the `txwatch_last_created_contract` sessionStorage key that the add-contract page already sets on save.

## What changed

**`app/dashboard/page.tsx`**

- Added `highlightId` state (initially `null`).
- In the existing `useEffect` on mount, reads `sessionStorage.getItem('txwatch_last_created_contract')`, stores the value in `highlightId`, then immediately removes the key so it is consumed exactly once.
- Passes `highlight={c.id === highlightId}` to every `ContractCard` in the grid — only the newly-created card receives `true`.

**`components/ContractCard.tsx`** — no changes required.  
The component already had the full highlight implementation:
- Accepts `highlight?: boolean` prop.
- Applies a `ring-2 ring-indigo-500/40 animate-pulse` ring for 2.5 seconds via a local `active` state + `setTimeout`, then clears it.

## How it works end-to-end

1. User fills in the Add Contract form and clicks **Save Contract**.
2. `app/contracts/new/page.tsx` calls `sessionStorage.setItem('txwatch_last_created_contract', contract.id)` before redirecting to `/contracts/:id`.
3. User navigates (or is redirected) to the **Dashboard**.
4. On mount, `DashboardPage` reads the key, sets `highlightId`, and removes the key.
5. The matching `ContractCard` receives `highlight={true}`, triggers its internal timer, pulses with an indigo ring for 2.5 s, then returns to its normal appearance.
6. Navigating away and back does not re-trigger the highlight because the key was already removed.

## Testing

- Register a new contract through the form — the matching card pulses with an indigo ring on the dashboard for ~2.5 seconds.
- Hard-refresh the dashboard after the highlight plays — no ring is shown (key was cleared).
- All other cards receive `highlight={false}` and are unaffected.
- Build passes with no new lint errors introduced by this change.

## Files changed

| File | Change |
|---|---|
| `app/dashboard/page.tsx` | Read sessionStorage key, set `highlightId`, pass `highlight` prop |

closes #219
