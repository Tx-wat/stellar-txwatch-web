import { WatchedContract, AlertPayload } from '@/types'

const CONTRACTS_KEY = 'txwatch_contracts'
const ALERTS_KEY = 'txwatch_alerts'

function load<T>(key: string): T[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]')
  } catch {
    return []
  }
}

function save<T>(key: string, data: T[]) {
  localStorage.setItem(key, JSON.stringify(data))
}

export function getContracts(): WatchedContract[] {
  return load<WatchedContract>(CONTRACTS_KEY)
}

export function getContract(id: string): WatchedContract | undefined {
  return getContracts().find((c) => c.id === id)
}

export function getContractByIdAndNetwork(
  contractId: string,
  network: string
): WatchedContract | undefined {
  return getContracts().find((c) => c.contract_id === contractId && c.network === network)
}

export function saveContract(contract: WatchedContract) {
  const contracts = getContracts().filter((c) => c.id !== contract.id)
  save(CONTRACTS_KEY, [...contracts, contract])
}

export function deleteContract(id: string) {
  save(CONTRACTS_KEY, getContracts().filter((c) => c.id !== id))
}

export function getAlerts(contractId: string): AlertPayload[] {
  return load<AlertPayload>(ALERTS_KEY).filter(
    (a) => a.contract_id === contractId
  )
}

export function addAlert(alert: AlertPayload) {
  const alerts = load<AlertPayload>(ALERTS_KEY)
  save(ALERTS_KEY, [alert, ...alerts])
}

export function deleteAlertsByContractId(contractId: string) {
  const alerts = load<AlertPayload>(ALERTS_KEY)
  save(ALERTS_KEY, alerts.filter((a) => a.contract_id !== contractId))
}

export function getTodayAlertCount(): number {
  const start = new Date().setHours(0, 0, 0, 0)
  return load<AlertPayload>(ALERTS_KEY).filter((a) => a.timestamp >= start).length
}
