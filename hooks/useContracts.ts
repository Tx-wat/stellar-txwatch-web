'use client'

import { useEffect, useState, useCallback } from 'react'
import { WatchedContract } from '@/types'
import { getContracts, saveContract, deleteContract } from '@/lib/storage'
import { STORAGE_KEYS } from '@/lib/storageKeys'
import { checkContractExists } from '@/lib/stellar'
import {
  isApiConfigured,
  fetchContractsFromApi,
  saveContractToApi,
  deleteContractFromApi,
} from '@/lib/api'

const BATCH_SIZE = 10
const BATCH_DELAY_MS = 300

function isTestnetNetwork(network: string | undefined): boolean {
  if (!network) return false
  const normalized = network.toLowerCase()
  return normalized === 'testnet' || normalized === 'futurenet'
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export type ExistenceResult = boolean | 'unknown'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error'

export async function checkContractsExistence(
  contracts: WatchedContract[]
): Promise<Map<string, ExistenceResult>> {
  const results = new Map<string, ExistenceResult>()
  const targets = contracts.filter((c) => isTestnetNetwork(c.network))

  for (let i = 0; i < targets.length; i += BATCH_SIZE) {
    const batch = targets.slice(i, i + BATCH_SIZE)
    await Promise.all(
      batch.map(async (contract) => {
        try {
          const result = await checkContractExists(contract.contract_id, contract.network)
          results.set(contract.contract_id, result.exists)
        } catch {
          results.set(contract.contract_id, 'unknown')
        }
      })
    )
    if (i + BATCH_SIZE < targets.length) await delay(BATCH_DELAY_MS)
  }

  return results
}

const UNDO_WINDOW_MS = 8000

export function useContracts() {
  const [contracts, setContracts] = useState<WatchedContract[]>(() =>
    typeof window === 'undefined' ? [] : getContracts()
  )
  const [missingIds, setMissingIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle')

  const refresh = useCallback(() => {
    setContracts(getContracts())
    setLoading(false)
  }, [])

  const syncFromApi = useCallback(async () => {
    if (!isApiConfigured()) return
    setSyncStatus('syncing')
    try {
      const remote = await fetchContractsFromApi()
      for (const contract of remote) saveContract(contract)
      refresh()
      setSyncStatus('synced')
    } catch {
      setSyncStatus('error')
    }
  }, [refresh])

  useEffect(() => {
    refresh()
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.CONTRACTS || event.key === null) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [refresh])

  function add(contract: WatchedContract) {
    saveContract(contract)
    refresh()
    if (isApiConfigured()) {
      setSyncStatus('syncing')
      void saveContractToApi(contract)
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'))
    }
  }

  function remove(id: string) {
    deleteContract(id)
    refresh()
    if (isApiConfigured()) {
      setSyncStatus('syncing')
      void deleteContractFromApi(id)
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('error'))
    }
  }

  function update(contract: WatchedContract) {
    saveContract(contract)
    refresh()
  }

  function removeMissing() {
    missingIds.forEach((id) => deleteContract(id))
    setMissingIds([])
    refresh()
  }

  return {
    contracts,
    missingIds,
    loading,
    syncStatus,
    add,
    remove,
    update,
    removeMissing,
    refresh,
    syncFromApi,
  }
}

export { UNDO_WINDOW_MS }
