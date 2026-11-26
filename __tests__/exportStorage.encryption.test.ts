// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest'
import {
  exportContractsEncrypted,
  decryptContractSnapshot,
  isEncryptedExport,
} from '@/lib/exportStorage'
import { STORAGE_KEYS } from '@/lib/storageKeys'

const sampleContracts = [
  { id: '1', address: 'CABC', label: 'My Contract', network: 'testnet' },
]

beforeEach(() => {
  localStorage.setItem(STORAGE_KEYS.CONTRACTS, JSON.stringify(sampleContracts))
})

describe('exportStorage — encryption', () => {
  it('produces an encrypted envelope distinct from the plain export', async () => {
    const encrypted = await exportContractsEncrypted('hunter2')
    const parsed = JSON.parse(encrypted)
    expect(isEncryptedExport(parsed)).toBe(true)
    expect(parsed.ciphertext).not.toContain('My Contract')
  })

  it('decrypts back to the original snapshot with the correct password', async () => {
    const encrypted = await exportContractsEncrypted('hunter2')
    const snapshot = await decryptContractSnapshot(encrypted, 'hunter2')
    expect(snapshot.contracts).toHaveLength(1)
    expect(snapshot.contracts[0].label).toBe('My Contract')
  })

  it('throws on an incorrect password', async () => {
    const encrypted = await exportContractsEncrypted('hunter2')
    await expect(decryptContractSnapshot(encrypted, 'wrong')).rejects.toThrow()
  })
})
