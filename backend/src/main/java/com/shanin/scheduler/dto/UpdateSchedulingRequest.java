package com.shanin.scheduler.dto;

import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.model.TaskType;
import jakarta.validation.constraints.Size;

import java.util.Map;

public record UpdateSchedulingRequest(
    @Size(max = 255, message = "Schedule name must not exceed 255 characters")
    String name,

    TaskType taskType,

    Map<String, Object> taskParameters,

    ScheduleType scheduleType,

    Map<String, Object> scheduleConfig,

    ScheduleStatus status
) {
}
