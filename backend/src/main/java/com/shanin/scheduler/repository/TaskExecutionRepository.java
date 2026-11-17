package com.shanin.scheduler.repository;

import com.shanin.scheduler.entity.TaskExecution;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TaskExecutionRepository extends JpaRepository<TaskExecution, UUID> {
    List<TaskExecution> findBySchedulingIdOrderByFireTimeDesc(UUID schedulingId);
    List<TaskExecution> findTop50ByOrderByFireTimeDesc();
}
