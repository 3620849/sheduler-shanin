package com.shanin.scheduler.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ParameterDefinition(
    String name,
    ParameterType type,
    boolean required,
    String description,
    Object defaultValue,
    String format,
    Double min,
    Double max
) {
    public static ParameterDefinition stringParam(String name, boolean required, String description) {
        return new ParameterDefinition(name, ParameterType.STRING, required, description, null, null, null, null);
    }

    public static ParameterDefinition emailParam(String name, boolean required, String description) {
        return new ParameterDefinition(name, ParameterType.STRING, required, description, null, "email", null, null);
    }

    public static ParameterDefinition numberParam(String name, boolean required, String description, Double defaultValue, Double min, Double max) {
        return new ParameterDefinition(name, ParameterType.NUMBER, required, description, defaultValue, null, min, max);
    }
}
