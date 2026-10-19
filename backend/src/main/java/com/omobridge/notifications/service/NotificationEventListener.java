package com.omobridge.notifications.service;

import com.omobridge.notifications.domain.NotificationChannel;
import java.math.BigDecimal;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    private final NotificationService notificationService;

    public record SupplyReceivedNotificationEvent(
            UUID supplyId,
            String farmerPhone,
            String farmerLanguage,
            String cropName,
            BigDecimal quantity,
            String unit,
            String enterpriseName
    ) {}

    public record FarmerPaymentNotificationEvent(
            UUID paymentId,
            String farmerPhone,
            String farmerLanguage,
            BigDecimal amount,
            String reference
    ) {}

    public record BookingConfirmedNotificationEvent(
            UUID bookingId,
            String buyerPhone,
            String buyerLanguage,
            String bookingReference,
            String bookingDate
    ) {}

    public record OrderStatusNotificationEvent(
            UUID orderId,
            String buyerPhone,
            String buyerLanguage,
            String orderNo,
            String status
    ) {}

    @EventListener
    public void handleSupplyReceived(SupplyReceivedNotificationEvent event) {
        Map<String, String> vars = Map.of(
                "crop", event.cropName(),
                "quantity", event.quantity().stripTrailingZeros().toPlainString(),
                "unit", event.unit(),
                "enterprise", event.enterpriseName()
        );
        notificationService.queueNotification(
                null, event.farmerPhone(), NotificationChannel.SMS,
                "SUPPLY_RECEIVED", event.farmerLanguage(), vars, "SUPPLY", event.supplyId()
        );
    }

    @EventListener
    public void handleFarmerPayment(FarmerPaymentNotificationEvent event) {
        Map<String, String> vars = Map.of(
                "amount", event.amount().stripTrailingZeros().toPlainString(),
                "reference", event.reference()
        );
        notificationService.queueNotification(
                null, event.farmerPhone(), NotificationChannel.SMS,
                "PAYMENT_SENT", event.farmerLanguage(), vars, "FARMER_PAYMENT", event.paymentId()
        );
    }

    @EventListener
    public void handleBookingConfirmed(BookingConfirmedNotificationEvent event) {
        Map<String, String> vars = Map.of(
                "reference", event.bookingReference(),
                "date", event.bookingDate()
        );
        notificationService.queueNotification(
                null, event.buyerPhone(), NotificationChannel.SMS,
                "BOOKING_CONFIRMED", event.buyerLanguage(), vars, "BOOKING", event.bookingId()
        );
    }

    @EventListener
    public void handleOrderStatus(OrderStatusNotificationEvent event) {
        Map<String, String> vars = Map.of(
                "reference", event.orderNo(),
                "status", event.status()
        );
        notificationService.queueNotification(
                null, event.buyerPhone(), NotificationChannel.SMS,
                "ORDER_STATUS_UPDATED", event.buyerLanguage(), vars, "ORDER", event.orderId()
        );
    }
}
