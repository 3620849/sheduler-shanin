package com.shanin.scheduler.messaging;

import com.shanin.scheduler.config.RabbitMqConfig;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "SCHEDULER_ENABLED", havingValue = "true", matchIfMissing = true)
@RequiredArgsConstructor
@Slf4j
public class TaskExecutionDispatcher {

    private final RabbitTemplate rabbitTemplate;

    public void dispatch(TaskExecutionMessage message) {
        log.info("Dispatching task execution message to RabbitMQ: executionId={}, schedulingId={}, taskType={}",
            message.executionId(), message.schedulingId(), message.taskType());

        rabbitTemplate.convertAndSend(
            RabbitMqConfig.EXCHANGE_TASKS,
            RabbitMqConfig.ROUTING_KEY_TASK_EXECUTE,
            message
        );
    }
}
