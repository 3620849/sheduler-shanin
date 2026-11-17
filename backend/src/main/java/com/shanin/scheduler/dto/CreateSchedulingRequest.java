package com.shanin.scheduler.dto;

import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.model.TaskType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record CreateSchedulingRequest(
    @NotBlank(message = "Schedule name is required")
    @Size(max = 255, message = "Schedule name must not exceed 255 characters")
    String name,

    @NotNull(message = "taskType is required")
    TaskType taskType,

    Map<String, Object> taskParameters,

    @NotNull(message = "scheduleType is required")
    ScheduleType scheduleType,

    Map<String, Object> scheduleConfig
) {
}
