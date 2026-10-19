package com.omobridge.delivery.api.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;

public record BatchLocationIngestionRequest(
        @NotEmpty(message = "Locations list cannot be empty")
        @Valid
        List<LocationIngestionRequest> locations
) {}
