// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useAlertsWebSocket } from '@/hooks/useAlertsWebSocket'

// Mock StorageContext
vi.mock('@/lib/StorageContext', () => ({
  useStorageAdapter: () => ({
    addAlert: vi.fn(),
  }),
}))

class MockWebSocket {
  static instances: MockWebSocket[] = []
  onopen: (() => void) | null = null
  onmessage: ((e: { data: string }) => void) | null = null
  onclose: (() => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }
  close = vi.fn()
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }
}

describe('useAlertsWebSocket', () => {
  const originalWebSocket = global.WebSocket
  const originalEnv = process.env.NEXT_PUBLIC_ALERTS_WS_URL

  beforeEach(() => {
    MockWebSocket.instances = []
    ;(global as any).WebSocket = MockWebSocket
    process.env.NEXT_PUBLIC_ALERTS_WS_URL = 'ws://localhost:4000'
  })

  afterEach(() => {
    global.WebSocket = originalWebSocket
    process.env.NEXT_PUBLIC_ALERTS_WS_URL = originalEnv
    vi.clearAllMocks()
  })

  it('does nothing when disabled', () => {
    renderHook(() => useAlertsWebSocket(false))
    expect(MockWebSocket.instances.length).toBe(0)
  })

  it('connects when enabled', () => {
    renderHook(() => useAlertsWebSocket(true))
    expect(MockWebSocket.instances.length).toBe(1)
  })

  it('plays sound on new alert when soundEnabled is true', () => {
    const mockOscillator = {
      connect: vi.fn(),
      type: '',
      frequency: { setValueAtTime: vi.fn() },
      start: vi.fn(),
      stop: vi.fn(),
      onended: null as (() => void) | null,
    }
    const mockGain = {
      connect: vi.fn(),
      gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    }
    const mockCtx = {
      createOscillator: vi.fn(() => mockOscillator),
      createGain: vi.fn(() => mockGain),
      destination: {},
      currentTime: 0,
      close: vi.fn(),
    }
    ;(global as any).AudioContext = vi.fn(() => mockCtx)

    renderHook(() => useAlertsWebSocket(true, true))

    const ws = MockWebSocket.instances[0]
    ws.simulateMessage({
      transaction_hash: 'txhash123',
      label: 'Test',
      contract_id: 'C1',
      network: 'testnet',
      rule_triggered: 'AnyTransaction',
      timestamp: Date.now(),
      horizon_link: 'https://example.com',
    })

    expect(mockCtx.createOscillator).toHaveBeenCalled()
  })

  it('sends browser notification on new alert when pushEnabled is true', () => {
    const mockNotification = vi.fn()
    ;(global as any).Notification = mockNotification
    mockNotification.permission = 'granted'

    renderHook(() => useAlertsWebSocket(true, false, true))

    const ws = MockWebSocket.instances[0]
    ws.simulateMessage({
      transaction_hash: 'txhash456',
      label: 'Token Contract',
      contract_id: 'C2',
      network: 'testnet',
      rule_triggered: 'LargeTransfer',
      timestamp: Date.now(),
      horizon_link: 'https://example.com',
    })

    expect(mockNotification).toHaveBeenCalledWith(
      'Alert: Token Contract',
      expect.objectContaining({ body: 'Rule: LargeTransfer' })
    )
  })
})
