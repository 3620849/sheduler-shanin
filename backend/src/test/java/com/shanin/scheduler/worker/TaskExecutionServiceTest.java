package com.shanin.scheduler.worker;

import com.shanin.scheduler.entity.ExecutionStatus;
import com.shanin.scheduler.entity.TaskExecution;
import com.shanin.scheduler.messaging.TaskExecutionMessage;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.repository.TaskExecutionRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class TaskExecutionServiceTest {

    @Mock
    private TaskExecutionRepository taskExecutionRepository;

    @InjectMocks
    private TaskExecutionService taskExecutionService;

    @Test
    @DisplayName("Should execute LOG_TASK and persist SUCCESS execution record")
    void executeLogTaskSuccess() {
        UUID schedulingId = UUID.randomUUID();
        Instant fireTime = Instant.now();
        TaskExecutionMessage message = TaskExecutionMessage.create(
            schedulingId,
            "Heartbeat Log",
            TaskType.LOG_TASK,
            Map.of("message", "System OK"),
            fireTime
        );

        taskExecutionService.execute(message);

        ArgumentCaptor<TaskExecution> captor = ArgumentCaptor.forClass(TaskExecution.class);
        verify(taskExecutionRepository).save(captor.capture());

        TaskExecution saved = captor.getValue();
        assertThat(saved.getSchedulingId()).isEqualTo(schedulingId);
        assertThat(saved.getTaskName()).isEqualTo("Heartbeat Log");
        assertThat(saved.getTaskType()).isEqualTo(TaskType.LOG_TASK);
        assertThat(saved.getStatus()).isEqualTo(ExecutionStatus.SUCCESS);
        assertThat(saved.getOutput()).isEqualTo("[LOG_TASK] Executed: System OK");
        assertThat(saved.getFireTime()).isEqualTo(fireTime);
        assertThat(saved.getDurationMs()).isGreaterThanOrEqualTo(0L);
    }

    @Test
    @DisplayName("Should execute EMAIL_TASK and persist SUCCESS execution record")
    void executeEmailTaskSuccess() {
        UUID schedulingId = UUID.randomUUID();
        TaskExecutionMessage message = TaskExecutionMessage.create(
            schedulingId,
            "Send Report",
            TaskType.EMAIL_TASK,
            Map.of("to", "user@example.com", "subject", "Daily Report", "body", "Here is the report."),
            Instant.now()
        );

        taskExecutionService.execute(message);

        ArgumentCaptor<TaskExecution> captor = ArgumentCaptor.forClass(TaskExecution.class);
        verify(taskExecutionRepository).save(captor.capture());

        TaskExecution saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(ExecutionStatus.SUCCESS);
        assertThat(saved.getOutput()).contains("Simulated email dispatch to: <user@example.com>");
    }

    @Test
    @DisplayName("Should execute DB_QUERY_TASK and persist SUCCESS execution record")
    void executeDbQueryTaskSuccess() {
        UUID schedulingId = UUID.randomUUID();
        TaskExecutionMessage message = TaskExecutionMessage.create(
            schedulingId,
            "Check DB",
            TaskType.DB_QUERY_TASK,
            Map.of("query", "SELECT 1", "timeoutSeconds", 10),
            Instant.now()
        );

        taskExecutionService.execute(message);

        ArgumentCaptor<TaskExecution> captor = ArgumentCaptor.forClass(TaskExecution.class);
        verify(taskExecutionRepository).save(captor.capture());

        TaskExecution saved = captor.getValue();
        assertThat(saved.getStatus()).isEqualTo(ExecutionStatus.SUCCESS);
        assertThat(saved.getOutput()).contains("Simulated query execution: 'SELECT 1'");
    }
}
