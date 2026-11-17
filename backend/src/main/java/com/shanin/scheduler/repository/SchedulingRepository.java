package com.shanin.scheduler.repository;

import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.model.TaskType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Repository
public interface SchedulingRepository extends JpaRepository<Scheduling, UUID> {

    List<Scheduling> findByStatus(ScheduleStatus status);

    long countByStatus(ScheduleStatus status);

    List<Scheduling> findByTaskType(TaskType taskType);

    @Modifying
    @Transactional
    @Query("UPDATE Scheduling s SET s.nextRunAt = :nextRunAt WHERE s.id = :id")
    int updateNextRunAt(UUID id, Instant nextRunAt);

    @Modifying
    @Transactional
    @Query("UPDATE Scheduling s SET s.status = :status, s.nextRunAt = :nextRunAt WHERE s.id = :id")
    int updateStatusAndNextRunAt(UUID id, ScheduleStatus status, Instant nextRunAt);
}
