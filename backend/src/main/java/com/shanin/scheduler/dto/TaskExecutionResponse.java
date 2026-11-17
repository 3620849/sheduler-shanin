package com.shanin.scheduler.dto;

import com.shanin.scheduler.entity.ExecutionStatus;
import com.shanin.scheduler.entity.TaskExecution;
import com.shanin.scheduler.model.TaskType;

import java.time.Instant;
import java.util.UUID;

public record TaskExecutionResponse(
    UUID id,
    UUID schedulingId,
    String taskName,
    TaskType taskType,
    ExecutionStatus status,
    String output,
    Long durationMs,
    Instant fireTime,
    Instant createdAt
) {
    public static TaskExecutionResponse from(TaskExecution execution) {
        return new TaskExecutionResponse(
            execution.getId(),
            execution.getSchedulingId(),
            execution.getTaskName(),
            execution.getTaskType(),
            execution.getStatus(),
            execution.getOutput(),
            execution.getDurationMs(),
            execution.getFireTime(),
            execution.getCreatedAt()
        );
    }
}
