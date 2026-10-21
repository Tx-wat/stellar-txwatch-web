'use client'

import { useEffect, useState, useCallback } from 'react'
import { WatchedContract } from '@/types'
import { getContracts, saveContract, deleteContract, onContractsChange } from '@/lib/storage'

export function useContracts() {
  const [contracts, setContracts] = useState<WatchedContract[]>([])

  const refresh = useCallback(() => {
    setContracts(getContracts())
  }, [])

  useEffect(() => {
    refresh()
    const unsubscribe = onContractsChange(refresh)
    return unsubscribe
  }, [refresh])

  function add(contract: WatchedContract): void {
    saveContract(contract)
    refresh()
  }

  function remove(id: string): void {
    deleteContract(id)
    refresh()
  }

  function update(contract: WatchedContract): void {
    saveContract(contract)
    refresh()
  }

  return { contracts, add, remove, update, refresh }
}
