package com.shanin.scheduler.service;

import com.shanin.scheduler.dto.TaskExecutionResponse;
import com.shanin.scheduler.repository.TaskExecutionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "SCHEDULER_ENABLED", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class ExecutionService {

    private final TaskExecutionRepository taskExecutionRepository;

    @Transactional(readOnly = true)
    public List<TaskExecutionResponse> getExecutions(UUID schedulingId) {
        if (schedulingId != null) {
            return taskExecutionRepository.findBySchedulingIdOrderByFireTimeDesc(schedulingId).stream()
                .map(TaskExecutionResponse::from)
                .toList();
        }
        return taskExecutionRepository.findTop50ByOrderByFireTimeDesc().stream()
            .map(TaskExecutionResponse::from)
            .toList();
    }
}
