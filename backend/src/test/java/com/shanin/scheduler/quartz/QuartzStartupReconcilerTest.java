package com.shanin.scheduler.quartz;

import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.repository.SchedulingRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quartz.JobKey;
import org.quartz.Scheduler;
import org.quartz.Trigger;
import org.quartz.TriggerKey;

import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QuartzStartupReconcilerTest {

    @Mock
    private SchedulingRepository schedulingRepository;

    @Mock
    private QuartzSchedulerService quartzSchedulerService;

    @Mock
    private QuartzTriggerBuilder triggerBuilder;

    @Mock
    private Scheduler scheduler;

    @InjectMocks
    private QuartzStartupReconciler reconciler;

    private UUID activeId;
    private Scheduling activeScheduling;

    @BeforeEach
    void setUp() {
        activeId = UUID.randomUUID();
        activeScheduling = Scheduling.builder()
            .id(activeId)
            .name("Active Task")
            .taskType(TaskType.LOG_TASK)
            .taskParameters(Map.of("message", "test"))
            .scheduleType(ScheduleType.INTERVAL)
            .scheduleConfig(Map.of("intervalSeconds", 10))
            .status(ScheduleStatus.ACTIVE)
            .build();
    }

    @Test
    @DisplayName("Should schedule active scheduling if missing from Quartz")
    void reconcileActiveSchedulingMissingFromQuartz() throws Exception {
        TriggerKey triggerKey = TriggerKey.triggerKey(activeId.toString(), QuartzTriggerBuilder.TRIGGER_GROUP);
        JobKey jobKey = JobKey.jobKey(activeId.toString(), QuartzTriggerBuilder.JOB_GROUP);
        Instant nextFire = Instant.now().plusSeconds(10);

        when(schedulingRepository.findAll()).thenReturn(List.of(activeScheduling));
        when(triggerBuilder.buildTriggerKey(activeScheduling)).thenReturn(triggerKey);
        when(triggerBuilder.buildJobKey(activeScheduling)).thenReturn(jobKey);
        when(scheduler.checkExists(triggerKey)).thenReturn(false);
        when(quartzSchedulerService.schedule(activeScheduling)).thenReturn(nextFire);

        reconciler.reconcile();

        verify(quartzSchedulerService).schedule(activeScheduling);
        verify(schedulingRepository).updateNextRunAt(activeId, nextFire);
    }

    @Test
    @DisplayName("Should resume active scheduling if it exists but is paused in Quartz")
    void reconcileActiveSchedulingPausedInQuartz() throws Exception {
        TriggerKey triggerKey = TriggerKey.triggerKey(activeId.toString(), QuartzTriggerBuilder.TRIGGER_GROUP);
        JobKey jobKey = JobKey.jobKey(activeId.toString(), QuartzTriggerBuilder.JOB_GROUP);

        when(schedulingRepository.findAll()).thenReturn(List.of(activeScheduling));
        when(triggerBuilder.buildTriggerKey(activeScheduling)).thenReturn(triggerKey);
        when(triggerBuilder.buildJobKey(activeScheduling)).thenReturn(jobKey);
        when(scheduler.checkExists(triggerKey)).thenReturn(true);
        when(scheduler.getTriggerState(triggerKey)).thenReturn(Trigger.TriggerState.PAUSED);

        reconciler.reconcile();

        verify(quartzSchedulerService).resume(activeId);
        verify(quartzSchedulerService, never()).schedule(any());
    }

    @Test
    @DisplayName("Should update nextRunAt for active scheduling if trigger already running in Quartz")
    void reconcileActiveSchedulingRunningInQuartz() throws Exception {
        TriggerKey triggerKey = TriggerKey.triggerKey(activeId.toString(), QuartzTriggerBuilder.TRIGGER_GROUP);
        JobKey jobKey = JobKey.jobKey(activeId.toString(), QuartzTriggerBuilder.JOB_GROUP);
        Date futureDate = new Date(System.currentTimeMillis() + 30000);

        Trigger mockTrigger = mock(Trigger.class);
        when(mockTrigger.getNextFireTime()).thenReturn(futureDate);

        when(schedulingRepository.findAll()).thenReturn(List.of(activeScheduling));
        when(triggerBuilder.buildTriggerKey(activeScheduling)).thenReturn(triggerKey);
        when(triggerBuilder.buildJobKey(activeScheduling)).thenReturn(jobKey);
        when(scheduler.checkExists(triggerKey)).thenReturn(true);
        when(scheduler.getTriggerState(triggerKey)).thenReturn(Trigger.TriggerState.NORMAL);
        when(scheduler.getTrigger(triggerKey)).thenReturn(mockTrigger);

        reconciler.reconcile();

        verify(schedulingRepository).updateNextRunAt(activeId, futureDate.toInstant());
    }

    @Test
    @DisplayName("Should pause trigger in Quartz if DB scheduling is PAUSED")
    void reconcilePausedScheduling() throws Exception {
        UUID pausedId = UUID.randomUUID();
        Scheduling pausedScheduling = Scheduling.builder()
            .id(pausedId)
            .name("Paused Task")
            .status(ScheduleStatus.PAUSED)
            .build();

        TriggerKey triggerKey = TriggerKey.triggerKey(pausedId.toString(), QuartzTriggerBuilder.TRIGGER_GROUP);
        JobKey jobKey = JobKey.jobKey(pausedId.toString(), QuartzTriggerBuilder.JOB_GROUP);

        when(schedulingRepository.findAll()).thenReturn(List.of(pausedScheduling));
        when(triggerBuilder.buildTriggerKey(pausedScheduling)).thenReturn(triggerKey);
        when(triggerBuilder.buildJobKey(pausedScheduling)).thenReturn(jobKey);
        when(scheduler.checkExists(triggerKey)).thenReturn(true);
        when(scheduler.getTriggerState(triggerKey)).thenReturn(Trigger.TriggerState.NORMAL);

        reconciler.reconcile();

        verify(quartzSchedulerService).pause(pausedId);
    }

    @Test
    @DisplayName("Should unschedule in Quartz if DB scheduling is COMPLETED")
    void reconcileCompletedScheduling() throws Exception {
        UUID completedId = UUID.randomUUID();
        Scheduling completedScheduling = Scheduling.builder()
            .id(completedId)
            .name("Completed Task")
            .status(ScheduleStatus.COMPLETED)
            .build();

        TriggerKey triggerKey = TriggerKey.triggerKey(completedId.toString(), QuartzTriggerBuilder.TRIGGER_GROUP);
        JobKey jobKey = JobKey.jobKey(completedId.toString(), QuartzTriggerBuilder.JOB_GROUP);

        when(schedulingRepository.findAll()).thenReturn(List.of(completedScheduling));
        when(triggerBuilder.buildTriggerKey(completedScheduling)).thenReturn(triggerKey);
        when(triggerBuilder.buildJobKey(completedScheduling)).thenReturn(jobKey);
        when(scheduler.checkExists(triggerKey)).thenReturn(true);

        reconciler.reconcile();

        verify(quartzSchedulerService).unschedule(completedId);
    }
}
