package com.shanin.scheduler.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shanin.scheduler.dto.CreateSchedulingRequest;
import com.shanin.scheduler.dto.PageResponse;
import com.shanin.scheduler.dto.SchedulingResponse;
import com.shanin.scheduler.dto.SchedulingStatsResponse;
import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.service.SchedulingService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SchedulingController.class)
class SchedulingControllerTest {

    @Autowired
    private MockMvc mockMvc;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @MockitoBean
    private SchedulingService schedulingService;

    @Test
    @DisplayName("GET /api/schedulings returns paginated schedulings")
    void getSchedulingsPaginated() throws Exception {
        UUID id = UUID.randomUUID();
        SchedulingResponse response = new SchedulingResponse(
            id, "Heartbeat Check", TaskType.LOG_TASK, Map.of("message", "alive"),
            ScheduleType.INTERVAL, Map.of("intervalSeconds", 30),
            ScheduleStatus.ACTIVE, Instant.now().plusSeconds(30),
            Instant.now(), Instant.now()
        );
        PageResponse<SchedulingResponse> pageResponse = new PageResponse<>(
            List.of(response), 0, 10, 1L, 1, true
        );

        when(schedulingService.getSchedulings(any(Pageable.class))).thenReturn(pageResponse);

        mockMvc.perform(get("/api/schedulings?page=0&size=10").contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.content[0].id").value(id.toString()))
            .andExpect(jsonPath("$.data.content[0].name").value("Heartbeat Check"))
            .andExpect(jsonPath("$.data.page").value(0))
            .andExpect(jsonPath("$.data.size").value(10))
            .andExpect(jsonPath("$.data.totalElements").value(1))
            .andExpect(jsonPath("$.data.totalPages").value(1))
            .andExpect(jsonPath("$.data.last").value(true));
    }

    @Test
    @DisplayName("GET /api/schedulings/stats returns global job status counters")
    void getStats() throws Exception {
        SchedulingStatsResponse statsResponse = new SchedulingStatsResponse(20L, 14L, 6L);

        when(schedulingService.getStats()).thenReturn(statsResponse);

        mockMvc.perform(get("/api/schedulings/stats").contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.totalCount").value(20))
            .andExpect(jsonPath("$.data.activeCount").value(14))
            .andExpect(jsonPath("$.data.pausedCount").value(6));
    }

    @Test
    @DisplayName("POST /api/schedulings creates scheduling and returns 201 Created")
    void createScheduling() throws Exception {
        UUID id = UUID.randomUUID();
        CreateSchedulingRequest request = new CreateSchedulingRequest(
            "Hourly Email Report",
            TaskType.EMAIL_TASK,
            Map.of("to", "boss@corp.com", "subject", "Status Update"),
            ScheduleType.INTERVAL,
            Map.of("intervalSeconds", 3600)
        );

        SchedulingResponse response = new SchedulingResponse(
            id, request.name(), request.taskType(), request.taskParameters(),
            request.scheduleType(), request.scheduleConfig(),
            ScheduleStatus.ACTIVE, Instant.now().plusSeconds(3600),
            Instant.now(), Instant.now()
        );

        when(schedulingService.createScheduling(any(CreateSchedulingRequest.class))).thenReturn(response);

        mockMvc.perform(post("/api/schedulings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.success").value(true))
            .andExpect(jsonPath("$.data.id").value(id.toString()))
            .andExpect(jsonPath("$.data.name").value("Hourly Email Report"));
    }

    @Test
    @DisplayName("POST /api/schedulings with missing required fields returns 400 Bad Request")
    void createSchedulingValidationFailure() throws Exception {
        // Missing name and scheduleType
        String invalidJson = """
            {
               "taskType": "LOG_TASK"
            }
            """;

        mockMvc.perform(post("/api/schedulings")
                .contentType(MediaType.APPLICATION_JSON)
                .content(invalidJson))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.success").value(false))
            .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"));
    }

    @Test
    @DisplayName("DELETE /api/schedulings/{id} returns 204 No Content")
    void deleteScheduling() throws Exception {
        UUID id = UUID.randomUUID();
        doNothing().when(schedulingService).deleteScheduling(id);

        mockMvc.perform(delete("/api/schedulings/" + id))
            .andExpect(status().isNoContent());
    }
}
