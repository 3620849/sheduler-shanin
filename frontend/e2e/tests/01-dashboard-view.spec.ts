import { test, expect } from '@playwright/test';
import { DashboardPage } from '../page-objects/DashboardPage';

test.describe('Dashboard View & Navigation', () => {
  let dashboard: DashboardPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('should render platform title and header branding', async ({ page }) => {
    await expect(page).toHaveTitle(/Distributed Task Scheduler/);
    await expect(dashboard.brandTitle).toContainText('Distributed Task Scheduler');
    await expect(dashboard.createSchedulingButton).toBeVisible();
    await expect(dashboard.refreshButton).toBeVisible();
    await expect(dashboard.executionsHeaderButton).toBeVisible();
  });

  test('should display summary statistics cards', async () => {
    const totalCount = await dashboard.getStatCardValue('Total Schedulings');
    expect(Number(totalCount)).toBeGreaterThanOrEqual(0);

    const activeCount = await dashboard.getStatCardValue('Active Jobs');
    expect(Number(activeCount)).toBeGreaterThanOrEqual(0);

    const pausedCount = await dashboard.getStatCardValue('Suspended Jobs');
    expect(Number(pausedCount)).toBeGreaterThanOrEqual(0);
  });
});
