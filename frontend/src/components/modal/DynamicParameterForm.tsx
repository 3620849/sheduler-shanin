import React from 'react';
import { TaskDefinitionResponse, TaskType, ParameterDefinition } from '../../types/task';

interface DynamicParameterFormProps {
  tasks: TaskDefinitionResponse[];
  selectedTaskType: TaskType;
  onTaskTypeChange: (type: TaskType) => void;
  parameters: Record<string, any>;
  onParameterChange: (name: string, value: any) => void;
  errors: Record<string, string>;
  disabled?: boolean;
}

export const DynamicParameterForm: React.FC<DynamicParameterFormProps> = ({
  tasks,
  selectedTaskType,
  onTaskTypeChange,
  parameters,
  onParameterChange,
  errors,
  disabled = false,
}) => {
  const currentTask = tasks.find((t) => t.taskType === selectedTaskType) || tasks[0];

  const handleInputChange = (param: ParameterDefinition, rawVal: string) => {
    if (param.type === 'NUMBER') {
      if (rawVal === '') {
        onParameterChange(param.name, undefined);
      } else {
        const parsed = Number(rawVal);
        onParameterChange(param.name, isNaN(parsed) ? rawVal : parsed);
      }
    } else {
      onParameterChange(param.name, rawVal);
    }
  };

  return (
    <div className="form-section">
      <div className="section-title">2. Task Selection & Parameters</div>
      <div className="section-subtitle">
        Choose a predefined executable task and configure its required parameters.
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="task-select">
          Task Type <span className="required-star">*</span>
        </label>
        <select
          id="task-select"
          className="form-select"
          value={selectedTaskType}
          disabled={disabled}
          onChange={(e) => onTaskTypeChange(e.target.value as TaskType)}
        >
          {tasks.map((task) => (
            <option key={task.taskType} value={task.taskType}>
              {task.displayName} ({task.taskType})
            </option>
          ))}
        </select>
        {currentTask && (
          <div className="form-helper" style={{ marginTop: '0.25rem' }}>
            {currentTask.description}
          </div>
        )}
      </div>

      {currentTask && currentTask.parameters && currentTask.parameters.length > 0 && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: 'rgba(15, 23, 42, 0.4)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
          }}
        >
          <div
            style={{
              fontSize: '0.8125rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '0.75rem',
            }}
          >
            Dynamic Task Schema Fields
          </div>

          {currentTask.parameters.map((param) => {
            const val = parameters[param.name] !== undefined ? parameters[param.name] : '';
            const error = errors[param.name];
            const isTextarea = param.name === 'query' || param.name === 'body';

            return (
              <div key={param.name} className="form-group">
                <label className="form-label" htmlFor={`param-${param.name}`}>
                  {param.name}
                  {param.required && <span className="required-star">*</span>}
                  <span
                    style={{
                      marginLeft: '0.5rem',
                      fontSize: '0.75rem',
                      fontWeight: 400,
                      color: 'var(--text-muted)',
                    }}
                  >
                    ({param.type.toLowerCase()}{param.format ? `, format: ${param.format}` : ''})
                  </span>
                </label>

                {isTextarea ? (
                  <textarea
                    id={`param-${param.name}`}
                    className={`form-textarea ${error ? 'has-error' : ''}`}
                    rows={3}
                    placeholder={param.description}
                    value={val}
                    onChange={(e) => handleInputChange(param, e.target.value)}
                  />
                ) : (
                  <input
                    id={`param-${param.name}`}
                    type={param.type === 'NUMBER' ? 'number' : param.format === 'email' ? 'email' : 'text'}
                    className={`form-input ${error ? 'has-error' : ''}`}
                    placeholder={param.defaultValue !== null && param.defaultValue !== undefined ? `Default: ${param.defaultValue}` : param.description}
                    value={val}
                    min={param.min !== null && param.min !== undefined ? param.min : undefined}
                    max={param.max !== null && param.max !== undefined ? param.max : undefined}
                    onChange={(e) => handleInputChange(param, e.target.value)}
                  />
                )}

                {error ? (
                  <div className="form-error">{error}</div>
                ) : (
                  <div className="form-helper">{param.description}</div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
