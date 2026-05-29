import { describe, it, expect } from 'vitest'
import { explorerTxUrl, explorerContractUrl, STELLAR_EXPERT_BASE } from '../stellar'

describe('explorerTxUrl', () => {
  it('uses "public" segment for mainnet', () => {
    const url = explorerTxUrl('mainnet', 'abc123')
    expect(url).toBe(`${STELLAR_EXPERT_BASE}/public/tx/abc123`)
  })

  it('uses "testnet" segment for testnet', () => {
    const url = explorerTxUrl('testnet', 'abc123')
    expect(url).toBe(`${STELLAR_EXPERT_BASE}/testnet/tx/abc123`)
  })

  it('uses "futurenet" segment for futurenet', () => {
    const url = explorerTxUrl('futurenet', 'abc123')
    expect(url).toBe(`${STELLAR_EXPERT_BASE}/futurenet/tx/abc123`)
  })

  it('includes the full tx hash in the URL', () => {
    const hash = 'a'.repeat(64)
    const url = explorerTxUrl('mainnet', hash)
    expect(url).toContain(hash)
  })
})

describe('explorerContractUrl', () => {
  it('uses "public" segment for mainnet', () => {
    const url = explorerContractUrl('mainnet', 'CABC')
    expect(url).toBe(`${STELLAR_EXPERT_BASE}/public/contract/CABC`)
  })

  it('uses "testnet" segment for testnet', () => {
    const url = explorerContractUrl('testnet', 'CABC')
    expect(url).toBe(`${STELLAR_EXPERT_BASE}/testnet/contract/CABC`)
  })

  it('uses "futurenet" segment for futurenet', () => {
    const url = explorerContractUrl('futurenet', 'CABC')
    expect(url).toBe(`${STELLAR_EXPERT_BASE}/futurenet/contract/CABC`)
  })

  it('includes the contract ID in the URL', () => {
    const id = 'C' + 'A'.repeat(55)
    const url = explorerContractUrl('mainnet', id)
    expect(url).toContain(id)
  })
})
