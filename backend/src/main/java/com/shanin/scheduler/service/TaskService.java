package com.shanin.scheduler.service;

import com.shanin.scheduler.dto.TaskDefinitionResponse;
import com.shanin.scheduler.exception.ResourceNotFoundException;
import com.shanin.scheduler.model.PredefinedTasks;
import com.shanin.scheduler.model.TaskType;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    public List<TaskDefinitionResponse> getAllTasks() {
        return PredefinedTasks.getAll().stream()
            .map(TaskDefinitionResponse::from)
            .toList();
    }

    public TaskDefinitionResponse getTaskByType(TaskType taskType) {
        return PredefinedTasks.getByType(taskType)
            .map(TaskDefinitionResponse::from)
            .orElseThrow(() -> new ResourceNotFoundException("Task type '" + taskType + "' not found"));
    }
}
