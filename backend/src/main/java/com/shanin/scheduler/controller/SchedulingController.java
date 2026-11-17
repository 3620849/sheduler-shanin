package com.shanin.scheduler.controller;

import com.shanin.scheduler.dto.ApiResponse;
import com.shanin.scheduler.dto.CreateSchedulingRequest;
import com.shanin.scheduler.dto.SchedulingResponse;
import com.shanin.scheduler.dto.UpdateSchedulingRequest;
import com.shanin.scheduler.service.SchedulingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/schedulings")
@RequiredArgsConstructor
public class SchedulingController {

    private final SchedulingService schedulingService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<SchedulingResponse>>> getAllSchedulings() {
        List<SchedulingResponse> list = schedulingService.getAllSchedulings();
        return ResponseEntity.ok(ApiResponse.ok(list));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SchedulingResponse>> getSchedulingById(@PathVariable UUID id) {
        SchedulingResponse response = schedulingService.getSchedulingById(id);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<SchedulingResponse>> createScheduling(
            @Valid @RequestBody CreateSchedulingRequest request) {
        SchedulingResponse response = schedulingService.createScheduling(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SchedulingResponse>> updateScheduling(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateSchedulingRequest request) {
        SchedulingResponse response = schedulingService.updateScheduling(id, request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteScheduling(@PathVariable UUID id) {
        schedulingService.deleteScheduling(id);
        return ResponseEntity.noContent().build();
    }
}
