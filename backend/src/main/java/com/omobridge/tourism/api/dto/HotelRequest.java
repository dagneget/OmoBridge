package com.omobridge.tourism.api.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record HotelRequest(
    @NotBlank(message = "Hotel name is required")
    String name,

    @NotBlank(message = "Location is required")
    String locationText,

    String contactPhone,

    String contactEmail,

    @NotNull(message = "Price from is required")
    @DecimalMin(value = "0.00", message = "Price cannot be negative")
    BigDecimal priceFrom,

    String currency,

    String amenities,

    Boolean isActive
) {}
