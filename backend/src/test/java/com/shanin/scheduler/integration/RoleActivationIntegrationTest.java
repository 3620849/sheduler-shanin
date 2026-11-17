package com.shanin.scheduler.integration;

import com.shanin.scheduler.SchedulerApplication;
import com.shanin.scheduler.controller.SchedulingController;
import com.shanin.scheduler.controller.TaskController;
import com.shanin.scheduler.messaging.TaskExecutionDispatcher;
import com.shanin.scheduler.quartz.QuartzSchedulerService;
import com.shanin.scheduler.service.SchedulingService;
import com.shanin.scheduler.worker.TaskExecutionConsumer;
import com.shanin.scheduler.worker.TaskExecutionService;
import com.shanin.scheduler.worker.WorkerExecutionListener;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

import static org.assertj.core.api.Assertions.assertThat;

class RoleActivationIntegrationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
        .withUserConfiguration(SchedulerApplication.class)
        .withPropertyValues(
            "spring.datasource.url=jdbc:h2:mem:role_test;DB_CLOSE_DELAY=-1;MODE=MySQL",
            "spring.datasource.driver-class-name=org.h2.Driver",
            "spring.datasource.username=sa",
            "spring.datasource.password=",
            "spring.jpa.hibernate.ddl-auto=create-drop",
            "spring.quartz.job-store-type=memory",
            "spring.rabbitmq.listener.simple.auto-startup=false"
        );

    @Test
    @DisplayName("Scheduler-only mode: activates controllers and dispatchers, excludes worker consumers")
    void testSchedulerOnlyMode() {
        contextRunner
            .withPropertyValues(
                "SCHEDULER_ENABLED=true",
                "WORKER_ENABLED=false"
            )
            .run(context -> {
                assertThat(context).hasNotFailed();

                // Scheduler role beans must be present
                assertThat(context).hasSingleBean(SchedulingController.class);
                assertThat(context).hasSingleBean(TaskController.class);
                assertThat(context).hasSingleBean(SchedulingService.class);
                assertThat(context).hasSingleBean(QuartzSchedulerService.class);
                assertThat(context).hasSingleBean(TaskExecutionDispatcher.class);

                // Worker role beans must NOT be present
                assertThat(context).doesNotHaveBean(TaskExecutionConsumer.class);
                assertThat(context).doesNotHaveBean(TaskExecutionService.class);
                assertThat(context).doesNotHaveBean(WorkerExecutionListener.class);
            });
    }

    @Test
    @DisplayName("Worker-only mode: activates task consumer and handlers, excludes controllers and scheduler")
    void testWorkerOnlyMode() {
        contextRunner
            .withPropertyValues(
                "SCHEDULER_ENABLED=false",
                "WORKER_ENABLED=true"
            )
            .run(context -> {
                assertThat(context).hasNotFailed();

                // Worker role beans must be present
                assertThat(context).hasSingleBean(TaskExecutionConsumer.class);
                assertThat(context).hasSingleBean(TaskExecutionService.class);
                assertThat(context).hasSingleBean(WorkerExecutionListener.class);

                // Scheduler role beans must NOT be present
                assertThat(context).doesNotHaveBean(SchedulingController.class);
                assertThat(context).doesNotHaveBean(TaskController.class);
                assertThat(context).doesNotHaveBean(SchedulingService.class);
                assertThat(context).doesNotHaveBean(QuartzSchedulerService.class);
                assertThat(context).doesNotHaveBean(TaskExecutionDispatcher.class);
            });
    }

    @Test
    @DisplayName("Dual-role mode (default): activates both scheduler and worker components")
    void testDualRoleMode() {
        contextRunner
            .withPropertyValues(
                "SCHEDULER_ENABLED=true",
                "WORKER_ENABLED=true"
            )
            .run(context -> {
                assertThat(context).hasNotFailed();

                // Both scheduler and worker beans must be present
                assertThat(context).hasSingleBean(SchedulingController.class);
                assertThat(context).hasSingleBean(TaskController.class);
                assertThat(context).hasSingleBean(SchedulingService.class);
                assertThat(context).hasSingleBean(QuartzSchedulerService.class);
                assertThat(context).hasSingleBean(TaskExecutionDispatcher.class);

                assertThat(context).hasSingleBean(TaskExecutionConsumer.class);
                assertThat(context).hasSingleBean(TaskExecutionService.class);
                assertThat(context).hasSingleBean(WorkerExecutionListener.class);
            });
    }

    @Test
    @DisplayName("Default missing properties: both roles default to true")
    void testDefaultPropertyFallback() {
        contextRunner
            .run(context -> {
                assertThat(context).hasNotFailed();

                assertThat(context).hasSingleBean(SchedulingController.class);
                assertThat(context).hasSingleBean(TaskExecutionConsumer.class);
            });
    }
}
