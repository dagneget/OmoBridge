package com.omobridge.supply.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record SupplyDeliveryInspectionRequest(
        @NotEmpty(message = "Inspection items cannot be empty")
        @Valid
        List<SupplyDeliveryInspectionItemRequest> items
) {}
