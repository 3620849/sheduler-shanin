package com.shanin.scheduler.service;

import com.shanin.scheduler.dto.CreateSchedulingRequest;
import com.shanin.scheduler.dto.SchedulingResponse;
import com.shanin.scheduler.dto.UpdateSchedulingRequest;
import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.exception.ResourceNotFoundException;
import com.shanin.scheduler.exception.TaskValidationException;
import com.shanin.scheduler.exception.TaskValidationException.ValidationErrorDetail;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.quartz.QuartzSchedulerService;
import com.shanin.scheduler.repository.SchedulingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.CronExpression;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "SCHEDULER_ENABLED", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class SchedulingService {

    private final SchedulingRepository schedulingRepository;
    private final TaskParameterValidator taskParameterValidator;
    private final QuartzSchedulerService quartzSchedulerService;

    @Transactional(readOnly = true)
    public List<SchedulingResponse> getAllSchedulings() {
        return schedulingRepository.findAll().stream()
            .map(SchedulingResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public SchedulingResponse getSchedulingById(UUID id) {
        Scheduling scheduling = findEntityById(id);
        return SchedulingResponse.from(scheduling);
    }

    @Transactional
    public SchedulingResponse createScheduling(CreateSchedulingRequest request) {
        log.info("Creating scheduling: name='{}', taskType={}, scheduleType={}",
            request.name(), request.taskType(), request.scheduleType());

        // 1. Validate task parameters against task schema
        Map<String, Object> validatedParams = taskParameterValidator.validateAndNormalize(
            request.taskType(),
            request.taskParameters()
        );

        // 2. Validate scheduleConfig
        validateScheduleConfig(request.scheduleType(), request.scheduleConfig());

        // 3. Build & persist entity
        Scheduling scheduling = Scheduling.builder()
            .name(request.name())
            .taskType(request.taskType())
            .taskParameters(validatedParams)
            .scheduleType(request.scheduleType())
            .scheduleConfig(request.scheduleConfig() != null ? request.scheduleConfig() : Map.of())
            .status(ScheduleStatus.ACTIVE)
            .build();

        scheduling = schedulingRepository.save(scheduling);

        // 4. Schedule with Quartz
        try {
            Instant nextRunAt = quartzSchedulerService.schedule(scheduling);
            scheduling.setNextRunAt(nextRunAt);
            scheduling = schedulingRepository.save(scheduling);
        } catch (Exception e) {
            log.error("Failed to schedule Quartz job for id {}: {}", scheduling.getId(), e.getMessage());
            throw e;
        }

        return SchedulingResponse.from(scheduling);
    }

    @Transactional
    public SchedulingResponse updateScheduling(UUID id, UpdateSchedulingRequest request) {
        log.info("Updating scheduling: id={}", id);
        Scheduling scheduling = findEntityById(id);

        boolean timingOrTaskChanged = false;

        if (request.name() != null && !request.name().isBlank()) {
            scheduling.setName(request.name().trim());
        }

        TaskType effectiveTaskType = request.taskType() != null ? request.taskType() : scheduling.getTaskType();
        if (request.taskType() != null && request.taskType() != scheduling.getTaskType()) {
            scheduling.setTaskType(request.taskType());
            timingOrTaskChanged = true;
        }

        if (request.taskParameters() != null) {
            Map<String, Object> validatedParams = taskParameterValidator.validateAndNormalize(
                effectiveTaskType,
                request.taskParameters()
            );
            scheduling.setTaskParameters(validatedParams);
            timingOrTaskChanged = true;
        }

        ScheduleType effectiveScheduleType = request.scheduleType() != null ? request.scheduleType() : scheduling.getScheduleType();
        if (request.scheduleType() != null && request.scheduleType() != scheduling.getScheduleType()) {
            scheduling.setScheduleType(request.scheduleType());
            timingOrTaskChanged = true;
        }

        if (request.scheduleConfig() != null) {
            validateScheduleConfig(effectiveScheduleType, request.scheduleConfig());
            scheduling.setScheduleConfig(request.scheduleConfig());
            timingOrTaskChanged = true;
        }

        if (request.status() != null && request.status() != scheduling.getStatus()) {
            ScheduleStatus oldStatus = scheduling.getStatus();
            scheduling.setStatus(request.status());
            if (request.status() == ScheduleStatus.PAUSED) {
                quartzSchedulerService.pause(scheduling.getId());
            } else if (request.status() == ScheduleStatus.ACTIVE && oldStatus == ScheduleStatus.PAUSED) {
                quartzSchedulerService.resume(scheduling.getId());
            }
        }

        if (timingOrTaskChanged && scheduling.getStatus() == ScheduleStatus.ACTIVE) {
            Instant nextRunAt = quartzSchedulerService.reschedule(scheduling);
            scheduling.setNextRunAt(nextRunAt);
        }

        scheduling = schedulingRepository.save(scheduling);
        return SchedulingResponse.from(scheduling);
    }

    @Transactional
    public void deleteScheduling(UUID id) {
        log.info("Deleting scheduling: id={}", id);
        Scheduling scheduling = findEntityById(id);

        quartzSchedulerService.unschedule(scheduling.getId());
        schedulingRepository.delete(scheduling);
    }

    private Scheduling findEntityById(UUID id) {
        return schedulingRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Scheduling not found with id: " + id));
    }

    private void validateScheduleConfig(ScheduleType scheduleType, Map<String, Object> config) {
        List<ValidationErrorDetail> errors = new ArrayList<>();

        if (config == null || config.isEmpty()) {
            if (scheduleType == ScheduleType.CRON || scheduleType == ScheduleType.INTERVAL) {
                errors.add(new ValidationErrorDetail("scheduleConfig", "Configuration is required for " + scheduleType));
                throw new TaskValidationException("Invalid schedule configuration", errors);
            }
            return;
        }

        switch (scheduleType) {
            case CRON -> {
                String cron = (String) config.get("cronExpression");
                if (cron == null || cron.isBlank()) {
                    errors.add(new ValidationErrorDetail("cronExpression", "cronExpression is required for CRON schedule"));
                } else if (!CronExpression.isValidExpression(cron.trim())) {
                    errors.add(new ValidationErrorDetail("cronExpression", "Invalid cron expression: " + cron));
                }
            }
            case INTERVAL -> {
                Object interval = config.get("intervalSeconds");
                if (interval == null) {
                    errors.add(new ValidationErrorDetail("intervalSeconds", "intervalSeconds is required for INTERVAL schedule"));
                } else {
                    try {
                        int sec = Integer.parseInt(interval.toString().trim());
                        if (sec <= 0) {
                            errors.add(new ValidationErrorDetail("intervalSeconds", "intervalSeconds must be greater than 0"));
                        }
                    } catch (NumberFormatException e) {
                        errors.add(new ValidationErrorDetail("intervalSeconds", "intervalSeconds must be a valid integer"));
                    }
                }
            }
            case WEEKLY -> {
                if (!config.containsKey("daysOfWeek") && !config.containsKey("timeOfDay")) {
                    errors.add(new ValidationErrorDetail("scheduleConfig", "Weekly schedule requires daysOfWeek and timeOfDay"));
                }
            }
            case ONE_TIME -> {
                // startAt is optional; if omitted it fires immediately
            }
        }

        if (!errors.isEmpty()) {
            throw new TaskValidationException("Invalid schedule configuration", errors);
        }
    }
}
