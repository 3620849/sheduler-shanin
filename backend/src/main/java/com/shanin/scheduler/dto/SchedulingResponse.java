package com.shanin.scheduler.dto;

import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.model.TaskType;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record SchedulingResponse(
    UUID id,
    String name,
    TaskType taskType,
    Map<String, Object> taskParameters,
    ScheduleType scheduleType,
    Map<String, Object> scheduleConfig,
    ScheduleStatus status,
    Instant nextRunAt,
    Instant createdAt,
    Instant updatedAt
) {
    public static SchedulingResponse from(Scheduling scheduling) {
        return new SchedulingResponse(
            scheduling.getId(),
            scheduling.getName(),
            scheduling.getTaskType(),
            scheduling.getTaskParameters(),
            scheduling.getScheduleType(),
            scheduling.getScheduleConfig(),
            scheduling.getStatus(),
            scheduling.getNextRunAt(),
            scheduling.getCreatedAt(),
            scheduling.getUpdatedAt()
        );
    }
}
