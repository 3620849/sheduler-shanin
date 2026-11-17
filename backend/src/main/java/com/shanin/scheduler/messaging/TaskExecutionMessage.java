package com.shanin.scheduler.messaging;

import com.shanin.scheduler.model.TaskType;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

public record TaskExecutionMessage(
    UUID executionId,
    UUID schedulingId,
    String taskName,
    TaskType taskType,
    Map<String, Object> taskParameters,
    Instant scheduledFireTime,
    Instant dispatchedAt
) {
    public static TaskExecutionMessage create(
        UUID schedulingId,
        String taskName,
        TaskType taskType,
        Map<String, Object> taskParameters,
        Instant scheduledFireTime
    ) {
        return new TaskExecutionMessage(
            UUID.randomUUID(),
            schedulingId,
            taskName,
            taskType,
            taskParameters != null ? taskParameters : Map.of(),
            scheduledFireTime,
            Instant.now()
        );
    }
}
