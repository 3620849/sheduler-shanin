package com.shanin.scheduler.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.rabbit.connection.ConnectionFactory;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class RabbitMqConfig {

    public static final String EXCHANGE_TASKS = "scheduler.tasks";
    public static final String QUEUE_TASK_EXECUTE = "scheduler.tasks.execute";
    public static final String ROUTING_KEY_TASK_EXECUTE = "task.execute";

    @Bean
    @ConditionalOnMissingBean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }

    @Bean
    public DirectExchange tasksExchange() {
        return new DirectExchange(EXCHANGE_TASKS, true, false);
    }

    @Bean
    public Queue taskExecuteQueue() {
        return QueueBuilder.durable(QUEUE_TASK_EXECUTE).build();
    }

    @Bean
    public Binding taskExecuteBinding(Queue taskExecuteQueue, DirectExchange tasksExchange) {
        return BindingBuilder.bind(taskExecuteQueue).to(tasksExchange).with(ROUTING_KEY_TASK_EXECUTE);
    }

    @Bean
    public MessageConverter jacksonMessageConverter(ObjectMapper objectMapper) {
        return new Jackson2JsonMessageConverter(objectMapper);
    }

    @Bean
    public RabbitTemplate rabbitTemplate(ConnectionFactory connectionFactory, MessageConverter jacksonMessageConverter) {
        RabbitTemplate template = new RabbitTemplate(connectionFactory);
        template.setMessageConverter(jacksonMessageConverter);
        return template;
    }
}
