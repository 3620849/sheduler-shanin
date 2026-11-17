import React from 'react';

interface GeneralInfoStepProps {
  name: string;
  onNameChange: (value: string) => void;
  error?: string;
}

export const GeneralInfoStep: React.FC<GeneralInfoStepProps> = ({
  name,
  onNameChange,
  error,
}) => {
  return (
    <div className="form-section">
      <div className="section-title">1. General Information</div>
      <div className="section-subtitle">
        Define a descriptive name for this scheduled task.
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="schedule-name">
          Schedule Name <span className="required-star">*</span>
        </label>
        <input
          id="schedule-name"
          type="text"
          className={`form-input ${error ? 'has-error' : ''}`}
          placeholder="e.g., Nightly DB Health Check, Customer Weekly Digest"
          value={name}
          maxLength={255}
          onChange={(e) => onNameChange(e.target.value)}
        />
        {error && <div className="form-error">{error}</div>}
        <div className="form-helper">Maximum 255 characters. Must be unique and descriptive.</div>
      </div>
    </div>
  );
};
