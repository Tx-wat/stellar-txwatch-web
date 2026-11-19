import { test, expect } from '@playwright/test'

test.describe('Smoke test', () => {
  test('loads home page successfully', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveTitle(/TxWatch/)
  })
})
