package com.omobridge.common.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/test");
    }

    @Test
    @DisplayName("Should handle ResourceNotFoundException with 404 status and error response")
    void shouldHandleResourceNotFound() {
        var ex = new ResourceNotFoundException("Product", "prod-123");
        ResponseEntity<ErrorResponse> response = handler.handleResourceNotFound(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("RESOURCE_NOT_FOUND");
        assertThat(response.getBody().message()).contains("Product not found with identifier: prod-123");
        assertThat(response.getBody().path()).isEqualTo("/api/v1/test");
    }

    @Test
    @DisplayName("Should handle BusinessRuleException with 422 status and error response")
    void shouldHandleBusinessRule() {
        var ex = new BusinessRuleException("Capacity cannot be negative");
        ResponseEntity<ErrorResponse> response = handler.handleBusinessRule(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNPROCESSABLE_ENTITY);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("BUSINESS_RULE_VIOLATION");
        assertThat(response.getBody().message()).isEqualTo("Capacity cannot be negative");
    }

    @Test
    @DisplayName("Should handle ConflictException with 409 status and error response")
    void shouldHandleConflict() {
        var ex = new ConflictException("Phone number already registered");
        ResponseEntity<ErrorResponse> response = handler.handleConflict(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("RESOURCE_CONFLICT");
        assertThat(response.getBody().message()).isEqualTo("Phone number already registered");
    }

    @Test
    @DisplayName("Should handle general unhandled Exception with 500 status and safe message")
    void shouldHandleGeneralException() {
        var ex = new RuntimeException("Database connection timeout error details that shouldn't leak");
        ResponseEntity<ErrorResponse> response = handler.handleGeneralException(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().code()).isEqualTo("INTERNAL_ERROR");
        assertThat(response.getBody().message()).isEqualTo("An unexpected internal server error occurred");
    }
}
