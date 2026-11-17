package com.shanin.scheduler.quartz;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.model.TaskType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.quartz.CronTrigger;
import org.quartz.JobDetail;
import org.quartz.SimpleTrigger;
import org.quartz.Trigger;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class QuartzTriggerBuilderTest {

    private QuartzTriggerBuilder builder;

    @BeforeEach
    void setUp() {
        builder = new QuartzTriggerBuilder(new ObjectMapper());
    }

    @Test
    @DisplayName("Should build correct JobDetail with data map")
    void buildJobDetail() {
        UUID id = UUID.randomUUID();
        Scheduling scheduling = Scheduling.builder()
            .id(id)
            .name("Daily Log")
            .taskType(TaskType.LOG_TASK)
            .taskParameters(Map.of("message", "Hello Quartz"))
            .scheduleType(ScheduleType.INTERVAL)
            .scheduleConfig(Map.of("intervalSeconds", 60))
            .status(ScheduleStatus.ACTIVE)
            .build();

        JobDetail jobDetail = builder.buildJobDetail(scheduling);

        assertThat(jobDetail.getKey().getName()).isEqualTo(id.toString());
        assertThat(jobDetail.getKey().getGroup()).isEqualTo(QuartzTriggerBuilder.JOB_GROUP);
        assertThat(jobDetail.getJobDataMap().getString("schedulingId")).isEqualTo(id.toString());
        assertThat(jobDetail.getJobDataMap().getString("taskType")).isEqualTo(TaskType.LOG_TASK.name());
        assertThat(jobDetail.getJobDataMap().getString("taskParametersJson")).contains("Hello Quartz");
    }

    @Test
    @DisplayName("Should build SimpleTrigger for ONE_TIME schedule")
    void buildOneTimeTrigger() {
        UUID id = UUID.randomUUID();
        Instant futureTime = Instant.now().plusSeconds(3600);
        Scheduling scheduling = Scheduling.builder()
            .id(id)
            .name("One-time reminder")
            .taskType(TaskType.LOG_TASK)
            .scheduleType(ScheduleType.ONE_TIME)
            .scheduleConfig(Map.of("startAt", futureTime.toString()))
            .status(ScheduleStatus.ACTIVE)
            .build();

        Trigger trigger = builder.buildTrigger(scheduling);

        assertThat(trigger).isInstanceOf(SimpleTrigger.class);
        SimpleTrigger simpleTrigger = (SimpleTrigger) trigger;
        assertThat(simpleTrigger.getRepeatCount()).isZero();
        assertThat(trigger.getKey().getName()).isEqualTo(id.toString());
    }

    @Test
    @DisplayName("Should build SimpleTrigger for INTERVAL schedule")
    void buildIntervalTrigger() {
        UUID id = UUID.randomUUID();
        Scheduling scheduling = Scheduling.builder()
            .id(id)
            .name("Interval ping")
            .taskType(TaskType.DB_QUERY_TASK)
            .scheduleType(ScheduleType.INTERVAL)
            .scheduleConfig(Map.of("intervalSeconds", 45, "repeatCount", 5))
            .status(ScheduleStatus.ACTIVE)
            .build();

        Trigger trigger = builder.buildTrigger(scheduling);

        assertThat(trigger).isInstanceOf(SimpleTrigger.class);
        SimpleTrigger simpleTrigger = (SimpleTrigger) trigger;
        assertThat(simpleTrigger.getRepeatInterval()).isEqualTo(45_000L);
        assertThat(simpleTrigger.getRepeatCount()).isEqualTo(5);
    }

    @Test
    @DisplayName("Should build CronTrigger for WEEKLY schedule")
    void buildWeeklyTrigger() {
        UUID id = UUID.randomUUID();
        Scheduling scheduling = Scheduling.builder()
            .id(id)
            .name("Weekly digest")
            .taskType(TaskType.EMAIL_TASK)
            .scheduleType(ScheduleType.WEEKLY)
            .scheduleConfig(Map.of(
                "daysOfWeek", List.of("MON", "WED", "FRI"),
                "timeOfDay", "10:30:00"
            ))
            .status(ScheduleStatus.ACTIVE)
            .build();

        Trigger trigger = builder.buildTrigger(scheduling);

        assertThat(trigger).isInstanceOf(CronTrigger.class);
        CronTrigger cronTrigger = (CronTrigger) trigger;
        assertThat(cronTrigger.getCronExpression()).isEqualTo("0 30 10 ? * MON,WED,FRI");
    }

    @Test
    @DisplayName("Should build CronTrigger for custom CRON schedule")
    void buildCronTrigger() {
        UUID id = UUID.randomUUID();
        Scheduling scheduling = Scheduling.builder()
            .id(id)
            .name("Custom cron job")
            .taskType(TaskType.LOG_TASK)
            .scheduleType(ScheduleType.CRON)
            .scheduleConfig(Map.of("cronExpression", "0 0 12 ? * MON-FRI"))
            .status(ScheduleStatus.ACTIVE)
            .build();

        Trigger trigger = builder.buildTrigger(scheduling);

        assertThat(trigger).isInstanceOf(CronTrigger.class);
        CronTrigger cronTrigger = (CronTrigger) trigger;
        assertThat(cronTrigger.getCronExpression()).isEqualTo("0 0 12 ? * MON-FRI");
    }
}
