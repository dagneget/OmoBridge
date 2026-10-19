package com.omobridge.orders.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record CheckoutRequest(
        String idempotencyKey,
        @NotEmpty(message = "Checkout items cannot be empty")
        @Valid
        List<CheckoutItemRequest> items,
        @NotBlank(message = "Delivery address is required")
        String deliveryAddress,
        @NotBlank(message = "Delivery phone number is required")
        String deliveryPhone,
        Double deliveryLatitude,
        Double deliveryLongitude,
        String notes
) {}
