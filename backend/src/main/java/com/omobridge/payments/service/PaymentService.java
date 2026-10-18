package com.omobridge.payments.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.bookings.domain.Booking;
import com.omobridge.bookings.domain.BookingRepository;
import com.omobridge.bookings.domain.BookingStatus;
import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.util.CodeGenerator;
import com.omobridge.identity.domain.User;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.orders.domain.OrderStatus;
import com.omobridge.orders.service.OrderService;
import com.omobridge.payments.api.dto.CreatePaymentAttemptRequest;
import com.omobridge.payments.api.dto.PaymentAttemptResponse;
import com.omobridge.payments.api.dto.PaymentReconciliationReport;
import com.omobridge.payments.api.dto.PaymentResponse;
import com.omobridge.payments.api.dto.RefundRequest;
import com.omobridge.payments.api.dto.RefundResponse;
import com.omobridge.payments.domain.CommunityFundEntryType;
import com.omobridge.payments.domain.CommunityFundLedger;
import com.omobridge.payments.domain.CommunityFundLedgerRepository;
import com.omobridge.payments.domain.Payment;
import com.omobridge.payments.domain.PaymentAttempt;
import com.omobridge.payments.domain.PaymentAttemptRepository;
import com.omobridge.payments.domain.PaymentAttemptStatus;
import com.omobridge.payments.domain.PaymentRepository;
import com.omobridge.payments.domain.PaymentStatus;
import com.omobridge.payments.domain.ProviderEvent;
import com.omobridge.payments.domain.ProviderEventRepository;
import com.omobridge.payments.domain.Refund;
import com.omobridge.payments.domain.RefundRepository;
import com.omobridge.payments.domain.RefundStatus;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final PaymentAttemptRepository paymentAttemptRepository;
    private final ProviderEventRepository providerEventRepository;
    private final RefundRepository refundRepository;
    private final CommunityFundLedgerRepository communityFundLedgerRepository;
    private final OrderRepository orderRepository;
    private final OrderService orderService;
    private final BookingRepository bookingRepository;
    private final PaymentGateway paymentGateway;
    private final CodeGenerator codeGenerator;
    private final AuditService auditService;
    private final ObjectMapper objectMapper;

    @Transactional
    public PaymentAttemptResponse createPaymentAttempt(CreatePaymentAttemptRequest request, User payer) {
        // Idempotency check: repeated request with same key returns identical attempt without charging again
        Optional<PaymentAttempt> existingAttempt = paymentAttemptRepository.findByIdempotencyKey(request.idempotencyKey());
        if (existingAttempt.isPresent()) {
            log.info("Idempotent payment attempt hit for key: {}", request.idempotencyKey());
            return mapToAttemptResponse(existingAttempt.get());
        }

        if ((request.orderId() == null && request.bookingId() == null) ||
                (request.orderId() != null && request.bookingId() != null)) {
            throw new BusinessRuleException("Payment attempt must target exactly one order or booking");
        }

        Payment payment;
        if (request.orderId() != null) {
            Order order = orderRepository.findById(request.orderId())
                    .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + request.orderId()));
            if (order.getStatus() != OrderStatus.PLACED) {
                throw new BusinessRuleException("Order " + order.getOrderNo() + " is not in PLACED state");
            }
            payment = paymentRepository.findByOrderId(order.getId()).orElseGet(() -> {
                Payment p = new Payment();
                p.setPaymentNo(codeGenerator.generatePaymentNumber());
                p.setOrder(order);
                p.setPayer(payer);
                p.setAmount(order.getTotalAmount());
                p.setCurrency(order.getCurrency());
                p.setStatus(PaymentStatus.PENDING);
                return paymentRepository.save(p);
            });
        } else {
            Booking booking = bookingRepository.findById(request.bookingId())
                    .orElseThrow(() -> new ResourceNotFoundException("Booking not found: " + request.bookingId()));
            if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.REQUESTED) {
                throw new BusinessRuleException("Booking " + booking.getBookingCode() + " is not available for payment");
            }
            payment = paymentRepository.findByBookingId(booking.getId()).orElseGet(() -> {
                Payment p = new Payment();
                p.setPaymentNo(codeGenerator.generatePaymentNumber());
                p.setBooking(booking);
                p.setPayer(payer);
                p.setAmount(booking.getTotalAmount());
                p.setCurrency(booking.getCurrency());
                p.setStatus(PaymentStatus.PENDING);
                return paymentRepository.save(p);
            });
        }

        if (payment.getStatus() == PaymentStatus.RELEASED || payment.getStatus() == PaymentStatus.HELD) {
            throw new BusinessRuleException("Payment " + payment.getPaymentNo() + " has already been settled");
        }

        // Call payment gateway
        PaymentGateway.GatewayResponse response = paymentGateway.charge(new PaymentGateway.ChargeRequest(
                payment.getPaymentNo(),
                payment.getAmount(),
                payment.getCurrency(),
                payer.getPhoneNumber(),
                "Payment for " + payment.getPaymentNo()
        ));

        PaymentAttempt attempt = new PaymentAttempt();
        attempt.setPayment(payment);
        attempt.setIdempotencyKey(request.idempotencyKey());
        attempt.setProvider(request.provider());
        attempt.setProviderReference(response.transactionId());
        attempt.setAmount(payment.getAmount());
        attempt.setCurrency(payment.getCurrency());
        attempt.setStatus(response.success() ? PaymentAttemptStatus.SUCCESS : PaymentAttemptStatus.FAILED);
        PaymentAttempt savedAttempt = paymentAttemptRepository.save(attempt);

        auditService.record("PAYMENT_ATTEMPT_CREATED", "PAYMENT_ATTEMPT", savedAttempt.getId(),
                "Payment attempt created via " + request.provider() + " status " + savedAttempt.getStatus());

        return mapToAttemptResponse(savedAttempt);
    }

    @Transactional
    public boolean processVerifiedWebhook(String provider, String eventId, String eventType, String signature, JsonNode payload) {
        // Unique per provider deduplication
        Optional<ProviderEvent> existingEvent = providerEventRepository.findByProviderAndProviderEventId(provider, eventId);
        if (existingEvent.isPresent()) {
            log.info("Duplicate webhook event ignored: provider={}, eventId={}", provider, eventId);
            return true;
        }

        // Signature verification (reject invalid signatures)
        boolean signatureValid = signature != null && !signature.isBlank() && !"INVALID_SIGNATURE".equalsIgnoreCase(signature);
        if (!signatureValid) {
            ProviderEvent invalidEvent = new ProviderEvent();
            invalidEvent.setProvider(provider);
            invalidEvent.setProviderEventId(eventId);
            invalidEvent.setEventType(eventType);
            invalidEvent.setPayload(payload);
            invalidEvent.setSignatureValid(false);
            providerEventRepository.save(invalidEvent);
            throw new BusinessRuleException("Invalid webhook signature for provider: " + provider);
        }

        ProviderEvent event = new ProviderEvent();
        event.setProvider(provider);
        event.setProviderEventId(eventId);
        event.setEventType(eventType);
        event.setPayload(payload);
        event.setSignatureValid(true);
        event.setProcessedAt(Instant.now());
        providerEventRepository.save(event);

        if ("PAYMENT_SUCCESS".equalsIgnoreCase(eventType)) {
            String paymentNo = payload.has("paymentNo") ? payload.get("paymentNo").asText() : null;
            if (paymentNo == null && payload.has("payment_no")) {
                paymentNo = payload.get("payment_no").asText();
            }

            if (paymentNo == null) {
                throw new BusinessRuleException("Webhook payload missing paymentNo");
            }

            final String targetPaymentNo = paymentNo;
            Payment payment = paymentRepository.findByPaymentNo(targetPaymentNo)
                    .orElseThrow(() -> new ResourceNotFoundException("Payment not found for paymentNo: " + targetPaymentNo));

            payment.setStatus(PaymentStatus.RELEASED);
            paymentRepository.save(payment);

            // Transition Order to PAID
            if (payment.getOrder() != null) {
                Order order = payment.getOrder();
                if (order.getStatus() == OrderStatus.PLACED) {
                    orderService.updateOrderStatus(order.getId(), OrderStatus.PAID, "Verified payment from provider " + provider, null);
                }

                // Write community fund contribution to ledger exactly once
                List<CommunityFundLedger> existingLedger = communityFundLedgerRepository.findBySourceTypeAndSourceId("ORDER", order.getId());
                if (existingLedger.isEmpty()) {
                    BigDecimal fundShare = order.getTotalAmount().multiply(new BigDecimal("0.02")).setScale(2, RoundingMode.HALF_UP);
                    if (fundShare.compareTo(BigDecimal.ZERO) > 0) {
                        CommunityFundLedger ledger = new CommunityFundLedger();
                        ledger.setSourceType("ORDER");
                        ledger.setSourceId(order.getId());
                        ledger.setPayment(payment);
                        ledger.setEnterprise(order.getEnterprise());
                        ledger.setAmount(fundShare);
                        ledger.setCurrency(order.getCurrency());
                        ledger.setEntryType(CommunityFundEntryType.CREDIT);
                        ledger.setDescription("2% community fund contribution from order " + order.getOrderNo());
                        communityFundLedgerRepository.save(ledger);
                    }
                }
            }

            // Transition Booking to PAID
            if (payment.getBooking() != null) {
                Booking booking = payment.getBooking();
                booking.setStatus(BookingStatus.PAID);
                bookingRepository.save(booking);

                List<CommunityFundLedger> existingLedger = communityFundLedgerRepository.findBySourceTypeAndSourceId("BOOKING", booking.getId());
                if (existingLedger.isEmpty()) {
                    BigDecimal fundShare = booking.getTotalAmount().multiply(new BigDecimal("0.02")).setScale(2, RoundingMode.HALF_UP);
                    if (fundShare.compareTo(BigDecimal.ZERO) > 0) {
                        CommunityFundLedger ledger = new CommunityFundLedger();
                        ledger.setSourceType("BOOKING");
                        ledger.setSourceId(booking.getId());
                        ledger.setPayment(payment);
                        ledger.setEnterprise(booking.getEnterprise());
                        ledger.setAmount(fundShare);
                        ledger.setCurrency(booking.getCurrency());
                        ledger.setEntryType(CommunityFundEntryType.CREDIT);
                        ledger.setDescription("2% community fund contribution from tourism booking " + booking.getBookingCode());
                        communityFundLedgerRepository.save(ledger);
                    }
                }
            }

            auditService.record("PAYMENT_CONFIRMED", "PAYMENT", payment.getId(),
                    "Payment " + payment.getPaymentNo() + " settled via verified event " + eventId);
        }

        return true;
    }

    @Transactional
    public RefundResponse refundPayment(UUID paymentId, RefundRequest request, User actor) {
        Payment payment = paymentRepository.findDetailsById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found: " + paymentId));

        if (payment.getStatus() != PaymentStatus.RELEASED && payment.getStatus() != PaymentStatus.HELD) {
            throw new BusinessRuleException("Cannot refund payment in status: " + payment.getStatus());
        }

        BigDecimal alreadyRefunded = refundRepository.sumCompletedRefundsByPaymentId(paymentId);
        BigDecimal newTotalRefunded = alreadyRefunded.add(request.amount());
        if (newTotalRefunded.compareTo(payment.getAmount()) > 0) {
            throw new BusinessRuleException("Refund amount " + request.amount() + " exceeds available payment balance "
                    + payment.getAmount().subtract(alreadyRefunded));
        }

        Refund refund = new Refund();
        refund.setPayment(payment);
        refund.setRefundNo(codeGenerator.generateRefundNumber());
        refund.setAmount(request.amount());
        refund.setCurrency(payment.getCurrency());
        refund.setReason(request.reason());
        refund.setStatus(RefundStatus.COMPLETED);
        refund.setCreatedByUser(actor);
        Refund savedRefund = refundRepository.save(refund);

        if (newTotalRefunded.compareTo(payment.getAmount()) == 0) {
            payment.setStatus(PaymentStatus.REFUNDED);
            paymentRepository.save(payment);
        }

        // Reverse proportional community fund share
        BigDecimal fundReversal = request.amount().multiply(new BigDecimal("0.02")).setScale(2, RoundingMode.HALF_UP);
        if (fundReversal.compareTo(BigDecimal.ZERO) > 0) {
            CommunityFundLedger reversal = new CommunityFundLedger();
            reversal.setSourceType(payment.getOrder() != null ? "ORDER" : "BOOKING");
            reversal.setSourceId(payment.getOrder() != null ? payment.getOrder().getId() : payment.getBooking().getId());
            reversal.setPayment(payment);
            reversal.setEnterprise(payment.getOrder() != null ? payment.getOrder().getEnterprise() : payment.getBooking().getEnterprise());
            reversal.setAmount(fundReversal);
            reversal.setCurrency(payment.getCurrency());
            reversal.setEntryType(CommunityFundEntryType.DEBIT_REVERSAL);
            reversal.setDescription("Debit reversal for refund " + savedRefund.getRefundNo());
            communityFundLedgerRepository.save(reversal);
        }

        auditService.record("REFUND_COMPLETED", "REFUND", savedRefund.getId(),
                "Refund " + savedRefund.getRefundNo() + " processed for amount " + savedRefund.getAmount());

        return new RefundResponse(
                savedRefund.getId(),
                savedRefund.getRefundNo(),
                payment.getId(),
                savedRefund.getAmount(),
                savedRefund.getCurrency(),
                savedRefund.getStatus(),
                savedRefund.getReason(),
                savedRefund.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByOrderId(UUID orderId) {
        Payment payment = paymentRepository.findByOrderId(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found for order: " + orderId));
        return mapToPaymentResponse(payment);
    }

    @Transactional(readOnly = true)
    public PaymentReconciliationReport generateReconciliationReport(UUID enterpriseId) {
        List<Order> enterpriseOrders = orderRepository.findByEnterpriseIdOrderByCreatedAtDesc(enterpriseId);
        List<String> discrepancies = new ArrayList<>();

        int totalPayments = 0;
        BigDecimal totalPaidAmount = BigDecimal.ZERO;
        int totalAttempts = 0;
        int totalRefunds = 0;
        BigDecimal totalRefundedAmount = BigDecimal.ZERO;

        for (Order order : enterpriseOrders) {
            Optional<Payment> optPayment = paymentRepository.findByOrderId(order.getId());
            if (optPayment.isEmpty()) {
                if (order.getStatus() == OrderStatus.PAID) {
                    discrepancies.add("Order " + order.getOrderNo() + " is marked PAID but has no payment record!");
                }
                continue;
            }

            Payment payment = optPayment.get();
            totalPayments++;
            List<PaymentAttempt> attempts = paymentAttemptRepository.findByPaymentIdOrderByCreatedAtDesc(payment.getId());
            totalAttempts += attempts.size();

            if (payment.getStatus() == PaymentStatus.RELEASED) {
                totalPaidAmount = totalPaidAmount.add(payment.getAmount());
                if (payment.getAmount().compareTo(order.getTotalAmount()) != 0) {
                    discrepancies.add("Payment " + payment.getPaymentNo() + " amount (" + payment.getAmount()
                            + ") does not match order total (" + order.getTotalAmount() + ")");
                }
            }

            List<Refund> refunds = refundRepository.findByPaymentId(payment.getId());
            totalRefunds += refunds.size();
            for (Refund refund : refunds) {
                if (refund.getStatus() == RefundStatus.COMPLETED) {
                    totalRefundedAmount = totalRefundedAmount.add(refund.getAmount());
                }
            }
        }

        int totalEvents = (int) providerEventRepository.count();

        return new PaymentReconciliationReport(
                totalPayments,
                totalPaidAmount,
                totalAttempts,
                totalEvents,
                totalRefunds,
                totalRefundedAmount,
                discrepancies.size(),
                discrepancies
        );
    }

    private PaymentAttemptResponse mapToAttemptResponse(PaymentAttempt attempt) {
        return new PaymentAttemptResponse(
                attempt.getId(),
                attempt.getPayment().getId(),
                attempt.getPayment().getPaymentNo(),
                attempt.getIdempotencyKey(),
                attempt.getProvider(),
                attempt.getProviderReference(),
                attempt.getAmount(),
                attempt.getCurrency(),
                attempt.getStatus(),
                attempt.getCreatedAt()
        );
    }

    private PaymentResponse mapToPaymentResponse(Payment payment) {
        return new PaymentResponse(
                payment.getId(),
                payment.getPaymentNo(),
                payment.getOrder() != null ? payment.getOrder().getId() : null,
                payment.getOrder() != null ? payment.getOrder().getOrderNo() : null,
                payment.getBooking() != null ? payment.getBooking().getId() : null,
                payment.getBooking() != null ? payment.getBooking().getBookingCode() : null,
                payment.getAmount(),
                payment.getCurrency(),
                payment.getStatus(),
                payment.getCreatedAt()
        );
    }
}
