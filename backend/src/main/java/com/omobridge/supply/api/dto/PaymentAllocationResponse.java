package com.omobridge.supply.api.dto;

import com.omobridge.supply.domain.PaymentAllocation;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

public record PaymentAllocationResponse(
        UUID id,
        UUID payableId,
        String payableNo,
        BigDecimal amount,
        Instant allocatedAt
) {
    public static PaymentAllocationResponse fromEntity(PaymentAllocation allocation) {
        return new PaymentAllocationResponse(
                allocation.getId(),
                allocation.getPayable().getId(),
                allocation.getPayable().getPayableNo(),
                allocation.getAmount(),
                allocation.getAllocatedAt()
        );
    }
}
