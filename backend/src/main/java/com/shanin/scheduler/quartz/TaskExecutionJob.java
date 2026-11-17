package com.shanin.scheduler.quartz;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.messaging.TaskExecutionDispatcher;
import com.shanin.scheduler.messaging.TaskExecutionMessage;
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
    private final Optional<TaskExecutionDispatcher> taskExecutionDispatcher;

    @Autowired
    public TaskExecutionJob(
            SchedulingRepository schedulingRepository,
            ObjectMapper objectMapper,
            Optional<TaskExecutionDispatcher> taskExecutionDispatcher) {
        this.schedulingRepository = schedulingRepository;
        this.objectMapper = objectMapper;
        this.taskExecutionDispatcher = taskExecutionDispatcher;
    }

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        JobDataMap jobDataMap = context.getMergedJobDataMap();
        String schedulingIdStr = jobDataMap.getString("schedulingId");
        String taskTypeStr = jobDataMap.getString("taskType");
        String taskName = jobDataMap.getString("taskName");
        String taskParametersJson = jobDataMap.getString("taskParametersJson");

        log.info("Quartz trigger fired for scheduling: id={}, type={}", schedulingIdStr, taskTypeStr);

        Map<String, Object> parameters = Map.of();
        if (taskParametersJson != null && !taskParametersJson.isBlank()) {
            try {
                parameters = objectMapper.readValue(taskParametersJson, new TypeReference<>() {});
            } catch (Exception e) {
                log.warn("Failed to parse taskParametersJson for job {}: {}", schedulingIdStr, e.getMessage());
            }
        }

        TaskType taskType = TaskType.valueOf(taskTypeStr);
        UUID schedulingId = schedulingIdStr != null ? UUID.fromString(schedulingIdStr) : null;
        if (taskName == null || taskName.isBlank()) {
            taskName = "Task-" + taskTypeStr;
        }

        Instant scheduledFireTime = context.getScheduledFireTime() != null
            ? context.getScheduledFireTime().toInstant()
            : Instant.now();

        TaskExecutionMessage message = TaskExecutionMessage.create(
            schedulingId,
            taskName,
            taskType,
            parameters,
            scheduledFireTime
        );

        if (taskExecutionDispatcher.isPresent()) {
            taskExecutionDispatcher.get().dispatch(message);
        } else {
            log.warn("TaskExecutionDispatcher not available; message not dispatched for scheduling id={}", schedulingIdStr);
        }

        // Update Scheduling entity status and nextRunAt
        if (schedulingId != null) {
            updateSchedulingStatus(schedulingId, context);
        }
    }

    private void updateSchedulingStatus(UUID schedulingId, JobExecutionContext context) {
        try {
            Optional<Scheduling> schedulingOpt = schedulingRepository.findById(schedulingId);
            if (schedulingOpt.isPresent()) {
                Scheduling scheduling = schedulingOpt.get();
                Trigger trigger = context.getTrigger();
                Date nextFireDate = trigger != null ? trigger.getNextFireTime() : null;

                if (nextFireDate != null) {
                    scheduling.setNextRunAt(nextFireDate.toInstant());
                } else {
                    scheduling.setNextRunAt(null);
                    scheduling.setStatus(ScheduleStatus.COMPLETED);
                    log.info("Scheduling id={} has no further triggers; marked as COMPLETED", schedulingId);
                }
                schedulingRepository.save(scheduling);
            }
        } catch (Exception e) {
            log.warn("Optimistic lock or concurrency when saving scheduling id={}, falling back to direct update: {}",
                schedulingId, e.getMessage());
            try {
                Trigger trigger = context.getTrigger();
                Date nextFireDate = trigger != null ? trigger.getNextFireTime() : null;
                if (nextFireDate != null) {
                    schedulingRepository.updateNextRunAt(schedulingId, nextFireDate.toInstant());
                } else {
                    schedulingRepository.updateStatusAndNextRunAt(schedulingId, ScheduleStatus.COMPLETED, null);
                }
            } catch (Exception fallbackEx) {
                log.error("Failed to update scheduling record status for id {}: {}", schedulingId, fallbackEx.getMessage());
            }
        }
    }
}
