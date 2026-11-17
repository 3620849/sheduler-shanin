package com.shanin.scheduler.worker;

import lombok.extern.slf4j.Slf4j;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.quartz.JobListener;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "WORKER_ENABLED", havingValue = "true", matchIfMissing = true)
@Slf4j
public class WorkerExecutionListener implements JobListener {

    @Override
    public String getName() {
        return "WorkerExecutionListener";
    }

    @Override
    public void jobToBeExecuted(JobExecutionContext context) {
        log.debug("Quartz job to be executed on worker node: {}", context.getJobDetail().getKey());
    }

    @Override
    public void jobExecutionVetoed(JobExecutionContext context) {
        log.debug("Quartz job execution vetoed on worker node: {}", context.getJobDetail().getKey());
    }

    @Override
    public void jobWasExecuted(JobExecutionContext context, JobExecutionException jobException) {
        log.debug("Quartz job was executed on worker node: {}", context.getJobDetail().getKey());
    }
}
