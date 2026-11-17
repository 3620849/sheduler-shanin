import { test, expect } from '@playwright/test';
import { DashboardPage } from '../page-objects/DashboardPage';
import { SchedulingModalPage } from '../page-objects/SchedulingModalPage';

test.describe('Create Scheduling Dynamic Workflows', () => {
  let dashboard: DashboardPage;
  let modal: SchedulingModalPage;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    modal = new SchedulingModalPage(page);
    await dashboard.goto();
  });

  test('should validate required fields before submitting', async () => {
    await dashboard.openCreateModal();
    await modal.waitForOpen();

    // Attempt submitting without schedule name
    await modal.submit();

    // Verify validation error
    const nameError = modal.page.locator('.form-error', { hasText: 'Schedule name is required' });
    await expect(nameError).toBeVisible();

    await modal.cancel();
    await modal.expectClosed();
  });

  test('should create a LOG_TASK schedule with interval timing', async () => {
    const scheduleName = `E2E-Log-${Date.now()}`;

    await dashboard.openCreateModal();
    await modal.waitForOpen();

    await modal.fillName(scheduleName);
    await modal.selectTaskType('LOG_TASK');
    await modal.fillParameter('message', 'E2E Automated Log Message');
    await modal.setInterval(10, 'seconds');

    await modal.submit();
    await modal.expectClosed();

    // Verify row appears in dashboard
    const row = dashboard.getTableRow(scheduleName);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.locator('.badge', { hasText: 'ACTIVE' })).toBeVisible();
    await expect(row.locator('.badge', { hasText: 'LOG_TASK' })).toBeVisible();
  });

  test('should create an EMAIL_TASK schedule with cron expression', async () => {
    const scheduleName = `E2E-Email-${Date.now()}`;

    await dashboard.openCreateModal();
    await modal.waitForOpen();

    await modal.fillName(scheduleName);
    await modal.selectTaskType('EMAIL_TASK');
    await modal.fillParameter('to', 'e2e-alert@example.com');
    await modal.fillParameter('subject', 'E2E Alert Notification');
    await modal.fillParameter('body', 'This is an automated E2E system alert body.');

    // Use cron preset or custom expression
    await modal.setCron('0 0 12 ? * MON-FRI');

    await modal.submit();
    await modal.expectClosed();

    const row = dashboard.getTableRow(scheduleName);
    await expect(row).toBeVisible({ timeout: 10000 });
    await expect(row.locator('.badge', { hasText: 'EMAIL_TASK' })).toBeVisible();
  });
});
