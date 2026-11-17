package com.shanin.scheduler.quartz;

import com.shanin.scheduler.entity.Scheduling;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.SchedulerException;
import org.quartz.Trigger;
import org.quartz.TriggerKey;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class QuartzSchedulerService {

    private static final Logger log = LoggerFactory.getLogger(QuartzSchedulerService.class);

    private final Scheduler scheduler;
    private final QuartzTriggerBuilder triggerBuilder;

    public QuartzSchedulerService(Scheduler scheduler, QuartzTriggerBuilder triggerBuilder) {
        this.scheduler = scheduler;
        this.triggerBuilder = triggerBuilder;
    }

    public Instant schedule(Scheduling scheduling) {
        try {
            JobDetail jobDetail = triggerBuilder.buildJobDetail(scheduling);
            Trigger trigger = triggerBuilder.buildTrigger(scheduling);

            Date firstFireDate = scheduler.scheduleJob(jobDetail, trigger);
            log.info("Scheduled job {} with trigger {}, first execution at: {}",
                jobDetail.getKey(), trigger.getKey(), firstFireDate);

            return firstFireDate != null ? firstFireDate.toInstant() : null;
        } catch (SchedulerException e) {
            log.error("Failed to schedule job for scheduling id={}: {}", scheduling.getId(), e.getMessage(), e);
            throw new RuntimeException("Quartz scheduling error: " + e.getMessage(), e);
        }
    }

    public Instant reschedule(Scheduling scheduling) {
        try {
            TriggerKey triggerKey = triggerBuilder.buildTriggerKey(scheduling);
            Trigger newTrigger = triggerBuilder.buildTrigger(scheduling);

            Date nextFireDate = scheduler.rescheduleJob(triggerKey, newTrigger);
            if (nextFireDate == null) {
                // If trigger didn't exist before, schedule fresh
                JobDetail jobDetail = triggerBuilder.buildJobDetail(scheduling);
                nextFireDate = scheduler.scheduleJob(jobDetail, newTrigger);
            }

            log.info("Rescheduled job for scheduling id={}, next execution at: {}",
                scheduling.getId(), nextFireDate);

            return nextFireDate != null ? nextFireDate.toInstant() : null;
        } catch (SchedulerException e) {
            log.error("Failed to reschedule job for scheduling id={}: {}", scheduling.getId(), e.getMessage(), e);
            throw new RuntimeException("Quartz rescheduling error: " + e.getMessage(), e);
        }
    }

    public void pause(UUID schedulingId) {
        try {
            TriggerKey triggerKey = TriggerKey.triggerKey(schedulingId.toString(), QuartzTriggerBuilder.TRIGGER_GROUP);
            scheduler.pauseTrigger(triggerKey);
            log.info("Paused trigger for scheduling id={}", schedulingId);
        } catch (SchedulerException e) {
            log.error("Failed to pause trigger for scheduling id={}: {}", schedulingId, e.getMessage(), e);
            throw new RuntimeException("Quartz pause error: " + e.getMessage(), e);
        }
    }

    public void resume(UUID schedulingId) {
        try {
            TriggerKey triggerKey = TriggerKey.triggerKey(schedulingId.toString(), QuartzTriggerBuilder.TRIGGER_GROUP);
            scheduler.resumeTrigger(triggerKey);
            log.info("Resumed trigger for scheduling id={}", schedulingId);
        } catch (SchedulerException e) {
            log.error("Failed to resume trigger for scheduling id={}: {}", schedulingId, e.getMessage(), e);
            throw new RuntimeException("Quartz resume error: " + e.getMessage(), e);
        }
    }

    public void unschedule(UUID schedulingId) {
        try {
            TriggerKey triggerKey = TriggerKey.triggerKey(schedulingId.toString(), QuartzTriggerBuilder.TRIGGER_GROUP);
            JobKey jobKey = JobKey.jobKey(schedulingId.toString(), QuartzTriggerBuilder.JOB_GROUP);

            scheduler.unscheduleJob(triggerKey);
            scheduler.deleteJob(jobKey);
            log.info("Unscheduled and deleted Quartz job for scheduling id={}", schedulingId);
        } catch (SchedulerException e) {
            log.error("Failed to unschedule job for scheduling id={}: {}", schedulingId, e.getMessage(), e);
            throw new RuntimeException("Quartz unschedule error: " + e.getMessage(), e);
        }
    }
}
