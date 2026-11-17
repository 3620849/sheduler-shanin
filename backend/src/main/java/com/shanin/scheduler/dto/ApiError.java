package com.shanin.scheduler.dto;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ApiError(
    String code,
    String message,
    List<Detail> details
) {
    public record Detail(String field, String message) {
    }

    public static ApiError of(String code, String message) {
        return new ApiError(code, message, List.of());
    }

    public static ApiError of(String code, String message, List<Detail> details) {
        return new ApiError(code, message, details != null ? List.copyOf(details) : List.of());
    }
}
