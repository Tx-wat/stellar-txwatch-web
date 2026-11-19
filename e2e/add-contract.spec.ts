import { test, expect } from '@playwright/test'

const VALID_CONTRACT_ID = 'CA3D5KRYMCMCZVACQ3YNMCXTREVRFW4SCPOQUELTRQD4Y3O7XR3LQGAS'
const WALLET_PUBLIC_KEY = 'GBWM52EWEYI4QEQRBPF7F5XF7K4Y7WTYL74S2Q4EZFHRQPG2J23P276K'

test.describe('Add Contract Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.clear()
    })
  })

  test('happy path: fill in form, add rule, and save successfully', async ({ page }) => {
    await page.addInitScript((pubKey) => {
      window.freighter = {
        isConnected: async () => true,
        getPublicKey: async () => pubKey,
        getNetwork: async () => 'TESTNET',
      }
    }, WALLET_PUBLIC_KEY)

    await page.goto('/contracts/new')

    // Fill in form fields
    await page.fill('input[placeholder="e.g. My DEX Contract"]', 'Production DEX')
    await page.fill('input[placeholder="C... (56 characters)"]', VALID_CONTRACT_ID)
    await page.selectOption('select', 'testnet')
    await page.fill('input[placeholder="https://your-server.com/webhook"]', 'https://example.com/webhook')

    // Add alert rule
    await page.click('button:has-text("Add Rule")')

    // Save contract
    await page.click('button:has-text("Save Contract")')

    // Redirected to contract detail page
    await expect(page).toHaveURL(/\/contracts\/[a-f0-9-]+/, { timeout: 10000 })
    await expect(page.locator('h1')).toContainText('Production DEX')

    // Verify contract appears in the contracts list
    await page.goto('/contracts')
    await expect(page.locator('text=Production DEX')).toBeVisible()
  })

  test('validation: save with empty label shows error', async ({ page }) => {
    await page.addInitScript((pubKey) => {
      window.freighter = {
        isConnected: async () => true,
        getPublicKey: async () => pubKey,
        getNetwork: async () => 'TESTNET',
      }
    }, WALLET_PUBLIC_KEY)

    await page.goto('/contracts/new')
    await page.fill('input[placeholder="C... (56 characters)"]', VALID_CONTRACT_ID)
    await page.fill('input[placeholder="https://your-server.com/webhook"]', 'https://example.com/webhook')
    await page.click('button:has-text("Add Rule")')

    await page.click('button:has-text("Save Contract")')
    await expect(page.locator('text=Label is required')).toBeVisible()
  })

  test('validation: save with invalid contract ID shows error', async ({ page }) => {
    await page.addInitScript((pubKey) => {
      window.freighter = {
        isConnected: async () => true,
        getPublicKey: async () => pubKey,
        getNetwork: async () => 'TESTNET',
      }
    }, WALLET_PUBLIC_KEY)

    await page.goto('/contracts/new')
    await page.fill('input[placeholder="e.g. My DEX Contract"]', 'Production DEX')
    await page.fill('input[placeholder="C... (56 characters)"]', 'INVALID_ID')
    await page.fill('input[placeholder="https://your-server.com/webhook"]', 'https://example.com/webhook')
    await page.click('button:has-text("Add Rule")')

    await page.click('button:has-text("Save Contract")')
    await expect(page.locator('text=Must be a valid Soroban contract address')).toBeVisible()
  })

  test('validation: save with invalid webhook URL shows error', async ({ page }) => {
    await page.addInitScript((pubKey) => {
      window.freighter = {
        isConnected: async () => true,
        getPublicKey: async () => pubKey,
        getNetwork: async () => 'TESTNET',
      }
    }, WALLET_PUBLIC_KEY)

    await page.goto('/contracts/new')
    await page.fill('input[placeholder="e.g. My DEX Contract"]', 'Production DEX')
    await page.fill('input[placeholder="C... (56 characters)"]', VALID_CONTRACT_ID)
    await page.fill('input[placeholder="https://your-server.com/webhook"]', 'not-a-valid-url')
    await page.click('button:has-text("Add Rule")')

    await page.click('button:has-text("Save Contract")')
    await expect(page.locator('text=Must be a valid http/https URL')).toBeVisible()
  })

  test('validation: save with no rules shows error', async ({ page }) => {
    await page.addInitScript((pubKey) => {
      window.freighter = {
        isConnected: async () => true,
        getPublicKey: async () => pubKey,
        getNetwork: async () => 'TESTNET',
      }
    }, WALLET_PUBLIC_KEY)

    await page.goto('/contracts/new')
    await page.fill('input[placeholder="e.g. My DEX Contract"]', 'Production DEX')
    await page.fill('input[placeholder="C... (56 characters)"]', VALID_CONTRACT_ID)
    await page.fill('input[placeholder="https://your-server.com/webhook"]', 'https://example.com/webhook')

    await page.click('button:has-text("Save Contract")')
    await expect(page.locator('text=Add at least one alert rule')).toBeVisible()
  })

  test('validation: save without wallet connected shows error', async ({ page }) => {
    await page.goto('/contracts/new')
    await page.fill('input[placeholder="e.g. My DEX Contract"]', 'Production DEX')
    await page.fill('input[placeholder="C... (56 characters)"]', VALID_CONTRACT_ID)
    await page.fill('input[placeholder="https://your-server.com/webhook"]', 'https://example.com/webhook')
    await page.click('button:has-text("Add Rule")')

    await page.click('button:has-text("Save Contract")')
    await expect(page.locator('text=Connect your Freighter wallet to save contracts')).toBeVisible()
  })
})
