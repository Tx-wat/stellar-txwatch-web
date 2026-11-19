'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { StorageAdapter, LocalStorageAdapter } from '@/lib/storageAdapter'

const StorageContext = createContext<StorageAdapter | null>(null)

interface StorageProviderProps {
  /** Defaults to a LocalStorageAdapter; pass another adapter in tests or for backend sync. */
  adapter?: StorageAdapter
  children: ReactNode
}

export function StorageProvider({ adapter, children }: StorageProviderProps) {
  const [value] = useState<StorageAdapter>(() => adapter ?? new LocalStorageAdapter())
  return <StorageContext.Provider value={value}>{children}</StorageContext.Provider>
}

export function useStorageAdapter(): StorageAdapter {
  const adapter = useContext(StorageContext)
  if (!adapter) {
    throw new Error('useStorageAdapter must be used within a StorageProvider')
  }
  return adapter
}
