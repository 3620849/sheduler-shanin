package com.shanin.scheduler.repository;

import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.model.TaskType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class SchedulingRepositoryTest {

    @Autowired
    private SchedulingRepository repository;

    @Test
    @DisplayName("Should persist and retrieve Scheduling entity with JSON converters")
    void persistAndRetrieve() {
        Scheduling scheduling = Scheduling.builder()
            .name("Database diagnostic")
            .taskType(TaskType.DB_QUERY_TASK)
            .taskParameters(Map.of("query", "SELECT 1", "timeoutSeconds", 10.0))
            .scheduleType(ScheduleType.INTERVAL)
            .scheduleConfig(Map.of("intervalSeconds", 120))
            .status(ScheduleStatus.ACTIVE)
            .nextRunAt(Instant.now().plusSeconds(120))
            .build();

        Scheduling saved = repository.save(scheduling);
        assertThat(saved.getId()).isNotNull();

        Optional<Scheduling> retrievedOpt = repository.findById(saved.getId());
        assertThat(retrievedOpt).isPresent();

        Scheduling retrieved = retrievedOpt.get();
        assertThat(retrieved.getName()).isEqualTo("Database diagnostic");
        assertThat(retrieved.getTaskType()).isEqualTo(TaskType.DB_QUERY_TASK);
        assertThat(retrieved.getTaskParameters()).containsEntry("query", "SELECT 1");
        assertThat(retrieved.getScheduleConfig()).containsEntry("intervalSeconds", 120);
        assertThat(retrieved.getStatus()).isEqualTo(ScheduleStatus.ACTIVE);
    }

    @Test
    @DisplayName("Should find schedulings by status")
    void findByStatus() {
        Scheduling active1 = Scheduling.builder()
            .name("Active 1")
            .taskType(TaskType.LOG_TASK)
            .taskParameters(Map.of("message", "active 1"))
            .scheduleType(ScheduleType.ONE_TIME)
            .scheduleConfig(Map.of())
            .status(ScheduleStatus.ACTIVE)
            .build();

        Scheduling paused1 = Scheduling.builder()
            .name("Paused 1")
            .taskType(TaskType.LOG_TASK)
            .taskParameters(Map.of("message", "paused 1"))
            .scheduleType(ScheduleType.ONE_TIME)
            .scheduleConfig(Map.of())
            .status(ScheduleStatus.PAUSED)
            .build();

        repository.saveAll(List.of(active1, paused1));

        List<Scheduling> activeList = repository.findByStatus(ScheduleStatus.ACTIVE);
        assertThat(activeList).hasSize(1);
        assertThat(activeList.get(0).getName()).isEqualTo("Active 1");

        List<Scheduling> pausedList = repository.findByStatus(ScheduleStatus.PAUSED);
        assertThat(pausedList).hasSize(1);
        assertThat(pausedList.get(0).getName()).isEqualTo("Paused 1");

        assertThat(repository.countByStatus(ScheduleStatus.ACTIVE)).isEqualTo(1L);
        assertThat(repository.countByStatus(ScheduleStatus.PAUSED)).isEqualTo(1L);
        assertThat(repository.countByStatus(ScheduleStatus.COMPLETED)).isEqualTo(0L);
    }
}
