package com.omobridge.common.util;

import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import org.springframework.stereotype.Component;

@Component
public class CodeGenerator {

    private static final String ALPHANUMERIC = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // omits ambiguous 0, 1, I, O
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ofPattern("yyyyMMdd");
    private final SecureRandom random = new SecureRandom();
    private final Clock clock;

    public CodeGenerator(Clock clock) {
        this.clock = clock;
    }

    public String generateReceiptNumber() {
        return "REC-" + currentDateString() + "-" + randomAlphanumeric(4);
    }

    public String generateCheckoutGroupNumber() {
        return "CG-" + currentDateString() + "-" + randomAlphanumeric(4);
    }

    public String generateOrderNumber() {
        return "ORD-" + currentDateString() + "-" + randomAlphanumeric(4);
    }

    public String generateBookingCode() {
        return "BKG-" + currentDateString() + "-" + randomAlphanumeric(4);
    }

    public String generateBatchCode() {
        return "BAT-" + currentDateString() + "-" + randomAlphanumeric(4);
    }

    public String generateFarmerCode() {
        return "FRM-" + randomAlphanumeric(6);
    }

    public String generateDeliveryNumber() {
        return "DEL-" + currentDateString() + "-" + randomAlphanumeric(4);
    }

    public String generatePaymentNumber() {
        return "PAY-" + currentDateString() + "-" + randomAlphanumeric(5);
    }

    public String generateRefundNumber() {
        return "RFD-" + currentDateString() + "-" + randomAlphanumeric(5);
    }

    private String currentDateString() {
        return LocalDate.now(clock).format(DATE_FORMAT);
    }

    private String randomAlphanumeric(int length) {
        var sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) {
            int index = random.nextInt(ALPHANUMERIC.length());
            sb.append(ALPHANUMERIC.charAt(index));
        }
        return sb.toString();
    }
}
