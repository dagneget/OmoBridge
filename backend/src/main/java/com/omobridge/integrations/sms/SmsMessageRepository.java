package com.omobridge.integrations.sms;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SmsMessageRepository extends JpaRepository<SmsMessage, UUID> {
    List<SmsMessage> findByPhoneOrderByCreatedAtDesc(String phone);
}
