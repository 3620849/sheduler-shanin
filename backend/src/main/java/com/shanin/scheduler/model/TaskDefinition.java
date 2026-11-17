package com.shanin.scheduler.model;

import java.util.List;

public record TaskDefinition(
    TaskType taskType,
    String displayName,
    String description,
    List<ParameterDefinition> parameters
) {
}
