package com.shanin.scheduler.entity;

import com.shanin.scheduler.model.TaskType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "task_executions", indexes = {
    @Index(name = "idx_task_executions_scheduling_id", columnList = "scheduling_id"),
    @Index(name = "idx_task_executions_fire_time", columnList = "fire_time")
})
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TaskExecution {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(nullable = false, updatable = false)
    private UUID id;

    @Column(name = "scheduling_id")
    private UUID schedulingId;

    @Column(name = "task_name", nullable = false)
    private String taskName;

    @Enumerated(EnumType.STRING)
    @Column(name = "task_type", nullable = false, length = 64)
    private TaskType taskType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ExecutionStatus status;

    @Column(columnDefinition = "TEXT")
    private String output;

    @Column(name = "duration_ms", nullable = false)
    private Long durationMs;

    @Column(name = "fire_time", nullable = false)
    private Instant fireTime;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
