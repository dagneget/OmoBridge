package com.omobridge.integrations.sms;

import com.omobridge.common.exception.UnauthorizedException;
import com.omobridge.delivery.domain.DeliveryJob;
import com.omobridge.delivery.domain.DeliveryJobRepository;
import com.omobridge.delivery.domain.DeliveryStatus;
import com.omobridge.delivery.domain.DeliveryStatusHistory;
import com.omobridge.delivery.domain.DeliveryStatusHistoryRepository;
import com.omobridge.notifications.service.NotificationService;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class InboundSmsService {

    private final SmsMessageRepository smsMessageRepository;
    private final DeliveryJobRepository deliveryJobRepository;
    private final DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;

    @Value("${omobridge.integrations.sms.webhook-secret:omo-sms-secret}")
    private String expectedWebhookSecret;

    private static final Pattern JOB_PATTERN = Pattern.compile("(DEL-[0-9A-Z-]+)", Pattern.CASE_INSENSITIVE);

    @Transactional
    public InboundSmsResponse handleInboundSms(InboundSmsRequest request, String headerSignature) {
        // Verify signature / secret
        String signature = (request.signature() != null && !request.signature().isBlank())
                ? request.signature() : headerSignature;
        if (signature == null || !expectedWebhookSecret.equals(signature)) {
            log.warn("Unauthorized inbound SMS attempt from {}", NotificationService.maskPhone(request.from()));
            throw new UnauthorizedException("Invalid SMS webhook signature or secret");
        }

        // 1. Record inbound message
        SmsMessage sms = new SmsMessage();
        sms.setDirection(SmsDirection.INBOUND);
        sms.setPhone(request.from());
        sms.setBody(request.body());
        sms.setStatus(SmsMessageStatus.RECEIVED);
        smsMessageRepository.save(sms);

        log.info("Received inbound SMS from {}: {}", NotificationService.maskPhone(request.from()), request.body());

        // 2. Check for delivery checkpoint update
        String body = request.body().toUpperCase();
        Matcher matcher = JOB_PATTERN.matcher(body);
        if (matcher.find()) {
            String jobNo = matcher.group(1);
            Optional<DeliveryJob> jobOpt = deliveryJobRepository.findWithProviderByJobNo(jobNo);
            if (jobOpt.isEmpty()) {
                log.warn("Inbound SMS referenced unknown job: {}", jobNo);
                return InboundSmsResponse.recorded("UNKNOWN_JOB", "Message saved, but job " + jobNo + " was not found");
            }

            DeliveryJob job = jobOpt.get();
            String assignedPhone = (job.getProvider() != null && job.getProvider().getUser() != null)
                    ? job.getProvider().getUser().getPhoneNumber() : null;

            // Security check: Verify sender is the assigned delivery provider
            if (assignedPhone == null || !assignedPhone.trim().equals(request.from().trim())) {
                log.warn("SPOOFED SMS CHECKPOINT ATTEMPT: Sender {} does not match assigned provider {} for job {}",
                        NotificationService.maskPhone(request.from()),
                        NotificationService.maskPhone(assignedPhone),
                        jobNo);
                return InboundSmsResponse.rejected("SPOOFED_SENDER", "Sender does not match assigned provider for job " + jobNo);
            }

            // Determine target status
            DeliveryStatus targetStatus = job.getStatus();
            if (body.contains("ARRIVED") || body.contains("DELIVERED")) {
                if (job.getStatus().canTransitionTo(DeliveryStatus.DELIVERED)) {
                    targetStatus = DeliveryStatus.DELIVERED;
                }
            } else if (body.contains("LEFT") || body.contains("TRANSIT")) {
                if (job.getStatus().canTransitionTo(DeliveryStatus.IN_TRANSIT)) {
                    targetStatus = DeliveryStatus.IN_TRANSIT;
                }
            } else if (body.contains("PICKED") || body.contains("COLLECTED")) {
                if (job.getStatus().canTransitionTo(DeliveryStatus.PICKED_UP)) {
                    targetStatus = DeliveryStatus.PICKED_UP;
                }
            }

            DeliveryStatusHistory history = new DeliveryStatusHistory();
            history.setJob(job);
            history.setFromStatus(job.getStatus());
            history.setToStatus(targetStatus);
            history.setChangedByUser(job.getProvider().getUser());
            history.setReason("[SMS_CHECKPOINT] " + request.body());
            deliveryStatusHistoryRepository.save(history);

            job.setStatus(targetStatus);
            deliveryJobRepository.save(job);

            log.info("Delivery job {} updated to {} via SMS checkpoint from {}",
                    jobNo, targetStatus, NotificationService.maskPhone(request.from()));
            return InboundSmsResponse.recorded("CHECKPOINT_UPDATED",
                    "Job " + jobNo + " checkpoint updated to " + targetStatus);
        }

        return InboundSmsResponse.recorded("RECEIVED", "Inbound message received and recorded");
    }
}
