import { test, expect } from '@playwright/test';
import { DashboardPage } from '../page-objects/DashboardPage';
import { ApiTestHelper } from '../fixtures/api-helpers';

test.describe('Dashboard Pagination Navigation', () => {
  let dashboard: DashboardPage;
  const apiHelper = new ApiTestHelper();
  const createdIds: string[] = [];

  test.beforeAll(async () => {
    // Provision 7 schedules to test page splitting with pageSize=5
    for (let i = 1; i <= 7; i++) {
      const item = await apiHelper.createScheduling({
        name: `E2E-PageItem-${i}-${Date.now()}`,
        taskType: 'LOG_TASK',
        taskParameters: { message: `Pagination item ${i}` },
        scheduleType: 'INTERVAL',
        scheduleConfig: { intervalSeconds: 3600 },
      });
      createdIds.push(item.id);
    }
  });

  test.afterAll(async () => {
    for (const id of createdIds) {
      await apiHelper.deleteScheduling(id);
    }
  });

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('should render pagination controls and support page size selection', async ({ page }) => {
    await expect(dashboard.paginationMenu).toBeVisible();

    const sizeSelect = page.locator('#page-size-select');
    await expect(sizeSelect).toBeVisible();

    // Select page size 5
    await sizeSelect.selectOption('5');
    await page.waitForTimeout(500);

    const currentPageText = page.locator('.pagination-current-page');
    await expect(currentPageText).toContainText('Page 1 of');

    // Click next page
    const nextBtn = page.locator('button[aria-label="Next page"]');
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await expect(currentPageText).toContainText('Page 2 of');

      // Click previous page
      const prevBtn = page.locator('button[aria-label="Previous page"]');
      await prevBtn.click();
      await expect(currentPageText).toContainText('Page 1 of');
    }
  });

  test('should maintain consistent global active and suspended counts across pages', async ({ page }) => {
    const sizeSelect = page.locator('#page-size-select');
    await sizeSelect.selectOption('5');
    await page.waitForTimeout(500);

    const initialActive = await dashboard.getStatCardValue('Active Jobs');
    const initialSuspended = await dashboard.getStatCardValue('Suspended Jobs');

    const nextBtn = page.locator('button[aria-label="Next page"]');
    if (await nextBtn.isEnabled()) {
      await nextBtn.click();
      await page.waitForTimeout(500);

      const page2Active = await dashboard.getStatCardValue('Active Jobs');
      const page2Suspended = await dashboard.getStatCardValue('Suspended Jobs');

      expect(page2Active).toBe(initialActive);
      expect(page2Suspended).toBe(initialSuspended);
    }
  });
});
