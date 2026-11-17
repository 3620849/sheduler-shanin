import { Page, Locator, expect } from '@playwright/test';

export class SchedulingModalPage {
  readonly page: Page;
  readonly modal: Locator;
  readonly modalTitle: Locator;
  readonly scheduleNameInput: Locator;
  readonly taskSelect: Locator;
  readonly submitButton: Locator;
  readonly cancelButton: Locator;
  readonly timingTabs: Locator;
  readonly intervalAmountInput: Locator;
  readonly intervalUnitSelect: Locator;
  readonly cronInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.modal = page.locator('.modal-overlay');
    this.modalTitle = page.locator('.modal-header .modal-title');
    this.scheduleNameInput = page.locator('#schedule-name');
    this.taskSelect = page.locator('#task-select');
    this.submitButton = page.locator('.modal-footer button.btn-primary');
    this.cancelButton = page.locator('.modal-footer button.btn-secondary');
    this.timingTabs = page.locator('.timing-tab');
    this.intervalAmountInput = page.locator('#interval-amount');
    this.intervalUnitSelect = page.locator('#interval-unit');
    this.cronInput = page.locator('#cron-expression');
  }

  async waitForOpen() {
    await expect(this.modal).toBeVisible();
  }

  async fillName(name: string) {
    await this.scheduleNameInput.fill(name);
  }

  async selectTaskType(taskType: 'LOG_TASK' | 'EMAIL_TASK' | 'DB_QUERY_TASK') {
    await this.taskSelect.selectOption(taskType);
  }

  async fillParameter(paramName: string, value: string) {
    const input = this.page.locator(`#param-${paramName}`);
    await input.fill(value);
  }

  async selectTimingMode(mode: 'ONE_TIME' | 'INTERVAL' | 'WEEKLY' | 'CRON') {
    const labelMap: Record<string, string> = {
      ONE_TIME: 'One-Time',
      INTERVAL: 'Interval',
      WEEKLY: 'Weekly',
      CRON: 'Cron',
    };
    await this.page.locator(`.timing-tab:has-text("${labelMap[mode]}")`).click();
  }

  async setInterval(amount: number, unit: 'seconds' | 'minutes' | 'hours' = 'seconds') {
    await this.selectTimingMode('INTERVAL');
    await this.intervalAmountInput.fill(amount.toString());
    if (await this.intervalUnitSelect.isVisible()) {
      await this.intervalUnitSelect.selectOption(unit);
    }
  }

  async setCron(cronExpression: string) {
    await this.selectTimingMode('CRON');
    await this.cronInput.fill(cronExpression);
  }

  async submit() {
    await this.submitButton.click();
  }

  async cancel() {
    await this.cancelButton.click();
  }

  async expectClosed() {
    await expect(this.modal).not.toBeVisible();
  }
}
