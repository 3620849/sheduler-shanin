package com.shanin.scheduler.quartz;

import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.repository.SchedulingRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.Trigger;
import org.quartz.TriggerKey;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Component
@ConditionalOnProperty(name = "SCHEDULER_ENABLED", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class QuartzStartupReconciler {

    private final SchedulingRepository schedulingRepository;
    private final QuartzSchedulerService quartzSchedulerService;
    private final QuartzTriggerBuilder triggerBuilder;
    private final Scheduler scheduler;

    @EventListener(ApplicationReadyEvent.class)
    public void reconcile() {
        log.info("Starting Quartz startup reconciliation for active and paused schedules...");
        List<Scheduling> schedulings = schedulingRepository.findAll();
        int activeReconciled = 0;
        int pausedVerified = 0;
        int completedCleaned = 0;

        for (Scheduling scheduling : schedulings) {
            UUID id = scheduling.getId();
            TriggerKey triggerKey = triggerBuilder.buildTriggerKey(scheduling);
            JobKey jobKey = triggerBuilder.buildJobKey(scheduling);

            try {
                boolean triggerExists = scheduler.checkExists(triggerKey);

                if (scheduling.getStatus() == ScheduleStatus.ACTIVE) {
                    if (!triggerExists) {
                        log.info("Scheduling id={} ('{}') is ACTIVE in DB but missing trigger in Quartz. Scheduling fresh...",
                            id, scheduling.getName());
                        Instant nextRunAt = quartzSchedulerService.schedule(scheduling);
                        updateNextRunAt(id, nextRunAt);
                    } else {
                        Trigger.TriggerState triggerState = scheduler.getTriggerState(triggerKey);
                        if (triggerState == Trigger.TriggerState.PAUSED) {
                            log.info("Scheduling id={} ('{}') is ACTIVE in DB but PAUSED in Quartz. Resuming trigger...",
                                id, scheduling.getName());
                            quartzSchedulerService.resume(id);
                        } else if (triggerState == Trigger.TriggerState.ERROR) {
                            log.warn("Scheduling id={} ('{}') trigger is in ERROR state in Quartz. Rescheduling...",
                                id, scheduling.getName());
                            Instant nextRunAt = quartzSchedulerService.reschedule(scheduling);
                            updateNextRunAt(id, nextRunAt);
                        } else {
                            Trigger trigger = scheduler.getTrigger(triggerKey);
                            if (trigger != null && trigger.getNextFireTime() != null) {
                                updateNextRunAt(id, trigger.getNextFireTime().toInstant());
                            }
                        }
                    }
                    activeReconciled++;
                } else if (scheduling.getStatus() == ScheduleStatus.PAUSED) {
                    if (triggerExists) {
                        Trigger.TriggerState triggerState = scheduler.getTriggerState(triggerKey);
                        if (triggerState != Trigger.TriggerState.PAUSED) {
                            log.info("Scheduling id={} ('{}') is PAUSED in DB but active in Quartz. Pausing trigger...",
                                id, scheduling.getName());
                            quartzSchedulerService.pause(id);
                        }
                    } else {
                        log.info("Scheduling id={} ('{}') is PAUSED in DB with no Quartz trigger. Scheduling then pausing...",
                            id, scheduling.getName());
                        quartzSchedulerService.schedule(scheduling);
                        quartzSchedulerService.pause(id);
                    }
                    pausedVerified++;
                } else if (scheduling.getStatus() == ScheduleStatus.COMPLETED) {
                    if (triggerExists || scheduler.checkExists(jobKey)) {
                        log.info("Scheduling id={} ('{}') is COMPLETED in DB but exists in Quartz. Unscheduling...",
                            id, scheduling.getName());
                        quartzSchedulerService.unschedule(id);
                        completedCleaned++;
                    }
                }
            } catch (SchedulerException e) {
                log.error("Failed to reconcile Quartz state for scheduling id={}: {}",
                    id, e.getMessage(), e);
            }
        }

        log.info("Quartz startup reconciliation finished: activeReconciled={}, pausedVerified={}, completedCleaned={}",
            activeReconciled, pausedVerified, completedCleaned);
    }

    private void updateNextRunAt(UUID id, Instant nextRunAt) {
        if (nextRunAt == null) {
            return;
        }
        try {
            schedulingRepository.updateNextRunAt(id, nextRunAt);
        } catch (Exception e) {
            log.warn("Failed to update nextRunAt on startup reconciliation for scheduling id={}: {}", id, e.getMessage());
        }
    }
}
