package com.shanin.scheduler.model;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public final class PredefinedTasks {

    private static final Map<TaskType, TaskDefinition> TASKS;

    static {
        Map<TaskType, TaskDefinition> map = new LinkedHashMap<>();

        map.put(TaskType.LOG_TASK, new TaskDefinition(
            TaskType.LOG_TASK,
            "Log Execution Task",
            "Logs a formatted message to the system log stream",
            List.of(
                ParameterDefinition.stringParam("message", true, "Message content to log")
            )
        ));

        map.put(TaskType.EMAIL_TASK, new TaskDefinition(
            TaskType.EMAIL_TASK,
            "Email Dispatch Task",
            "Simulates sending an email notification to a recipient",
            List.of(
                ParameterDefinition.emailParam("to", true, "Recipient email address"),
                ParameterDefinition.stringParam("subject", true, "Subject line of the email"),
                ParameterDefinition.stringParam("body", false, "Body content of the email")
            )
        ));

        map.put(TaskType.DB_QUERY_TASK, new TaskDefinition(
            TaskType.DB_QUERY_TASK,
            "Database Query Task",
            "Simulates executing a diagnostic database query",
            List.of(
                ParameterDefinition.stringParam("query", true, "SQL query string to simulate"),
                ParameterDefinition.numberParam("timeoutSeconds", false, "Query timeout in seconds", 30.0, 1.0, 300.0)
            )
        ));

        TASKS = Collections.unmodifiableMap(map);
    }

    private PredefinedTasks() {
    }

    public static List<TaskDefinition> getAll() {
        return List.copyOf(TASKS.values());
    }

    public static Optional<TaskDefinition> getByType(TaskType taskType) {
        return Optional.ofNullable(TASKS.get(taskType));
    }
}
