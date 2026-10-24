import { WatchedContract, AlertPayload } from '@/types'
import {
  getContracts,
  getContract,
  saveContract,
  deleteContract,
  getAlerts,
  getAllAlerts,
  getLastAlertTimes,
  addAlert,
  getTodayAlertCount,
  onAlertsChange,
  onContractsChange,
} from '@/lib/storage'

export type StorageChange = 'contracts' | 'alerts'

export type StorageListener = (change: StorageChange) => void

/**
 * Persistence boundary for pages and components. Methods are async so a
 * backend-backed implementation can be swapped in without touching callers.
 */
export interface StorageAdapter {
  getContracts(): Promise<WatchedContract[]>
  getContract(id: string): Promise<WatchedContract | undefined>
  saveContract(contract: WatchedContract): Promise<void>
  deleteContract(id: string): Promise<void>
  getAlerts(contractId: string): Promise<AlertPayload[]>
  getAllAlerts(): Promise<AlertPayload[]>
  /** Most recent alert timestamp per contract_id. */
  getLastAlertTimes(): Promise<Record<string, number>>
  addAlert(alert: AlertPayload): Promise<void>
  getTodayAlertCount(): Promise<number>
  /** Notifies on any change to contracts or alerts. Returns an unsubscribe function. */
  subscribe(listener: StorageListener): () => void
}

export class LocalStorageAdapter implements StorageAdapter {
  private listeners = new Set<StorageListener>()

  private notify(change: StorageChange) {
    this.listeners.forEach((listener) => listener(change))
  }

  async getContracts() {
    return getContracts()
  }

  async getContract(id: string) {
    return getContract(id)
  }

  async saveContract(contract: WatchedContract) {
    saveContract(contract)
    this.notify('contracts')
  }

  async deleteContract(id: string) {
    deleteContract(id)
    this.notify('contracts')
    this.notify('alerts')
  }

  async getAlerts(contractId: string) {
    return getAlerts(contractId)
  }

  async getAllAlerts() {
    return getAllAlerts()
  }

  async getLastAlertTimes() {
    return getLastAlertTimes()
  }

  async addAlert(alert: AlertPayload) {
    addAlert(alert)
    this.notify('alerts')
  }

  async getTodayAlertCount() {
    return getTodayAlertCount()
  }

  subscribe(listener: StorageListener) {
    this.listeners.add(listener)
    // Cross-tab updates arrive through the window 'storage' event
    const unsubscribers =
      typeof window !== 'undefined'
        ? [
            onContractsChange(() => listener('contracts')),
            onAlertsChange(() => listener('alerts')),
          ]
        : []
    return () => {
      this.listeners.delete(listener)
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }
}
