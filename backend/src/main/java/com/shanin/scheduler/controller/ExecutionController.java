package com.shanin.scheduler.controller;

import com.shanin.scheduler.dto.ApiResponse;
import com.shanin.scheduler.dto.TaskExecutionResponse;
import com.shanin.scheduler.service.ExecutionService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/executions")
@ConditionalOnProperty(name = "SCHEDULER_ENABLED", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
public class ExecutionController {

    private final ExecutionService executionService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskExecutionResponse>>> getExecutions(
            @RequestParam(required = false) UUID schedulingId) {
        List<TaskExecutionResponse> executions = executionService.getExecutions(schedulingId);
        return ResponseEntity.ok(ApiResponse.ok(executions));
    }
}
