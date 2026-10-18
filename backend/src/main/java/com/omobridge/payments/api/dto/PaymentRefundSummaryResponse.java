package com.omobridge.payments.api.dto;

import com.omobridge.common.response.PageResponse;
import com.omobridge.common.util.JsonUtil;
import java.math.BigDecimal;
import java.util.UUID;

public record PaymentRefundSummaryResponse(
        UUID paymentId,
        BigDecimal paymentAmount,
        String currency,
        BigDecimal completedRefundAmount,
        BigDecimal notRefundedAmount,
        Coverage coverage,
        PageResponse<RefundResponse> refunds
) {
    public enum Coverage { NONE, PARTIAL, FULL }

    @Override
    public String toString() {
        return JsonUtil.toJson(this);
    }
}
