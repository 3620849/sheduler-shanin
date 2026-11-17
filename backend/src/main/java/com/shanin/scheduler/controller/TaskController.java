package com.shanin.scheduler.controller;

import com.shanin.scheduler.dto.ApiResponse;
import com.shanin.scheduler.dto.TaskDefinitionResponse;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.service.TaskService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final TaskService taskService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<TaskDefinitionResponse>>> getAllTasks() {
        List<TaskDefinitionResponse> tasks = taskService.getAllTasks();
        return ResponseEntity.ok(ApiResponse.ok(tasks));
    }

    @GetMapping("/{taskType}")
    public ResponseEntity<ApiResponse<TaskDefinitionResponse>> getTaskByType(@PathVariable TaskType taskType) {
        TaskDefinitionResponse task = taskService.getTaskByType(taskType);
        return ResponseEntity.ok(ApiResponse.ok(task));
    }
}
