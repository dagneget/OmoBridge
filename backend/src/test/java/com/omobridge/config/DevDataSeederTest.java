package com.omobridge.config;

import com.omobridge.common.BaseIntegrationTest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.ActiveProfiles;

import static org.assertj.core.api.Assertions.assertThatNoException;

@ActiveProfiles("dev")
class DevDataSeederTest extends BaseIntegrationTest {

    @Autowired
    private DevDataSeeder devDataSeeder;

    @Test
    @DisplayName("Verify seedAll executes idempotently without throwing any exceptions")
    void testSeedAllRunsIdempotently() {
        assertThatNoException().isThrownBy(() -> devDataSeeder.seedAll());
        assertThatNoException().isThrownBy(() -> devDataSeeder.seedAll());
    }
}
