package com.shanin.scheduler.dto;

public record SchedulingStatsResponse(
    long totalCount,
    long activeCount,
    long pausedCount
) {}
