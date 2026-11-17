import { test, expect } from '@playwright/test';
import { DashboardPage } from '../page-objects/DashboardPage';
import { SchedulingModalPage } from '../page-objects/SchedulingModalPage';

test.describe('Schedule Lifecycle Actions (Pause, Resume, Edit, Delete)', () => {
  let dashboard: DashboardPage;
  let modal: SchedulingModalPage;
  const scheduleName = `E2E-Lifecycle-${Date.now()}`;

  test.beforeEach(async ({ page }) => {
    dashboard = new DashboardPage(page);
    modal = new SchedulingModalPage(page);
    await dashboard.goto();
  });

  test('should create, pause, resume, edit, and delete a schedule', async () => {
    // 1. Create schedule
    await dashboard.openCreateModal();
    await modal.waitForOpen();
    await modal.fillName(scheduleName);
    await modal.selectTaskType('LOG_TASK');
    await modal.fillParameter('message', 'Lifecycle Test Initial');
    await modal.setInterval(30, 'seconds');
    await modal.submit();
    await modal.expectClosed();

    const row = dashboard.getTableRow(scheduleName);
    await expect(row).toBeVisible({ timeout: 10000 });
    await dashboard.expectStatus(scheduleName, 'ACTIVE');

    // 2. Pause schedule
    await dashboard.toggleScheduleStatus(scheduleName);
    await dashboard.expectStatus(scheduleName, 'PAUSED');

    // 3. Resume schedule
    await dashboard.toggleScheduleStatus(scheduleName);
    await dashboard.expectStatus(scheduleName, 'ACTIVE');

    // 4. Edit schedule
    await dashboard.openEditModal(scheduleName);
    await modal.waitForOpen();
    const updatedName = `${scheduleName}-Updated`;
    await modal.fillName(updatedName);
    await modal.fillParameter('message', 'Lifecycle Test Updated Message');
    await modal.submit();
    await modal.expectClosed();

    // Verify updated row
    const updatedRow = dashboard.getTableRow(updatedName);
    await expect(updatedRow).toBeVisible({ timeout: 10000 });

    // 5. Delete schedule with cancel check
    await dashboard.deleteSchedule(updatedName);
    await dashboard.cancelDelete();
    await expect(updatedRow).toBeVisible();

    // 6. Delete schedule with confirmation
    await dashboard.deleteSchedule(updatedName);
    await dashboard.confirmDelete();
    await expect(updatedRow).not.toBeVisible({ timeout: 10000 });
  });
});
