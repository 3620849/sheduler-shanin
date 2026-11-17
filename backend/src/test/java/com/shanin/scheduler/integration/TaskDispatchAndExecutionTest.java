package com.shanin.scheduler.integration;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shanin.scheduler.config.RabbitMqConfig;
import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.messaging.TaskExecutionDispatcher;
import com.shanin.scheduler.messaging.TaskExecutionMessage;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.quartz.TaskExecutionJob;
import com.shanin.scheduler.repository.SchedulingRepository;
import com.shanin.scheduler.worker.TaskExecutionConsumer;
import com.shanin.scheduler.worker.TaskExecutionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.quartz.JobDataMap;
import org.quartz.JobExecutionContext;
import org.quartz.Trigger;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskDispatchAndExecutionTest {

    @Mock
    private RabbitTemplate rabbitTemplate;

    @Mock
    private SchedulingRepository schedulingRepository;

    @Mock
    private JobExecutionContext jobExecutionContext;

    @Mock
    private Trigger trigger;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    @DisplayName("TaskExecutionDispatcher sends message with correct exchange and routing key")
    void testDispatcherPublishesToRabbitMq() {
        TaskExecutionDispatcher dispatcher = new TaskExecutionDispatcher(rabbitTemplate);

        TaskExecutionMessage message = TaskExecutionMessage.create(
            UUID.randomUUID(),
            "Daily Log",
            TaskType.LOG_TASK,
            Map.of("message", "System check OK"),
            Instant.now()
        );

        dispatcher.dispatch(message);

        ArgumentCaptor<TaskExecutionMessage> messageCaptor = ArgumentCaptor.forClass(TaskExecutionMessage.class);
        verify(rabbitTemplate).convertAndSend(
            eq(RabbitMqConfig.EXCHANGE_TASKS),
            eq(RabbitMqConfig.ROUTING_KEY_TASK_EXECUTE),
            messageCaptor.capture()
        );

        TaskExecutionMessage captured = messageCaptor.getValue();
        assertThat(captured.taskType()).isEqualTo(TaskType.LOG_TASK);
        assertThat(captured.taskParameters()).containsEntry("message", "System check OK");
        assertThat(captured.executionId()).isNotNull();
    }

    @Test
    @DisplayName("TaskExecutionJob dispatches TaskExecutionMessage when Quartz trigger fires")
    void testQuartzJobDispatchesMessage() throws Exception {
        UUID schedulingId = UUID.randomUUID();
        JobDataMap jobDataMap = new JobDataMap();
        jobDataMap.put("schedulingId", schedulingId.toString());
        jobDataMap.put("taskType", "EMAIL_TASK");
        jobDataMap.put("taskName", "Email Notification");
        jobDataMap.put("taskParametersJson", objectMapper.writeValueAsString(Map.of(
            "to", "admin@company.com",
            "subject", "Daily Summary",
            "body", "All systems operational"
        )));

        when(jobExecutionContext.getMergedJobDataMap()).thenReturn(jobDataMap);
        when(jobExecutionContext.getScheduledFireTime()).thenReturn(new Date());
        when(jobExecutionContext.getTrigger()).thenReturn(trigger);
        when(trigger.getNextFireTime()).thenReturn(new Date(System.currentTimeMillis() + 60000));
        Scheduling scheduling = Scheduling.builder()
            .id(schedulingId)
            .name("Email Notification")
            .taskType(TaskType.EMAIL_TASK)
            .scheduleType(ScheduleType.INTERVAL)
            .status(ScheduleStatus.ACTIVE)
            .build();
        when(schedulingRepository.findById(schedulingId)).thenReturn(Optional.of(scheduling));

        TaskExecutionDispatcher dispatcher = new TaskExecutionDispatcher(rabbitTemplate);
        TaskExecutionJob job = new TaskExecutionJob(schedulingRepository, objectMapper, Optional.of(dispatcher));

        job.execute(jobExecutionContext);

        verify(schedulingRepository).save(scheduling);

        ArgumentCaptor<TaskExecutionMessage> captor = ArgumentCaptor.forClass(TaskExecutionMessage.class);
        verify(rabbitTemplate).convertAndSend(
            eq(RabbitMqConfig.EXCHANGE_TASKS),
            eq(RabbitMqConfig.ROUTING_KEY_TASK_EXECUTE),
            captor.capture()
        );

        TaskExecutionMessage dispatched = captor.getValue();
        assertThat(dispatched.schedulingId()).isEqualTo(schedulingId);
        assertThat(dispatched.taskType()).isEqualTo(TaskType.EMAIL_TASK);
        assertThat(dispatched.taskParameters()).containsEntry("to", "admin@company.com");
    }

    @Test
    @DisplayName("TaskExecutionConsumer delegates message to TaskExecutionService")
    void testConsumerExecutesAllTaskTypes() {
        TaskExecutionService executionService = new TaskExecutionService();
        TaskExecutionConsumer consumer = new TaskExecutionConsumer(executionService);

        // Test LOG_TASK
        TaskExecutionMessage logMsg = TaskExecutionMessage.create(
            UUID.randomUUID(), "Log Check", TaskType.LOG_TASK, Map.of("message", "Status good"), Instant.now()
        );
        assertDoesNotThrow(() -> consumer.onTaskExecution(logMsg));

        // Test EMAIL_TASK
        TaskExecutionMessage emailMsg = TaskExecutionMessage.create(
            UUID.randomUUID(), "Email Alert", TaskType.EMAIL_TASK,
            Map.of("to", "ops@test.com", "subject", "CPU High", "body", "Alert details"), Instant.now()
        );
        assertDoesNotThrow(() -> consumer.onTaskExecution(emailMsg));

        // Test DB_QUERY_TASK
        TaskExecutionMessage dbMsg = TaskExecutionMessage.create(
            UUID.randomUUID(), "Health Query", TaskType.DB_QUERY_TASK,
            Map.of("query", "SELECT COUNT(*) FROM users", "timeoutSeconds", 15), Instant.now()
        );
        assertDoesNotThrow(() -> consumer.onTaskExecution(dbMsg));
    }
}
