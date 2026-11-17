package com.shanin.scheduler.controller;

import com.shanin.scheduler.dto.ApiError;
import com.shanin.scheduler.dto.ApiResponse;
import com.shanin.scheduler.exception.ResourceNotFoundException;
import com.shanin.scheduler.exception.TaskValidationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.resource.NoResourceFoundException;

import java.util.ArrayList;
import java.util.List;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(TaskValidationException.class)
    public ResponseEntity<ApiResponse<Void>> handleTaskValidationException(TaskValidationException ex) {
        log.warn("Validation failed: {}", ex.getMessage());
        List<ApiError.Detail> details = ex.getErrors().stream()
            .map(err -> new ApiError.Detail(err.field(), err.message()))
            .toList();

        ApiError apiError = ApiError.of("TASK_VALIDATION_ERROR", ex.getMessage(), details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(apiError));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleMethodArgumentNotValid(MethodArgumentNotValidException ex) {
        log.warn("Request body validation failed: {}", ex.getMessage());
        List<ApiError.Detail> details = new ArrayList<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            details.add(new ApiError.Detail(fieldError.getField(), fieldError.getDefaultMessage()));
        }

        ApiError apiError = ApiError.of("VALIDATION_ERROR", "Request payload validation failed", details);
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(apiError));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleResourceNotFoundException(ResourceNotFoundException ex) {
        log.warn("Resource not found: {}", ex.getMessage());
        ApiError apiError = ApiError.of("NOT_FOUND", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(apiError));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNoResourceFoundException(NoResourceFoundException ex) {
        log.warn("Route not found: {}", ex.getMessage());
        ApiError apiError = ApiError.of("NOT_FOUND", ex.getMessage());
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(ApiResponse.error(apiError));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgumentException(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        ApiError apiError = ApiError.of("BAD_REQUEST", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(apiError));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGenericException(Exception ex) {
        log.error("Unhandled internal server error: {}", ex.getMessage(), ex);
        ApiError apiError = ApiError.of("INTERNAL_SERVER_ERROR", "An unexpected error occurred");
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(ApiResponse.error(apiError));
    }
}
