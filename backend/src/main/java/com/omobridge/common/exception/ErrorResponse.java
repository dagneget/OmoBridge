package com.omobridge.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.Instant;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
    Instant timestamp,
    int status,
    String error,
    String code,
    String message,
    String path,
    List<FieldErrorItem> fieldErrors
) {
    public ErrorResponse(int status, String error, String code, String message, String path) {
        this(Instant.now(), status, error, code, message, path, null);
    }

    public ErrorResponse(int status, String error, String code, String message, String path, List<FieldErrorItem> fieldErrors) {
        this(Instant.now(), status, error, code, message, path, fieldErrors);
    }
}
