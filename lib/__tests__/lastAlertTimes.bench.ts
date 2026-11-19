/**
 * Compares the old per-card lookup (getAlerts(id)[0] for every contract) with
 * the single-pass getLastAlertTimes() for 50 contracts x 500 alerts.
 * Run with: npx vitest bench
 */
import { bench, describe } from 'vitest'
import { getAlerts, getLastAlertTimes } from '../storage'

const store: Record<string, string> = {}
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]) },
    get length() { return Object.keys(store).length },
    key: (i: number) => Object.keys(store)[i] ?? null,
  },
  writable: true,
})

const CONTRACTS = 50
const ALERTS_PER_CONTRACT = 500
const contractIds = Array.from({ length: CONTRACTS }, (_, i) => `CONTRACT_${i}`)
const now = Date.now()

store.txwatch_alerts = JSON.stringify(
  contractIds.flatMap((contractId) =>
    Array.from({ length: ALERTS_PER_CONTRACT }, (_, i) => ({
      label: `Alert ${i}`,
      contract_id: contractId,
      network: 'testnet',
      rule_triggered: 'AnyTransaction',
      transaction_hash: `${contractId}-${i}`,
      timestamp: now - i * 1000,
      horizon_link: `https://horizon-testnet.stellar.org/transactions/${contractId}-${i}`,
    }))
  )
)

describe(`last alert time for ${CONTRACTS} contracts x ${ALERTS_PER_CONTRACT} alerts`, () => {
  bench('per-card getAlerts(id)[0] (before)', () => {
    for (const id of contractIds) {
      getAlerts(id)[0]?.timestamp
    }
  })

  bench('getLastAlertTimes() (after, memoised)', () => {
    const times = getLastAlertTimes()
    for (const id of contractIds) {
      times[id]
    }
  })
})
