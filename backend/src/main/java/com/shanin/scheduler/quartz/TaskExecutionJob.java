package com.shanin.scheduler.quartz;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.repository.SchedulingRepository;
import org.quartz.Job;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.Trigger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
public class TaskExecutionJob implements Job {

    private static final Logger log = LoggerFactory.getLogger(TaskExecutionJob.class);

    private final SchedulingRepository schedulingRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public TaskExecutionJob(SchedulingRepository schedulingRepository, ObjectMapper objectMapper) {
        this.schedulingRepository = schedulingRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        JobDataMap jobDataMap = context.getMergedJobDataMap();
        String schedulingIdStr = jobDataMap.getString("schedulingId");
        String taskTypeStr = jobDataMap.getString("taskType");
        String taskParametersJson = jobDataMap.getString("taskParametersJson");

        log.info("Executing scheduled task: id={}, type={}", schedulingIdStr, taskTypeStr);

        Map<String, Object> parameters = Map.of();
        if (taskParametersJson != null && !taskParametersJson.isBlank()) {
            try {
                parameters = objectMapper.readValue(taskParametersJson, new TypeReference<>() {});
            } catch (Exception e) {
                log.warn("Failed to parse taskParametersJson for job {}: {}", schedulingIdStr, e.getMessage());
            }
        }

        TaskType taskType = TaskType.valueOf(taskTypeStr);
        executeSimulatedAction(taskType, parameters);

        // Update Scheduling entity status and nextRunAt
        if (schedulingIdStr != null) {
            try {
                UUID id = UUID.fromString(schedulingIdStr);
                Optional<Scheduling> schedulingOpt = schedulingRepository.findById(id);
                if (schedulingOpt.isPresent()) {
                    Scheduling scheduling = schedulingOpt.get();
                    Trigger trigger = context.getTrigger();
                    Date nextFireDate = trigger != null ? trigger.getNextFireTime() : null;

                    if (nextFireDate != null) {
                        scheduling.setNextRunAt(nextFireDate.toInstant());
                    } else {
                        scheduling.setNextRunAt(null);
                        scheduling.setStatus(ScheduleStatus.COMPLETED);
                        log.info("Scheduling id={} has no further triggers; marked as COMPLETED", id);
                    }
                    schedulingRepository.save(scheduling);
                }
            } catch (Exception e) {
                log.error("Failed to update scheduling record status for id {}: {}", schedulingIdStr, e.getMessage(), e);
            }
        }
    }

    private void executeSimulatedAction(TaskType taskType, Map<String, Object> parameters) {
        switch (taskType) {
            case LOG_TASK -> {
                String message = (String) parameters.getOrDefault("message", "");
                log.info("[LOG_TASK] Executed: {}", message);
            }
            case EMAIL_TASK -> {
                String to = (String) parameters.getOrDefault("to", "unknown@domain.com");
                String subject = (String) parameters.getOrDefault("subject", "No Subject");
                String body = (String) parameters.getOrDefault("body", "");
                log.info("[EMAIL_TASK] Simulated email dispatch to: <{}>, subject: '{}', body length: {}",
                    to, subject, body != null ? body.length() : 0);
            }
            case DB_QUERY_TASK -> {
                String query = (String) parameters.getOrDefault("query", "SELECT 1");
                Object timeoutObj = parameters.getOrDefault("timeoutSeconds", 30);
                log.info("[DB_QUERY_TASK] Simulated query execution: '{}', timeout: {}s", query, timeoutObj);
            }
        }
    }
}
