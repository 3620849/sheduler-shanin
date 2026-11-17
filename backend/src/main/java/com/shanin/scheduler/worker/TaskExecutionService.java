package com.shanin.scheduler.worker;

import com.shanin.scheduler.entity.ExecutionStatus;
import com.shanin.scheduler.entity.TaskExecution;
import com.shanin.scheduler.messaging.TaskExecutionMessage;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.repository.TaskExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Map;

@Service
@ConditionalOnProperty(name = "WORKER_ENABLED", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class TaskExecutionService {

    private final TaskExecutionRepository taskExecutionRepository;

    public void execute(TaskExecutionMessage message) {
        long startTime = System.currentTimeMillis();
        log.info("Worker started executing task: executionId={}, schedulingId={}, taskName='{}', type={}",
            message.executionId(), message.schedulingId(), message.taskName(), message.taskType());

        Instant fireTime = message.scheduledFireTime() != null ? message.scheduledFireTime() : Instant.now();

        try {
            String output = executeTaskAction(message.taskType(), message.taskParameters());
            long durationMs = System.currentTimeMillis() - startTime;

            TaskExecution execution = TaskExecution.builder()
                .schedulingId(message.schedulingId())
                .taskName(message.taskName())
                .taskType(message.taskType())
                .status(ExecutionStatus.SUCCESS)
                .output(output)
                .durationMs(durationMs)
                .fireTime(fireTime)
                .build();
            taskExecutionRepository.save(execution);

            log.info("Worker successfully completed task: executionId={}, schedulingId={}, type={}, durationMs={}",
                message.executionId(), message.schedulingId(), message.taskType(), durationMs);
        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - startTime;
            log.error("Worker failed executing task: executionId={}, schedulingId={}, type={}, durationMs={}, error={}",
                message.executionId(), message.schedulingId(), message.taskType(), durationMs, e.getMessage(), e);

            TaskExecution execution = TaskExecution.builder()
                .schedulingId(message.schedulingId())
                .taskName(message.taskName())
                .taskType(message.taskType())
                .status(ExecutionStatus.FAILED)
                .output("Execution failed: " + e.getMessage())
                .durationMs(durationMs)
                .fireTime(fireTime)
                .build();
            taskExecutionRepository.save(execution);

            throw e;
        }
    }

    private String executeTaskAction(TaskType taskType, Map<String, Object> parameters) {
        Map<String, Object> params = parameters != null ? parameters : Map.of();
        switch (taskType) {
            case LOG_TASK -> {
                String msg = (String) params.getOrDefault("message", "");
                String output = "[LOG_TASK] Executed: " + msg;
                log.info(output);
                return output;
            }
            case EMAIL_TASK -> {
                String to = (String) params.getOrDefault("to", "unknown@domain.com");
                String subject = (String) params.getOrDefault("subject", "No Subject");
                String body = (String) params.getOrDefault("body", "");
                String output = String.format("[EMAIL_TASK] Simulated email dispatch to: <%s>, subject: '%s', body length: %d",
                    to, subject, body != null ? body.length() : 0);
                log.info(output);
                return output;
            }
            case DB_QUERY_TASK -> {
                String query = (String) params.getOrDefault("query", "SELECT 1");
                Object timeoutObj = params.getOrDefault("timeoutSeconds", 30);
                String output = String.format("[DB_QUERY_TASK] Simulated query execution: '%s', timeout: %ss", query, timeoutObj);
                log.info(output);
                return output;
            }
            default -> {
                String output = "Unknown task type: " + taskType;
                log.warn(output);
                return output;
            }
        }
    }
}
