import { test, expect } from '@playwright/test';
import { DashboardPage } from '../page-objects/DashboardPage';
import { ApiTestHelper } from '../fixtures/api-helpers';

test.describe('Concurrent Execution & Schedule Suspension Isolation', () => {
  let dashboard: DashboardPage;
  const apiHelper = new ApiTestHelper();
  const timestamp = Date.now();
  const scheduleAlphaName = `Alpha-Suspended-${timestamp}`;
  const scheduleBetaName = `Beta-Active-${timestamp}`;

  let scheduleAlpha: any;
  let scheduleBeta: any;

  test.beforeAll(async () => {
    // Provision two independent short-interval schedules
    scheduleAlpha = await apiHelper.createScheduling({
      name: scheduleAlphaName,
      taskType: 'LOG_TASK',
      taskParameters: { message: 'Alpha Heartbeat Task' },
      scheduleType: 'INTERVAL',
      scheduleConfig: { intervalSeconds: 2 },
    });

    scheduleBeta = await apiHelper.createScheduling({
      name: scheduleBetaName,
      taskType: 'LOG_TASK',
      taskParameters: { message: 'Beta Heartbeat Task' },
      scheduleType: 'INTERVAL',
      scheduleConfig: { intervalSeconds: 2 },
    });
  });

  test.afterAll(async () => {
    if (scheduleAlpha?.id) {
      await apiHelper.deleteScheduling(scheduleAlpha.id);
    }
    if (scheduleBeta?.id) {
      await apiHelper.deleteScheduling(scheduleBeta.id);
    }
  });

  test('should verify that suspending one schedule leaves other active schedules executing uninterrupted', async ({ page }) => {
    dashboard = new DashboardPage(page);
    await dashboard.goto();

    // 1. Assert both schedules appear as ACTIVE in the UI table
    const alphaRow = dashboard.getTableRow(scheduleAlphaName);
    const betaRow = dashboard.getTableRow(scheduleBetaName);
    await expect(alphaRow).toBeVisible({ timeout: 10000 });
    await expect(betaRow).toBeVisible({ timeout: 10000 });
    await dashboard.expectStatus(scheduleAlphaName, 'ACTIVE');
    await dashboard.expectStatus(scheduleBetaName, 'ACTIVE');

    // 2. Wait until both schedules have recorded at least 1 execution
    await apiHelper.waitForExecutionCount(scheduleAlpha.id, 1, 15000);
    await apiHelper.waitForExecutionCount(scheduleBeta.id, 1, 15000);

    // 3. Suspend (Pause) Schedule Alpha via UI
    await dashboard.toggleScheduleStatus(scheduleAlphaName);
    await dashboard.expectStatus(scheduleAlphaName, 'PAUSED');

    // Verify Schedule Beta remains ACTIVE
    await dashboard.expectStatus(scheduleBetaName, 'ACTIVE');

    // 4. Record baseline execution counts at suspension time T0
    const alphaExecutionsT0 = (await apiHelper.getExecutions(scheduleAlpha.id)).length;
    const betaExecutionsT0 = (await apiHelper.getExecutions(scheduleBeta.id)).length;

    // 5. Wait for 6 seconds (spanning ~3 execution cycles)
    await page.waitForTimeout(6000);

    // 6. Query execution counts at T1
    const alphaExecutionsT1 = (await apiHelper.getExecutions(scheduleAlpha.id)).length;
    const betaExecutionsT1 = (await apiHelper.getExecutions(scheduleBeta.id)).length;

    // CRITICAL ASSERTIONS:
    // Beta (active) MUST have produced new executions
    expect(betaExecutionsT1).toBeGreaterThan(betaExecutionsT0);

    // Alpha (suspended) MUST NOT have produced ANY new executions
    expect(alphaExecutionsT1).toBe(alphaExecutionsT0);

    // 7. Resume Schedule Alpha via UI
    await dashboard.toggleScheduleStatus(scheduleAlphaName);
    await dashboard.expectStatus(scheduleAlphaName, 'ACTIVE');

    // 8. Wait another execution window (~4 seconds)
    await page.waitForTimeout(4000);

    // Verify Schedule Alpha has resumed producing executions
    const alphaExecutionsT2 = (await apiHelper.getExecutions(scheduleAlpha.id)).length;
    expect(alphaExecutionsT2).toBeGreaterThan(alphaExecutionsT1);
  });
});
