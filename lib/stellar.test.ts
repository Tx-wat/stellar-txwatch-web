import { describe, expect, it } from 'vitest'

import { explorerContractUrl, explorerTxUrl, isValidUrl } from './stellar'

describe('stellar helpers', () => {
  it('builds Stellar Expert transaction URLs for public and test networks', () => {
    expect(explorerTxUrl('mainnet', 'abc123')).toBe('https://stellar.expert/explorer/public/tx/abc123')
    expect(explorerTxUrl('testnet', 'abc123')).toBe('https://stellar.expert/explorer/testnet/tx/abc123')
  })

  it('builds Stellar Expert contract URLs for public and non-public networks', () => {
    expect(explorerContractUrl('mainnet', 'contract-id')).toBe(
      'https://stellar.expert/explorer/public/contract/contract-id'
    )
    expect(explorerContractUrl('futurenet', 'contract-id')).toBe(
      'https://stellar.expert/explorer/futurenet/contract/contract-id'
    )
  })

  it('validates only HTTP and HTTPS URLs', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('http://localhost:3000')).toBe(true)
    expect(isValidUrl('ftp://example.com')).toBe(false)
    expect(isValidUrl('not a url')).toBe(false)
  })
})
