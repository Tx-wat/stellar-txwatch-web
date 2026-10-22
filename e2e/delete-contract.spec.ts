import { test, expect } from '@playwright/test'

const TEST_CONTRACT = {
  id: 'contract-del-123',
  label: 'Contract To Delete',
  contract_id: 'CA3D5KRYMCMCZVACQ3YNMCXTREVRFW4SCPOQUELTRQD4Y3O7XR3LQGAS',
  network: 'testnet',
  rules: [{ type: 'AnyTransaction' }],
  webhook_url: 'https://example.com/webhook',
  created_at: Date.now(),
  updated_at: Date.now(),
}

const TEST_ALERTS = [
  {
    id: 'alert-1',
    contractId: 'contract-del-123',
    type: 'transfer',
    threshold: 100,
    timestamp: Date.now(),
    createdAt: Date.now(),
  },
  {
    id: 'alert-2',
    contractId: 'contract-del-123',
    type: 'invocation',
    threshold: 0,
    timestamp: Date.now(),
    createdAt: Date.now(),
  },
]

test.describe('Contract Deletion Confirmation Modal', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(({ contract, alerts }) => {
      localStorage.clear()
      localStorage.setItem('txwatch_contracts', JSON.stringify([contract]))
      localStorage.setItem('txwatch_alerts', JSON.stringify(alerts))
    }, { contract: TEST_CONTRACT, alerts: TEST_ALERTS })
  })

  test('deletion workflow: open modal, cancel, delete, redirect, and verify cleanup', async ({ page }) => {
    // 1. Open contract detail page
    await page.goto(`/contracts/${TEST_CONTRACT.id}`)
    await expect(page.locator('h1')).toContainText(TEST_CONTRACT.label)

    // 2. Click Delete → confirmation modal appears with correct contract name and alert count
    await page.click('button:has-text("Delete")')
    const modal = page.locator('div:has(> h3:text("Delete Contract?"))')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText(TEST_CONTRACT.label)
    await expect(modal).toContainText('All 2 alert records')

    // 3. Click Cancel → modal closes, contract still exists
    await modal.locator('button:has-text("Cancel")').click()
    await expect(page.locator('text=Delete Contract?')).not.toBeVisible()
    await expect(page.locator('h1')).toContainText(TEST_CONTRACT.label)

    // 4. Click Delete again → confirm → redirected to /contracts
    await page.click('button:has-text("Delete")')
    await expect(page.locator('text=Delete Contract?')).toBeVisible()
    await page.locator('div.fixed button:has-text("Delete")').click()

    await expect(page).toHaveURL(/\/contracts$/, { timeout: 10000 })

    // 5. Verify deleted contract is no longer in the list
    await expect(page.locator(`text=${TEST_CONTRACT.label}`)).not.toBeVisible()

    // 6. Verify associated alerts are also deleted from localStorage
    const storageState = await page.evaluate(() => {
      const contracts = JSON.parse(localStorage.getItem('txwatch_contracts') || '[]')
      const alerts = JSON.parse(localStorage.getItem('txwatch_alerts') || '[]')
      return { contracts, alerts }
    })
    expect(storageState.contracts.find((c: any) => c.id === 'contract-del-123')).toBeUndefined()
    expect(storageState.alerts.filter((a: any) => a.contractId === 'contract-del-123')).toHaveLength(0)
  })
})
