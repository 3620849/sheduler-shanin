package com.shanin.scheduler.worker;

import com.shanin.scheduler.messaging.TaskExecutionMessage;
import com.shanin.scheduler.model.TaskType;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
@ConditionalOnProperty(name = "WORKER_ENABLED", havingValue = "true", matchIfMissing = true)
@Slf4j
public class TaskExecutionService {

    public void execute(TaskExecutionMessage message) {
        long startTime = System.currentTimeMillis();
        log.info("Worker started executing task: executionId={}, schedulingId={}, taskName='{}', type={}",
            message.executionId(), message.schedulingId(), message.taskName(), message.taskType());

        try {
            executeTaskAction(message.taskType(), message.taskParameters());
            long durationMs = System.currentTimeMillis() - startTime;
            log.info("Worker successfully completed task: executionId={}, schedulingId={}, type={}, durationMs={}",
                message.executionId(), message.schedulingId(), message.taskType(), durationMs);
        } catch (Exception e) {
            long durationMs = System.currentTimeMillis() - startTime;
            log.error("Worker failed executing task: executionId={}, schedulingId={}, type={}, durationMs={}, error={}",
                message.executionId(), message.schedulingId(), message.taskType(), durationMs, e.getMessage(), e);
            throw e;
        }
    }

    private void executeTaskAction(TaskType taskType, Map<String, Object> parameters) {
        Map<String, Object> params = parameters != null ? parameters : Map.of();
        switch (taskType) {
            case LOG_TASK -> {
                String message = (String) params.getOrDefault("message", "");
                log.info("[LOG_TASK] Executed: {}", message);
            }
            case EMAIL_TASK -> {
                String to = (String) params.getOrDefault("to", "unknown@domain.com");
                String subject = (String) params.getOrDefault("subject", "No Subject");
                String body = (String) params.getOrDefault("body", "");
                log.info("[EMAIL_TASK] Simulated email dispatch to: <{}>, subject: '{}', body length: {}",
                    to, subject, body != null ? body.length() : 0);
            }
            case DB_QUERY_TASK -> {
                String query = (String) params.getOrDefault("query", "SELECT 1");
                Object timeoutObj = params.getOrDefault("timeoutSeconds", 30);
                log.info("[DB_QUERY_TASK] Simulated query execution: '{}', timeout: {}s", query, timeoutObj);
            }
        }
    }
}
