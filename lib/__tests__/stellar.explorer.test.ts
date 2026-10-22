import { describe, it, expect } from 'vitest'
import {
  explorerTxUrl,
  explorerContractUrl,
  STELLAR_EXPERT_BASE,
  STELLARCHAIN_BASE,
  HORIZON_URLS,
} from '../stellar'

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

  it('defaults to Stellar Expert when no explorer id is given', () => {
    expect(explorerTxUrl('mainnet', 'abc123')).toBe(
      explorerTxUrl('mainnet', 'abc123', 'stellar-expert'),
    )
  })

  it('builds StellarChain URLs', () => {
    expect(explorerTxUrl('mainnet', 'abc123', 'stellarchain')).toBe(
      `${STELLARCHAIN_BASE}/public/tx/abc123`,
    )
    expect(explorerTxUrl('testnet', 'abc123', 'stellarchain')).toBe(
      `${STELLARCHAIN_BASE}/testnet/tx/abc123`,
    )
    expect(explorerTxUrl('futurenet', 'abc123', 'stellarchain')).toBe(
      `${STELLARCHAIN_BASE}/futurenet/tx/abc123`,
    )
  })

  it('builds Horizon JSON URLs', () => {
    expect(explorerTxUrl('mainnet', 'abc123', 'horizon')).toBe(
      `${HORIZON_URLS.mainnet}/transactions/abc123`,
    )
    expect(explorerTxUrl('testnet', 'abc123', 'horizon')).toBe(
      `${HORIZON_URLS.testnet}/transactions/abc123`,
    )
    expect(explorerTxUrl('futurenet', 'abc123', 'horizon')).toBe(
      `${HORIZON_URLS.futurenet}/transactions/abc123`,
    )
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

  it('defaults to Stellar Expert when no explorer id is given', () => {
    expect(explorerContractUrl('mainnet', 'CABC')).toBe(
      explorerContractUrl('mainnet', 'CABC', 'stellar-expert'),
    )
  })

  it('builds StellarChain URLs', () => {
    expect(explorerContractUrl('mainnet', 'CABC', 'stellarchain')).toBe(
      `${STELLARCHAIN_BASE}/public/contract/CABC`,
    )
    expect(explorerContractUrl('testnet', 'CABC', 'stellarchain')).toBe(
      `${STELLARCHAIN_BASE}/testnet/contract/CABC`,
    )
    expect(explorerContractUrl('futurenet', 'CABC', 'stellarchain')).toBe(
      `${STELLARCHAIN_BASE}/futurenet/contract/CABC`,
    )
  })

  it('builds Horizon JSON URLs', () => {
    expect(explorerContractUrl('mainnet', 'CABC', 'horizon')).toBe(
      `${HORIZON_URLS.mainnet}/contracts/CABC`,
    )
    expect(explorerContractUrl('testnet', 'CABC', 'horizon')).toBe(
      `${HORIZON_URLS.testnet}/contracts/CABC`,
    )
    expect(explorerContractUrl('futurenet', 'CABC', 'horizon')).toBe(
      `${HORIZON_URLS.futurenet}/contracts/CABC`,
    )
  })
})
