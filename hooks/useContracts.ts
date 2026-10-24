'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { WatchedContract } from '@/types'
import { getContracts, saveContract, deleteContract, onContractsChange } from '@/lib/storage'
import { checkContractExists } from '@/lib/stellar'

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
          const exists = await checkContractExists(contract.contract_id, contract.network)
          results.set(contract.contract_id, exists)
        } catch {
          results.set(contract.contract_id, 'unknown')
        }
      })
    )

    if (i + BATCH_SIZE < targets.length) {
      await delay(BATCH_DELAY_MS)
    }
  }

  return results
}

const UNDO_WINDOW_MS = 8000

export function useContracts() {
  const adapter = useStorageAdapter()
  const [contracts, setContracts] = useState<WatchedContract[]>([])
  const [missingIds, setMissingIds] = useState<string[]>([])

  const refresh = useCallback(async () => {
    setContracts(await adapter.getContracts())
    setLoading(false)
  }, [adapter])

  /**
   * When the API is configured, fetch the authoritative list from the server
   * and reconcile it into localStorage (server is source of truth).
   */
  const syncFromApi = useCallback(async () => {
    if (!isApiConfigured()) return
    setSyncStatus('syncing')
    try {
      const remote = await fetchContractsFromApi()
      // Write each remote contract into localStorage
      for (const c of remote) {
        saveContract(c)
      }
      setContracts(getContracts())
      setSyncStatus('synced')
    } catch {
      setSyncStatus('error')
    }
  }, [])

  useEffect(() => {
    refresh()
    return adapter.subscribe((change) => {
      if (change === 'contracts') refresh()
    })
  }, [adapter, refresh])

  function add(contract: WatchedContract): void {
    saveContract(contract)
    refresh()
    // Mirror to API
    if (isApiConfigured()) {
      setSyncStatus('syncing')
      try {
        await saveContractToApi(contract)
        setSyncStatus('synced')
      } catch {
        setSyncStatus('error')
      }
    }
  }

  function remove(id: string): void {
    deleteContract(id)
    refresh()
    // Mirror to API
    if (isApiConfigured()) {
      setSyncStatus('syncing')
      try {
        await deleteContractFromApi(id)
        setSyncStatus('synced')
      } catch {
        setSyncStatus('error')
      }
    }
  }

  function update(contract: WatchedContract): void {
    saveContract(contract)
    refresh()
    return adapter.subscribe((change) => {
      if (change === 'contracts') refresh()
    })
  }, [adapter, refresh])

  const save = useCallback((updated: WatchedContract) => adapter.saveContract(updated), [adapter])
  const remove = useCallback(() => adapter.deleteContract(id), [adapter, id])

  function removeMissing() {
    missingIds.forEach((id) => deleteContract(id))
    setMissingIds([])
    refresh()
  }

  return { contracts, missingIds, add, remove, update, removeMissing, refresh }
}
