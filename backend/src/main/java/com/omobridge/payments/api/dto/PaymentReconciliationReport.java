package com.omobridge.payments.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record PaymentReconciliationReport(
        int totalPayments,
        BigDecimal totalPaidAmount,
        int totalAttempts,
        int totalEvents,
        int totalRefunds,
        BigDecimal totalRefundedAmount,
        int mismatchCount,
        List<String> discrepancies
) {}
