package com.omobridge.integrations.sms;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class MockSmsGateway implements SmsGateway {

    public record SentSmsRecord(String phoneNumber, String message, String providerReference) {}

    private final List<SentSmsRecord> sentRecords = Collections.synchronizedList(new ArrayList<>());

    @Getter
    @Setter
    private boolean simulateFailure = false;

    @Override
    public SmsSendResult sendSms(String phoneNumber, String message) {
        if (simulateFailure) {
            log.warn("MockSmsGateway simulating failure for destination {}", maskPhone(phoneNumber));
            return SmsSendResult.failure("Simulated SMS network failure");
        }

        String ref = "SMS-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        SentSmsRecord record = new SentSmsRecord(phoneNumber, message, ref);
        sentRecords.add(record);
        log.info("MockSmsGateway sent SMS to {} (ref: {}): {}", maskPhone(phoneNumber), ref, message);
        return SmsSendResult.success(ref);
    }

    public List<SentSmsRecord> getSentRecords() {
        return Collections.unmodifiableList(sentRecords);
    }

    public void clear() {
        sentRecords.clear();
        simulateFailure = false;
    }

    private String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 5) + "****" + phone.substring(phone.length() - 2);
    }
}
