import { Page, Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly brandTitle: Locator;
  readonly createSchedulingButton: Locator;
  readonly refreshButton: Locator;
  readonly executionsHeaderButton: Locator;
  readonly dataTable: Locator;
  readonly emptyStateCreateButton: Locator;
  readonly confirmModal: Locator;
  readonly confirmButton: Locator;
  readonly cancelButton: Locator;
  readonly toastContainer: Locator;
  readonly executionsDrawer: Locator;
  readonly closeDrawerButton: Locator;
  readonly paginationMenu: Locator;

  constructor(page: Page) {
    this.page = page;
    this.brandTitle = page.locator('h1.brand-title');
    this.createSchedulingButton = page.locator('header.dashboard-header button:has-text("Create Scheduling")');
    this.refreshButton = page.locator('header.dashboard-header button:has-text("Refresh")');
    this.executionsHeaderButton = page.locator('header.dashboard-header button:has-text("Executions")');
    this.dataTable = page.locator('table.data-table');
    this.emptyStateCreateButton = page.locator('div.empty-state button:has-text("Create First Scheduling")');
    this.confirmModal = page.locator('.modal-overlay');
    this.confirmButton = page.locator('.modal-footer button.btn-danger, .modal-footer button:has-text("Delete")');
    this.cancelButton = page.locator('.modal-footer button:has-text("Cancel")');
    this.toastContainer = page.locator('.toast-container');
    this.executionsDrawer = page.locator('div.drawer-right');
    this.closeDrawerButton = page.locator('[data-testid="close-drawer"]');
    this.paginationMenu = page.locator('[data-testid="pagination-menu"]');
  }

  async goto() {
    await this.page.goto('/');
    await this.page.waitForLoadState('networkidle');
  }

  async openCreateModal() {
    const btn = this.page.locator('button:has-text("Create Scheduling"), button:has-text("Create First Scheduling")').first();
    await btn.click();
  }

  async getStatCardValue(labelSubstring: string): Promise<string> {
    const card = this.page.locator('.stat-card', { hasText: labelSubstring });
    return (await card.locator('.stat-value').textContent()) || '0';
  }

  getTableRow(scheduleName: string): Locator {
    return this.page.locator(`table.data-table tbody tr:has-text("${scheduleName}")`);
  }

  async toggleScheduleStatus(scheduleName: string) {
    const row = this.getTableRow(scheduleName);
    const toggleButton = row.locator('button[title="Pause scheduling"], button[title="Resume scheduling"]');
    await toggleButton.click();
  }

  async openEditModal(scheduleName: string) {
    const row = this.getTableRow(scheduleName);
    const editButton = row.locator('button[title="Edit scheduling"]');
    await editButton.click();
  }

  async openScheduleExecutions(scheduleName: string) {
    const row = this.getTableRow(scheduleName);
    const executionsButton = row.locator('button[title="View executions"]');
    await executionsButton.click();
  }

  async deleteSchedule(scheduleName: string) {
    const row = this.getTableRow(scheduleName);
    const deleteButton = row.locator('button[title="Delete scheduling"]');
    await deleteButton.click();
  }

  async confirmDelete() {
    await expect(this.confirmButton).toBeVisible();
    await this.confirmButton.click();
  }

  async cancelDelete() {
    await expect(this.cancelButton).toBeVisible();
    await this.cancelButton.click();
  }

  async expectStatus(scheduleName: string, expectedStatus: 'ACTIVE' | 'PAUSED' | 'COMPLETED') {
    const row = this.getTableRow(scheduleName);
    const badge = row.locator('.badge');
    await expect(badge.filter({ hasText: expectedStatus })).toBeVisible();
  }
}
