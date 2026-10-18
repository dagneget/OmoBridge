package com.omobridge.notifications.service;

import com.omobridge.identity.domain.User;
import com.omobridge.integrations.sms.SmsDirection;
import com.omobridge.integrations.sms.SmsGateway;
import com.omobridge.integrations.sms.SmsMessage;
import com.omobridge.integrations.sms.SmsMessageRepository;
import com.omobridge.integrations.sms.SmsMessageStatus;
import com.omobridge.integrations.sms.SmsSendResult;
import com.omobridge.notifications.domain.Notification;
import com.omobridge.notifications.domain.NotificationChannel;
import com.omobridge.notifications.domain.NotificationRepository;
import com.omobridge.notifications.domain.NotificationStatus;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationTemplateEngine templateEngine;
    private final SmsGateway smsGateway;
    private final SmsMessageRepository smsMessageRepository;

    @Transactional
    public Notification queueNotification(
            User recipientUser,
            String phone,
            NotificationChannel channel,
            String templateCode,
            String language,
            Map<String, String> variables,
            String relatedType,
            UUID relatedId
    ) {
        String message = templateEngine.render(templateCode, language, variables);

        Notification notification = new Notification();
        notification.setRecipientUser(recipientUser);
        notification.setRecipientPhone(phone);
        notification.setChannel(channel);
        notification.setTemplateCode(templateCode);
        notification.setLanguage(language != null ? language : "en");
        notification.setMessage(message);
        notification.setRelatedType(relatedType);
        notification.setRelatedId(relatedId);
        notification.setStatus(NotificationStatus.QUEUED);
        notification.setAttempts(0);
        notification.setNextAttemptAt(Instant.now());

        Notification saved = notificationRepository.save(notification);
        log.info("Queued notification id={} template={} channel={} for {}",
                saved.getId(), templateCode, channel, maskPhone(phone));
        return saved;
    }

    @Transactional
    public int dispatchPendingNotifications(int batchSize) {
        Instant now = Instant.now();
        List<Notification> pending = notificationRepository.findPendingNotifications(now, PageRequest.of(0, batchSize));
        int dispatchedCount = 0;

        for (Notification notification : pending) {
            notification.setAttempts(notification.getAttempts() + 1);

            if (notification.getChannel() == NotificationChannel.SMS) {
                SmsSendResult result = smsGateway.sendSms(notification.getRecipientPhone(), notification.getMessage());

                SmsMessage smsMessage = new SmsMessage();
                smsMessage.setDirection(SmsDirection.OUTBOUND);
                smsMessage.setPhone(notification.getRecipientPhone());
                smsMessage.setBody(notification.getMessage());
                smsMessage.setProviderReference(result.providerReference());

                if (result.success()) {
                    smsMessage.setStatus(SmsMessageStatus.SENT);
                    notification.setStatus(NotificationStatus.SENT);
                    notification.setSentAt(Instant.now());
                    notification.setErrorMessage(null);
                    dispatchedCount++;
                } else {
                    smsMessage.setStatus(SmsMessageStatus.FAILED);
                    notification.setErrorMessage(result.errorMessage());
                    if (notification.getAttempts() >= notification.getMaxAttempts()) {
                        notification.setStatus(NotificationStatus.FAILED);
                        log.warn("Notification {} permanently failed after {} attempts",
                                notification.getId(), notification.getAttempts());
                    } else {
                        // Exponential backoff
                        notification.setNextAttemptAt(Instant.now().plus(Duration.ofMinutes(2L * notification.getAttempts())));
                    }
                }
                smsMessageRepository.save(smsMessage);
            } else {
                // Other channels (EMAIL/PUSH/VOICE): mark sent for now
                notification.setStatus(NotificationStatus.SENT);
                notification.setSentAt(Instant.now());
                dispatchedCount++;
            }

            notificationRepository.save(notification);
        }

        return dispatchedCount;
    }

    public static String maskPhone(String phone) {
        if (phone == null || phone.length() < 7) return "***";
        return phone.substring(0, 5) + "****" + phone.substring(phone.length() - 2);
    }
}
