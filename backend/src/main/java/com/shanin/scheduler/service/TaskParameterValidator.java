package com.shanin.scheduler.service;

import com.shanin.scheduler.exception.TaskValidationException;
import com.shanin.scheduler.exception.TaskValidationException.ValidationErrorDetail;
import com.shanin.scheduler.model.ParameterDefinition;
import com.shanin.scheduler.model.ParameterType;
import com.shanin.scheduler.model.PredefinedTasks;
import com.shanin.scheduler.model.TaskDefinition;
import com.shanin.scheduler.model.TaskType;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

@Component
public class TaskParameterValidator {

    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );

    public Map<String, Object> validateAndNormalize(TaskType taskType, Map<String, Object> inputParameters) {
        if (taskType == null) {
            throw new TaskValidationException("taskType cannot be null",
                List.of(new ValidationErrorDetail("taskType", "taskType is required")));
        }

        TaskDefinition taskDefinition = PredefinedTasks.getByType(taskType)
            .orElseThrow(() -> new TaskValidationException("Unknown task type: " + taskType,
                List.of(new ValidationErrorDetail("taskType", "Unknown task type: " + taskType))));

        Map<String, Object> params = inputParameters != null ? new HashMap<>(inputParameters) : new HashMap<>();
        List<ValidationErrorDetail> errors = new ArrayList<>();

        for (ParameterDefinition paramDef : taskDefinition.parameters()) {
            String paramName = paramDef.name();
            Object value = params.get(paramName);

            // Check required
            if (value == null || (value instanceof String s && s.trim().isEmpty())) {
                if (paramDef.required()) {
                    errors.add(new ValidationErrorDetail(paramName, "Parameter '" + paramName + "' is required"));
                    continue;
                } else if (paramDef.defaultValue() != null) {
                    params.put(paramName, paramDef.defaultValue());
                    continue;
                } else {
                    continue;
                }
            }

            // Type and format validation
            if (paramDef.type() == ParameterType.STRING) {
                if (!(value instanceof String)) {
                    errors.add(new ValidationErrorDetail(paramName, "Parameter '" + paramName + "' must be a string"));
                } else {
                    String strVal = ((String) value).trim();
                    if ("email".equalsIgnoreCase(paramDef.format())) {
                        if (!EMAIL_PATTERN.matcher(strVal).matches()) {
                            errors.add(new ValidationErrorDetail(paramName, "Parameter '" + paramName + "' must be a valid email address"));
                        }
                    }
                    params.put(paramName, strVal);
                }
            } else if (paramDef.type() == ParameterType.NUMBER) {
                Double numVal = null;
                if (value instanceof Number n) {
                    numVal = n.doubleValue();
                } else if (value instanceof String s) {
                    try {
                        numVal = Double.parseDouble(s.trim());
                    } catch (NumberFormatException e) {
                        errors.add(new ValidationErrorDetail(paramName, "Parameter '" + paramName + "' must be a valid number"));
                    }
                } else {
                    errors.add(new ValidationErrorDetail(paramName, "Parameter '" + paramName + "' must be a valid number"));
                }

                if (numVal != null) {
                    if (paramDef.min() != null && numVal < paramDef.min()) {
                        errors.add(new ValidationErrorDetail(paramName,
                            "Parameter '" + paramName + "' cannot be less than " + paramDef.min()));
                    }
                    if (paramDef.max() != null && numVal > paramDef.max()) {
                        errors.add(new ValidationErrorDetail(paramName,
                            "Parameter '" + paramName + "' cannot be greater than " + paramDef.max()));
                    }
                    params.put(paramName, numVal);
                }
            }
        }

        if (!errors.isEmpty()) {
            throw new TaskValidationException("Validation failed for task '" + taskType + "' parameters", errors);
        }

        return params;
    }
}
