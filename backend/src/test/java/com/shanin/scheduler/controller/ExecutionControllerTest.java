package com.shanin.scheduler.controller;

import com.shanin.scheduler.dto.TaskExecutionResponse;
import com.shanin.scheduler.entity.ExecutionStatus;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.service.ExecutionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ExecutionController.class)
class ExecutionControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private ExecutionService executionService;

    @Test
    @DisplayName("GET /api/executions without schedulingId returns recent executions")
    void getAllExecutions() throws Exception {
        UUID id = UUID.randomUUID();
        UUID schedulingId = UUID.randomUUID();
        TaskExecutionResponse exec = new TaskExecutionResponse(
            id, schedulingId, "Log Job", TaskType.LOG_TASK,
            ExecutionStatus.SUCCESS, "[LOG_TASK] Executed: Hello", 15L,
            Instant.now(), Instant.now()
        );

        when(executionService.getExecutions(null)).thenReturn(List.of(exec));

        mockMvc.perform(get("/api/executions")
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data[0].id").value(id.toString()))
            .andExpect(jsonPath("$.data[0].taskName").value("Log Job"))
            .andExpect(jsonPath("$.data[0].status").value("SUCCESS"))
            .andExpect(jsonPath("$.data[0].output").value("[LOG_TASK] Executed: Hello"));
    }

    @Test
    @DisplayName("GET /api/executions?schedulingId={id} returns executions for specific scheduling")
    void getExecutionsBySchedulingId() throws Exception {
        UUID id = UUID.randomUUID();
        UUID schedulingId = UUID.randomUUID();
        TaskExecutionResponse exec = new TaskExecutionResponse(
            id, schedulingId, "Log Job", TaskType.LOG_TASK,
            ExecutionStatus.SUCCESS, "[LOG_TASK] Executed: Hello", 15L,
            Instant.now(), Instant.now()
        );

        when(executionService.getExecutions(schedulingId)).thenReturn(List.of(exec));

        mockMvc.perform(get("/api/executions")
                .param("schedulingId", schedulingId.toString())
                .accept(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data").isArray())
            .andExpect(jsonPath("$.data[0].schedulingId").value(schedulingId.toString()))
            .andExpect(jsonPath("$.data[0].status").value("SUCCESS"));
    }
}
