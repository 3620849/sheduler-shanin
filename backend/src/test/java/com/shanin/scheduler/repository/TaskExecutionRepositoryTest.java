package com.shanin.scheduler.repository;

import com.shanin.scheduler.entity.ExecutionStatus;
import com.shanin.scheduler.entity.TaskExecution;
import com.shanin.scheduler.model.TaskType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class TaskExecutionRepositoryTest {

    @Autowired
    private TaskExecutionRepository repository;

    @Test
    @DisplayName("Should persist and retrieve TaskExecution entity")
    void persistAndRetrieve() {
        UUID schedulingId = UUID.randomUUID();
        Instant now = Instant.now();

        TaskExecution execution = TaskExecution.builder()
            .schedulingId(schedulingId)
            .taskName("Test Task")
            .taskType(TaskType.LOG_TASK)
            .status(ExecutionStatus.SUCCESS)
            .output("[LOG_TASK] Executed: Hello World")
            .durationMs(42L)
            .fireTime(now)
            .build();

        TaskExecution saved = repository.saveAndFlush(execution);
        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();

        List<TaskExecution> byScheduling = repository.findBySchedulingIdOrderByFireTimeDesc(schedulingId);
        assertThat(byScheduling).hasSize(1);
        assertThat(byScheduling.get(0).getOutput()).isEqualTo("[LOG_TASK] Executed: Hello World");
        assertThat(byScheduling.get(0).getStatus()).isEqualTo(ExecutionStatus.SUCCESS);
        assertThat(byScheduling.get(0).getDurationMs()).isEqualTo(42L);
    }

    @Test
    @DisplayName("Should return top 50 executions ordered by fireTime DESC")
    void findTop50ByOrderByFireTimeDesc() {
        UUID schedulingId1 = UUID.randomUUID();
        UUID schedulingId2 = UUID.randomUUID();

        TaskExecution exec1 = TaskExecution.builder()
            .schedulingId(schedulingId1)
            .taskName("Task 1")
            .taskType(TaskType.LOG_TASK)
            .status(ExecutionStatus.SUCCESS)
            .output("Output 1")
            .durationMs(10L)
            .fireTime(Instant.now().minusSeconds(60))
            .build();

        TaskExecution exec2 = TaskExecution.builder()
            .schedulingId(schedulingId2)
            .taskName("Task 2")
            .taskType(TaskType.EMAIL_TASK)
            .status(ExecutionStatus.FAILED)
            .output("Error")
            .durationMs(25L)
            .fireTime(Instant.now())
            .build();

        repository.save(exec1);
        repository.save(exec2);

        List<TaskExecution> all = repository.findTop50ByOrderByFireTimeDesc();
        assertThat(all).hasSize(2);
        assertThat(all.get(0).getTaskName()).isEqualTo("Task 2");
        assertThat(all.get(1).getTaskName()).isEqualTo("Task 1");
    }
}
