package com.shanin.scheduler.dto;

import com.shanin.scheduler.model.ParameterDefinition;
import com.shanin.scheduler.model.TaskDefinition;
import com.shanin.scheduler.model.TaskType;

import java.util.List;

public record TaskDefinitionResponse(
    TaskType taskType,
    String displayName,
    String description,
    List<ParameterDefinition> parameters
) {
    public static TaskDefinitionResponse from(TaskDefinition def) {
        return new TaskDefinitionResponse(
            def.taskType(),
            def.displayName(),
            def.description(),
            def.parameters()
        );
    }
}
