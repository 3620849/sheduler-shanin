package com.shanin.scheduler.worker;

import com.shanin.scheduler.config.RabbitMqConfig;
import com.shanin.scheduler.messaging.TaskExecutionMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "WORKER_ENABLED", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class TaskExecutionConsumer {

    private final TaskExecutionService taskExecutionService;

    @RabbitListener(queues = RabbitMqConfig.QUEUE_TASK_EXECUTE)
    public void onTaskExecution(TaskExecutionMessage message) {
        log.info("Received task execution message from queue: executionId={}, schedulingId={}, taskType={}",
            message.executionId(), message.schedulingId(), message.taskType());

        taskExecutionService.execute(message);
    }
}
