package com.shanin.scheduler.controller;

import com.shanin.scheduler.dto.TaskDefinitionResponse;
import com.shanin.scheduler.model.ParameterDefinition;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.service.TaskService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
class TaskControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private TaskService taskService;

    @Test
    @DisplayName("GET /api/tasks returns all tasks wrapped in ApiResponse")
    void getAllTasks() throws Exception {
        TaskDefinitionResponse task = new TaskDefinitionResponse(
            TaskType.LOG_TASK,
            "Log Execution Task",
            "Logs a message",
            List.of(ParameterDefinition.stringParam("message", true, "Message content"))
        );

        when(taskService.getAllTasks()).thenReturn(List.of(task));

        mockMvc.perform(get("/api/tasks").contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data[0].taskType").value("LOG_TASK"))
            .andExpect(jsonPath("$.data[0].displayName").value("Log Execution Task"))
            .andExpect(jsonPath("$.data[0].parameters[0].name").value("message"));
    }

    @Test
    @DisplayName("GET /api/tasks/{taskType} returns single task definition")
    void getTaskByType() throws Exception {
        TaskDefinitionResponse task = new TaskDefinitionResponse(
            TaskType.EMAIL_TASK,
            "Email Dispatch Task",
            "Simulates email",
            List.of(ParameterDefinition.emailParam("to", true, "Recipient email"))
        );

        when(taskService.getTaskByType(TaskType.EMAIL_TASK)).thenReturn(task);

        mockMvc.perform(get("/api/tasks/EMAIL_TASK").contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.taskType").value("EMAIL_TASK"));
    }
}
