import React from 'react';
import { ScheduleType } from '../../types/scheduling';
import { Clock, Calendar, Repeat, Hash } from 'lucide-react';

interface ScheduleTimingSelectorProps {
  scheduleType: ScheduleType;
  onScheduleTypeChange: (type: ScheduleType) => void;
  config: Record<string, any>;
  onConfigChange: (config: Record<string, any>) => void;
  errors: Record<string, string>;
}

const DAYS_OF_WEEK = [
  { code: 'MON', label: 'Mon' },
  { code: 'TUE', label: 'Tue' },
  { code: 'WED', label: 'Wed' },
  { code: 'THU', label: 'Thu' },
  { code: 'FRI', label: 'Fri' },
  { code: 'SAT', label: 'Sat' },
  { code: 'SUN', label: 'Sun' },
];

const CRON_PRESETS = [
  { label: 'Every 1 min', cron: '0 * * ? * *' },
  { label: 'Every 5 min', cron: '0 */5 * ? * *' },
  { label: 'Every 15 min', cron: '0 */15 * ? * *' },
  { label: 'Hourly', cron: '0 0 * ? * *' },
  { label: 'Daily at 00:00', cron: '0 0 0 ? * *' },
  { label: 'Weekdays 9:00 AM', cron: '0 0 9 ? * MON-FRI' },
];

export const ScheduleTimingSelector: React.FC<ScheduleTimingSelectorProps> = ({
  scheduleType,
  onScheduleTypeChange,
  config,
  onConfigChange,
  errors,
}) => {
  // Format ISO startAt to datetime-local input format (YYYY-MM-DDTHH:mm)
  const getDatetimeLocalValue = (isoStr?: string) => {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return '';
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const handleStartAtChange = (val: string) => {
    if (!val) {
      onConfigChange({ ...config, startAt: '' });
      return;
    }
    try {
      const d = new Date(val);
      onConfigChange({ ...config, startAt: d.toISOString() });
    } catch {
      onConfigChange({ ...config, startAt: val });
    }
  };

  // Interval state computation
  const intervalSeconds = config.intervalSeconds !== undefined ? Number(config.intervalSeconds) : 60;
  const getIntervalUnitAndAmount = () => {
    if (intervalSeconds % 3600 === 0 && intervalSeconds >= 3600) {
      return { amount: intervalSeconds / 3600, unit: 'hours' };
    }
    if (intervalSeconds % 60 === 0 && intervalSeconds >= 60) {
      return { amount: intervalSeconds / 60, unit: 'minutes' };
    }
    return { amount: intervalSeconds, unit: 'seconds' };
  };

  const currentInterval = getIntervalUnitAndAmount();

  const handleIntervalAmountChange = (newAmount: number, currentUnit: string) => {
    const multiplier = currentUnit === 'hours' ? 3600 : currentUnit === 'minutes' ? 60 : 1;
    onConfigChange({ ...config, intervalSeconds: Math.max(1, newAmount * multiplier) });
  };

  const handleIntervalUnitChange = (newUnit: string, currentAmount: number) => {
    const multiplier = newUnit === 'hours' ? 3600 : newUnit === 'minutes' ? 60 : 1;
    onConfigChange({ ...config, intervalSeconds: Math.max(1, currentAmount * multiplier) });
  };

  // Weekly days toggle
  const selectedDays: string[] = Array.isArray(config.daysOfWeek) ? config.daysOfWeek : ['MON'];
  const toggleDay = (day: string) => {
    const nextDays = selectedDays.includes(day)
      ? selectedDays.filter((d) => d !== day)
      : [...selectedDays, day];
    onConfigChange({ ...config, daysOfWeek: nextDays });
  };

  return (
    <div className="form-section">
      <div className="section-title">3. Schedule Timing Configuration</div>
      <div className="section-subtitle">
        Select how and when this task will be triggered by Quartz Scheduler.
      </div>

      {/* Tabs */}
      <div className="timing-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          className={`timing-tab ${scheduleType === 'ONE_TIME' ? 'active' : ''}`}
          onClick={() => onScheduleTypeChange('ONE_TIME')}
        >
          <Calendar size={16} /> One-Time
        </button>
        <button
          type="button"
          role="tab"
          className={`timing-tab ${scheduleType === 'INTERVAL' ? 'active' : ''}`}
          onClick={() => onScheduleTypeChange('INTERVAL')}
        >
          <Repeat size={16} /> Interval
        </button>
        <button
          type="button"
          role="tab"
          className={`timing-tab ${scheduleType === 'WEEKLY' ? 'active' : ''}`}
          onClick={() => onScheduleTypeChange('WEEKLY')}
        >
          <Clock size={16} /> Weekly
        </button>
        <button
          type="button"
          role="tab"
          className={`timing-tab ${scheduleType === 'CRON' ? 'active' : ''}`}
          onClick={() => onScheduleTypeChange('CRON')}
        >
          <Hash size={16} /> Cron
        </button>
      </div>

      {/* ONE_TIME */}
      {scheduleType === 'ONE_TIME' && (
        <div className="form-group">
          <label className="form-label" htmlFor="start-at-input">
            Execution Date & Time <span className="required-star">*</span>
          </label>
          <input
            id="start-at-input"
            type="datetime-local"
            className={`form-input ${errors.startAt ? 'has-error' : ''}`}
            value={getDatetimeLocalValue(config.startAt)}
            onChange={(e) => handleStartAtChange(e.target.value)}
          />
          {errors.startAt ? (
            <div className="form-error">{errors.startAt}</div>
          ) : (
            <div className="form-helper">
              The task will fire once at the specified timestamp and then transition to COMPLETED.
            </div>
          )}
        </div>
      )}

      {/* INTERVAL */}
      {scheduleType === 'INTERVAL' && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="interval-amount">
                Interval Duration <span className="required-star">*</span>
              </label>
              <input
                id="interval-amount"
                type="number"
                min={1}
                className={`form-input ${errors.intervalSeconds ? 'has-error' : ''}`}
                value={currentInterval.amount}
                onChange={(e) =>
                  handleIntervalAmountChange(Number(e.target.value) || 1, currentInterval.unit)
                }
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="interval-unit">
                Unit
              </label>
              <select
                id="interval-unit"
                className="form-select"
                value={currentInterval.unit}
                onChange={(e) =>
                  handleIntervalUnitChange(e.target.value, currentInterval.amount)
                }
              >
                <option value="seconds">Seconds</option>
                <option value="minutes">Minutes</option>
                <option value="hours">Hours</option>
              </select>
            </div>
          </div>
          {errors.intervalSeconds ? (
            <div className="form-error">{errors.intervalSeconds}</div>
          ) : (
            <div className="form-helper">
              Total interval: <strong>{intervalSeconds} seconds</strong>. Quartz simple schedule repeating forever.
            </div>
          )}
        </div>
      )}

      {/* WEEKLY */}
      {scheduleType === 'WEEKLY' && (
        <div>
          <div className="form-group">
            <label className="form-label">
              Days of Week <span className="required-star">*</span>
            </label>
            <div className="days-chips-group">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = selectedDays.includes(d.code);
                return (
                  <button
                    key={d.code}
                    type="button"
                    className={`day-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleDay(d.code)}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            {errors.daysOfWeek && <div className="form-error">{errors.daysOfWeek}</div>}
          </div>

          <div className="form-group" style={{ marginTop: '1rem' }}>
            <label className="form-label" htmlFor="time-of-day">
              Time of Day (24-Hour) <span className="required-star">*</span>
            </label>
            <input
              id="time-of-day"
              type="time"
              className={`form-input ${errors.timeOfDay ? 'has-error' : ''}`}
              style={{ maxWidth: '180px' }}
              value={config.timeOfDay || '09:00'}
              onChange={(e) => onConfigChange({ ...config, timeOfDay: e.target.value })}
            />
            {errors.timeOfDay ? (
              <div className="form-error">{errors.timeOfDay}</div>
            ) : (
              <div className="form-helper">
                Task executes every week on selected days at {config.timeOfDay || '09:00'}.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CRON */}
      {scheduleType === 'CRON' && (
        <div className="form-group">
          <label className="form-label" htmlFor="cron-expression">
            Quartz Cron Expression <span className="required-star">*</span>
          </label>
          <input
            id="cron-expression"
            type="text"
            className={`form-input ${errors.cronExpression ? 'has-error' : ''}`}
            placeholder="0 0 12 ? * MON-FRI"
            value={config.cronExpression || ''}
            onChange={(e) => onConfigChange({ ...config, cronExpression: e.target.value })}
          />
          {errors.cronExpression && <div className="form-error">{errors.cronExpression}</div>}

          <div className="form-helper" style={{ marginTop: '0.375rem' }}>
            Format: <code>[seconds] [minutes] [hours] [day-of-month] [month] [day-of-week]</code>
          </div>

          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Quick Presets:
            </div>
            <div className="preset-buttons-group">
              {CRON_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="preset-btn"
                  onClick={() => onConfigChange({ ...config, cronExpression: p.cron })}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
