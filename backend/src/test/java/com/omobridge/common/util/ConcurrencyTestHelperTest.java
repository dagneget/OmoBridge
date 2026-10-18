package com.omobridge.common.util;

import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ConcurrencyTestHelperTest {

    @Test
    @DisplayName("Should execute all threads concurrently without exceptions")
    void shouldExecuteAllThreadsConcurrently() throws InterruptedException {
        int threads = 10;
        AtomicInteger counter = new AtomicInteger(0);

        var result = ConcurrencyTestHelper.executeConcurrently(threads, index -> {
            counter.incrementAndGet();
        });

        assertThat(result.threadCount()).isEqualTo(threads);
        assertThat(result.successCount()).isEqualTo(threads);
        assertThat(result.exceptions()).isEmpty();
        assertThat(counter.get()).isEqualTo(threads);
    }

    @Test
    @DisplayName("Should capture exceptions from failing threads")
    void shouldCaptureExceptionsFromFailingThreads() throws InterruptedException {
        int threads = 5;

        var result = ConcurrencyTestHelper.executeConcurrently(threads, index -> {
            if (index % 2 == 0) {
                throw new IllegalStateException("Deliberate failure in thread " + index);
            }
        });

        assertThat(result.threadCount()).isEqualTo(threads);
        assertThat(result.successCount()).isEqualTo(2); // indices 1, 3
        assertThat(result.exceptions()).hasSize(3); // indices 0, 2, 4
    }
}
