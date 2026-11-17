package com.shanin.scheduler.exception;

import java.util.List;
import java.util.Map;

public class TaskValidationException extends RuntimeException {

    private final List<ValidationErrorDetail> errors;

    public TaskValidationException(String message, List<ValidationErrorDetail> errors) {
        super(message);
        this.errors = errors != null ? List.copyOf(errors) : List.of();
    }

    public TaskValidationException(String message) {
        super(message);
        this.errors = List.of();
    }

    public List<ValidationErrorDetail> getErrors() {
        return errors;
    }

    public record ValidationErrorDetail(String field, String message) {
    }
}
