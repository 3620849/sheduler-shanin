package com.shanin.scheduler.quartz;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.entity.Scheduling;
import org.quartz.CronScheduleBuilder;
import org.quartz.JobBuilder;
import org.quartz.JobDataMap;
import org.quartz.JobDetail;
import org.quartz.JobKey;
import org.quartz.SimpleScheduleBuilder;
import org.quartz.Trigger;
import org.quartz.TriggerBuilder;
import org.quartz.TriggerKey;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.util.Collection;
import java.util.Date;
import java.util.List;
import java.util.Map;

@Component
public class QuartzTriggerBuilder {

    public static final String JOB_GROUP = "SCHEDULING_JOBS";
    public static final String TRIGGER_GROUP = "SCHEDULING_TRIGGERS";

    private final ObjectMapper objectMapper;

    public QuartzTriggerBuilder(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public JobKey buildJobKey(Scheduling scheduling) {
        return JobKey.jobKey(scheduling.getId().toString(), JOB_GROUP);
    }

    public TriggerKey buildTriggerKey(Scheduling scheduling) {
        return TriggerKey.triggerKey(scheduling.getId().toString(), TRIGGER_GROUP);
    }

    public JobDetail buildJobDetail(Scheduling scheduling) {
        JobDataMap jobDataMap = new JobDataMap();
        jobDataMap.put("schedulingId", scheduling.getId().toString());
        jobDataMap.put("taskType", scheduling.getTaskType().name());

        try {
            String paramsJson = objectMapper.writeValueAsString(scheduling.getTaskParameters());
            jobDataMap.put("taskParametersJson", paramsJson);
        } catch (JsonProcessingException e) {
            jobDataMap.put("taskParametersJson", "{}");
        }

        return JobBuilder.newJob(TaskExecutionJob.class)
            .withIdentity(buildJobKey(scheduling))
            .withDescription(scheduling.getName())
            .usingJobData(jobDataMap)
            .storeDurably(false)
            .build();
    }

    public Trigger buildTrigger(Scheduling scheduling) {
        TriggerKey triggerKey = buildTriggerKey(scheduling);
        ScheduleType type = scheduling.getScheduleType();
        Map<String, Object> config = scheduling.getScheduleConfig() != null ? scheduling.getScheduleConfig() : Map.of();

        return switch (type) {
            case ONE_TIME -> buildOneTimeTrigger(triggerKey, config);
            case INTERVAL -> buildIntervalTrigger(triggerKey, config);
            case WEEKLY -> buildWeeklyTrigger(triggerKey, config);
            case CRON -> buildCronTrigger(triggerKey, config);
        };
    }

    private Trigger buildOneTimeTrigger(TriggerKey triggerKey, Map<String, Object> config) {
        Instant startAt = parseInstant(config.get("startAt"));
        Date startDate = startAt != null ? Date.from(startAt) : new Date();

        return TriggerBuilder.newTrigger()
            .withIdentity(triggerKey)
            .startAt(startDate)
            .withSchedule(SimpleScheduleBuilder.simpleSchedule()
                .withRepeatCount(0)
                .withMisfireHandlingInstructionFireNow())
            .build();
    }

    private Trigger buildIntervalTrigger(TriggerKey triggerKey, Map<String, Object> config) {
        int intervalSeconds = parseInteger(config.get("intervalSeconds"), 60);
        if (intervalSeconds <= 0) {
            intervalSeconds = 60;
        }

        SimpleScheduleBuilder scheduleBuilder = SimpleScheduleBuilder.simpleSchedule()
            .withIntervalInSeconds(intervalSeconds)
            .withMisfireHandlingInstructionNextWithExistingCount();

        Integer repeatCount = parseInteger(config.get("repeatCount"), null);
        if (repeatCount != null && repeatCount >= 0) {
            scheduleBuilder.withRepeatCount(repeatCount);
        } else {
            scheduleBuilder.repeatForever();
        }

        Instant startAt = parseInstant(config.get("startAt"));
        Date startDate = startAt != null ? Date.from(startAt) : new Date();

        return TriggerBuilder.newTrigger()
            .withIdentity(triggerKey)
            .startAt(startDate)
            .withSchedule(scheduleBuilder)
            .build();
    }

    @SuppressWarnings("unchecked")
    private Trigger buildWeeklyTrigger(TriggerKey triggerKey, Map<String, Object> config) {
        Object daysObj = config.get("daysOfWeek");
        String daysStr = "MON";
        if (daysObj instanceof Collection<?> coll && !coll.isEmpty()) {
            daysStr = String.join(",", coll.stream().map(Object::toString).toList());
        } else if (daysObj instanceof String s && !s.isBlank()) {
            daysStr = s.trim();
        }

        String timeOfDayStr = (String) config.getOrDefault("timeOfDay", "09:00:00");
        LocalTime timeOfDay = LocalTime.parse(timeOfDayStr.length() == 5 ? timeOfDayStr + ":00" : timeOfDayStr);

        // Cron: second minute hour ? * days
        String cronExpression = String.format("%d %d %d ? * %s",
            timeOfDay.getSecond(),
            timeOfDay.getMinute(),
            timeOfDay.getHour(),
            daysStr
        );

        return TriggerBuilder.newTrigger()
            .withIdentity(triggerKey)
            .withSchedule(CronScheduleBuilder.cronSchedule(cronExpression)
                .withMisfireHandlingInstructionDoNothing())
            .build();
    }

    private Trigger buildCronTrigger(TriggerKey triggerKey, Map<String, Object> config) {
        String cronExpression = (String) config.get("cronExpression");
        if (cronExpression == null || cronExpression.isBlank()) {
            throw new IllegalArgumentException("cronExpression is required for CRON schedule");
        }

        return TriggerBuilder.newTrigger()
            .withIdentity(triggerKey)
            .withSchedule(CronScheduleBuilder.cronSchedule(cronExpression)
                .withMisfireHandlingInstructionDoNothing())
            .build();
    }

    private Instant parseInstant(Object val) {
        if (val == null) {
            return null;
        }
        if (val instanceof Instant inst) {
            return inst;
        }
        if (val instanceof String s && !s.isBlank()) {
            try {
                return Instant.parse(s.trim());
            } catch (DateTimeParseException ignored) {
            }
        }
        if (val instanceof Number n) {
            return Instant.ofEpochMilli(n.longValue());
        }
        return null;
    }

    private Integer parseInteger(Object val, Integer defaultValue) {
        if (val == null) {
            return defaultValue;
        }
        if (val instanceof Number n) {
            return n.intValue();
        }
        if (val instanceof String s && !s.isBlank()) {
            try {
                return Integer.parseInt(s.trim());
            } catch (NumberFormatException ignored) {
            }
        }
        return defaultValue;
    }
}
