import { test, expect } from '@playwright/test';
import { DashboardPage } from '../page-objects/DashboardPage';
import { ApiTestHelper } from '../fixtures/api-helpers';

test.describe('Execution History Drawer & Live Streaming', () => {
  let dashboard: DashboardPage;
  const apiHelper = new ApiTestHelper();
  const scheduleName = `E2E-History-${Date.now()}`;
  let schedule: any;

  test.beforeAll(async () => {
    schedule = await apiHelper.createScheduling({
      name: scheduleName,
      taskType: 'LOG_TASK',
      taskParameters: { message: 'History Stream Verification' },
      scheduleType: 'INTERVAL',
      scheduleConfig: { intervalSeconds: 2 },
    });
    // Wait for at least 1 execution to occur
    await apiHelper.waitForExecutionCount(schedule.id, 1, 15000);
  });

  test.afterAll(async () => {
    if (schedule?.id) {
      await apiHelper.deleteScheduling(schedule.id);
    }
  });

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();
  });

  test('should open executions drawer from header and display execution stream', async ({ page }) => {
    await dashboard.executionsHeaderButton.click();
    await expect(dashboard.executionsDrawer).toBeVisible();

    // Verify drawer controls
    const toggleAutoRefresh = page.locator('[data-testid="toggle-auto-refresh"]');
    const refreshExecutions = page.locator('[data-testid="refresh-executions"]');
    const closeDrawer = page.locator('[data-testid="close-drawer"]');

    await expect(toggleAutoRefresh).toBeVisible();
    await expect(refreshExecutions).toBeVisible();
    await expect(closeDrawer).toBeVisible();

    // Close drawer
    await closeDrawer.click();
    await expect(dashboard.executionsDrawer).not.toBeVisible();
  });

  test('should open filtered executions drawer for a specific schedule from table row', async () => {
    const row = dashboard.getTableRow(scheduleName);
    await expect(row).toBeVisible({ timeout: 10000 });

    await dashboard.openScheduleExecutions(scheduleName);
    await expect(dashboard.executionsDrawer).toBeVisible();

    // Drawer header should display schedule name
    await expect(dashboard.executionsDrawer.locator('h3')).toContainText(`Executions: ${scheduleName}`);

    await dashboard.closeDrawerButton.click();
    await expect(dashboard.executionsDrawer).not.toBeVisible();
  });
});
