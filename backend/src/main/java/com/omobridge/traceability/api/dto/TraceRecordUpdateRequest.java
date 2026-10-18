package com.omobridge.traceability.api.dto;

public record TraceRecordUpdateRequest(
        String originVillage,
        String originLabel,
        String publicStory,
        Boolean showFarmerNames
) {}
