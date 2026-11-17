package com.shanin.scheduler.service;

import com.shanin.scheduler.dto.PageResponse;
import com.shanin.scheduler.dto.SchedulingResponse;
import com.shanin.scheduler.entity.ScheduleStatus;
import com.shanin.scheduler.entity.ScheduleType;
import com.shanin.scheduler.entity.Scheduling;
import com.shanin.scheduler.model.TaskType;
import com.shanin.scheduler.quartz.QuartzSchedulerService;
import com.shanin.scheduler.repository.SchedulingRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SchedulingServiceTest {

    @Mock
    private SchedulingRepository schedulingRepository;

    @Mock
    private TaskParameterValidator taskParameterValidator;

    @Mock
    private QuartzSchedulerService quartzSchedulerService;

    @InjectMocks
    private SchedulingService schedulingService;

    @Test
    @DisplayName("getSchedulings delegates to repository and maps to PageResponse")
    void getSchedulings() {
        UUID id = UUID.randomUUID();
        Scheduling scheduling = Scheduling.builder()
            .id(id)
            .name("Backup Job")
            .taskType(TaskType.LOG_TASK)
            .taskParameters(Map.of("message", "backup started"))
            .scheduleType(ScheduleType.INTERVAL)
            .scheduleConfig(Map.of("intervalSeconds", 60))
            .status(ScheduleStatus.ACTIVE)
            .nextRunAt(Instant.now().plusSeconds(60))
            .createdAt(Instant.now())
            .updatedAt(Instant.now())
            .build();

        Pageable pageable = PageRequest.of(0, 10);
        Page<Scheduling> page = new PageImpl<>(List.of(scheduling), pageable, 1);

        when(schedulingRepository.findAll(pageable)).thenReturn(page);

        PageResponse<SchedulingResponse> result = schedulingService.getSchedulings(pageable);

        assertThat(result).isNotNull();
        assertThat(result.page()).isEqualTo(0);
        assertThat(result.size()).isEqualTo(10);
        assertThat(result.totalElements()).isEqualTo(1);
        assertThat(result.totalPages()).isEqualTo(1);
        assertThat(result.last()).isTrue();
        assertThat(result.content()).hasSize(1);
        assertThat(result.content().getFirst().name()).isEqualTo("Backup Job");

        verify(schedulingRepository).findAll(pageable);
    }
}
