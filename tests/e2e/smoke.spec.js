import { test, expect } from '@playwright/test';

test('public landing page renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Outcomes, grants, donors')).toBeVisible();
});
