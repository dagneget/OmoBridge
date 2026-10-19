package com.omobridge.tourism.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record TransportRequest(
    @NotBlank(message = "Service name is required")
    String serviceName,

    @NotBlank(message = "Vehicle type is required")
    String vehicleType,

    @NotBlank(message = "Route description is required")
    String routeDescription,

    @NotNull(message = "Price amount is required")
    @DecimalMin(value = "0.00", message = "Price cannot be negative")
    BigDecimal priceAmount,

    String currency,

    String contactPhone,

    Boolean isActive
) {}
