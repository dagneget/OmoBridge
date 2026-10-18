package com.omobridge.identity.service;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class LoginAttemptServiceTest {

    private LoginAttemptService loginAttemptService;

    @BeforeEach
    void setUp() {
        loginAttemptService = new LoginAttemptService();
    }

    @Test
    @DisplayName("Should not be blocked initially")
    void shouldNotBeBlockedInitially() {
        assertThat(loginAttemptService.isBlocked("+251911223344")).isFalse();
    }

    @Test
    @DisplayName("Should block after 5 failed attempts")
    void shouldBlockAfterFiveFailedAttempts() {
        String phone = "+251911223344";
        for (int i = 0; i < 4; i++) {
            loginAttemptService.loginFailed(phone);
            assertThat(loginAttemptService.isBlocked(phone)).isFalse();
        }

        // 5th failed attempt triggers block
        loginAttemptService.loginFailed(phone);
        assertThat(loginAttemptService.isBlocked(phone)).isTrue();
    }

    @Test
    @DisplayName("Should unblock on successful login")
    void shouldUnblockOnSuccessfulLogin() {
        String phone = "+251911223344";
        for (int i = 0; i < 5; i++) {
            loginAttemptService.loginFailed(phone);
        }
        assertThat(loginAttemptService.isBlocked(phone)).isTrue();

        loginAttemptService.loginSucceeded(phone);
        assertThat(loginAttemptService.isBlocked(phone)).isFalse();
    }
}
