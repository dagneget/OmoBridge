package com.omobridge.common.exception;

public record FieldErrorItem(
    String field,
    String message,
    Object rejectedValue
) {}
