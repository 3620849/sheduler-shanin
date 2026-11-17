package com.shanin.scheduler.service;

import com.shanin.scheduler.exception.TaskValidationException;
import com.shanin.scheduler.model.TaskType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TaskParameterValidatorTest {

    private TaskParameterValidator validator;

    @BeforeEach
    void setUp() {
        validator = new TaskParameterValidator();
    }

    @Nested
    @DisplayName("LOG_TASK validation")
    class LogTaskTests {

        @Test
        @DisplayName("Should pass when message is valid string")
        void validMessage() {
            Map<String, Object> input = Map.of("message", "System health check initiated");
            Map<String, Object> result = validator.validateAndNormalize(TaskType.LOG_TASK, input);

            assertThat(result).containsEntry("message", "System health check initiated");
        }

        @Test
        @DisplayName("Should fail when message is missing or blank")
        void missingMessage() {
            assertThatThrownBy(() -> validator.validateAndNormalize(TaskType.LOG_TASK, Map.of()))
                .isInstanceOf(TaskValidationException.class)
                .hasMessageContaining("Validation failed for task 'LOG_TASK'");

            assertThatThrownBy(() -> validator.validateAndNormalize(TaskType.LOG_TASK, Map.of("message", "   ")))
                .isInstanceOf(TaskValidationException.class);
        }
    }

    @Nested
    @DisplayName("EMAIL_TASK validation")
    class EmailTaskTests {

        @Test
        @DisplayName("Should pass with valid email, subject, and optional body")
        void validEmailParams() {
            Map<String, Object> input = Map.of(
                "to", "admin@domain.com",
                "subject", "Daily Report",
                "body", "Here is your report."
            );

            Map<String, Object> result = validator.validateAndNormalize(TaskType.EMAIL_TASK, input);

            assertThat(result)
                .containsEntry("to", "admin@domain.com")
                .containsEntry("subject", "Daily Report")
                .containsEntry("body", "Here is your report.");
        }

        @Test
        @DisplayName("Should fail when email format is invalid")
        void invalidEmailFormat() {
            Map<String, Object> input = Map.of(
                "to", "invalid-email-address",
                "subject", "Daily Report"
            );

            assertThatThrownBy(() -> validator.validateAndNormalize(TaskType.EMAIL_TASK, input))
                .isInstanceOf(TaskValidationException.class)
                .satisfies(ex -> {
                    TaskValidationException tve = (TaskValidationException) ex;
                    assertThat(tve.getErrors()).anyMatch(err -> err.field().equals("to"));
                });
        }

        @Test
        @DisplayName("Should fail when subject is missing")
        void missingSubject() {
            Map<String, Object> input = Map.of("to", "admin@domain.com");

            assertThatThrownBy(() -> validator.validateAndNormalize(TaskType.EMAIL_TASK, input))
                .isInstanceOf(TaskValidationException.class)
                .satisfies(ex -> {
                    TaskValidationException tve = (TaskValidationException) ex;
                    assertThat(tve.getErrors()).anyMatch(err -> err.field().equals("subject"));
                });
        }
    }

    @Nested
    @DisplayName("DB_QUERY_TASK validation")
    class DbQueryTaskTests {

        @Test
        @DisplayName("Should pass and apply default timeout when timeoutSeconds is omitted")
        void defaultTimeout() {
            Map<String, Object> input = Map.of("query", "SELECT COUNT(*) FROM orders");
            Map<String, Object> result = validator.validateAndNormalize(TaskType.DB_QUERY_TASK, input);

            assertThat(result)
                .containsEntry("query", "SELECT COUNT(*) FROM orders")
                .containsEntry("timeoutSeconds", 30.0);
        }

        @Test
        @DisplayName("Should pass with custom valid timeoutSeconds")
        void customTimeout() {
            Map<String, Object> input = Map.of("query", "SELECT 1", "timeoutSeconds", 15);
            Map<String, Object> result = validator.validateAndNormalize(TaskType.DB_QUERY_TASK, input);

            assertThat(result).containsEntry("timeoutSeconds", 15.0);
        }

        @Test
        @DisplayName("Should fail when query is missing")
        void missingQuery() {
            assertThatThrownBy(() -> validator.validateAndNormalize(TaskType.DB_QUERY_TASK, Map.of()))
                .isInstanceOf(TaskValidationException.class);
        }

        @Test
        @DisplayName("Should fail when timeoutSeconds exceeds max limit")
        void timeoutExceedsMax() {
            Map<String, Object> input = Map.of("query", "SELECT 1", "timeoutSeconds", 9999);

            assertThatThrownBy(() -> validator.validateAndNormalize(TaskType.DB_QUERY_TASK, input))
                .isInstanceOf(TaskValidationException.class);
        }
    }
}
