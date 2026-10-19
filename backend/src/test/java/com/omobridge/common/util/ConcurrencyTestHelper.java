package com.omobridge.common.util;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;

public final class ConcurrencyTestHelper {

    private ConcurrencyTestHelper() {}

    public record ConcurrencyResult(
        int threadCount,
        int successCount,
        List<Throwable> exceptions
    ) {}

    @FunctionalInterface
    public interface ConcurrentTask {
        void execute(int threadIndex) throws Exception;
    }

    public static ConcurrencyResult executeConcurrently(int threadCount, ConcurrentTask task) throws InterruptedException {
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<Throwable> exceptions = Collections.synchronizedList(new ArrayList<>());
        List<Integer> successes = Collections.synchronizedList(new ArrayList<>());

        for (int i = 0; i < threadCount; i++) {
            final int index = i;
            executor.submit(() -> {
                readyLatch.countDown();
                try {
                    startLatch.await();
                    task.execute(index);
                    successes.add(index);
                } catch (Throwable t) {
                    exceptions.add(t);
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Wait until all threads are initialized and ready to go
        readyLatch.await(10, TimeUnit.SECONDS);
        // Release all threads simultaneously
        startLatch.countDown();
        // Wait until all threads complete
        doneLatch.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        return new ConcurrencyResult(threadCount, successes.size(), exceptions);
    }
}
