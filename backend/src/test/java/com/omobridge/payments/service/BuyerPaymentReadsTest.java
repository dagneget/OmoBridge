package com.omobridge.payments.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.payments.domain.Payment;
import com.omobridge.payments.domain.PaymentRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;

@ExtendWith(MockitoExtension.class)
class BuyerPaymentReadsTest {
    @Mock
    private PaymentRepository paymentRepository;
    @InjectMocks
    private PaymentService paymentService;
    @Captor
    private ArgumentCaptor<Pageable> pageable;

    private Payment payment() {
        var payment = new Payment();
        payment.setId(UUID.randomUUID());
        payment.setPaymentNo("PAY-TEST");
        payment.setAmount(new BigDecimal("25.00"));
        return payment;
    }

    @Test
    void shouldBoundHistoryAndKeepStableSortWhenListingOwnPayments() {
        var payer = UUID.randomUUID();
        when(paymentRepository.findByPayerId(eq(payer), pageable.capture()))
                .thenReturn(new PageImpl<>(List.of(payment())));
        var result = paymentService.getMyPayments(payer, PageRequest.of(2, 500, Sort.by("createdAt")));
        assertThat(result.getContent()).hasSize(1);
        assertThat(pageable.getValue().getPageNumber()).isEqualTo(2);
        assertThat(pageable.getValue().getPageSize()).isEqualTo(100);
        assertThat(pageable.getValue().getSort().getOrderFor("id")).isNotNull();
    }

    @Test
    void shouldRejectUnsupportedSortWithoutQueryingPayments() {
        assertThatThrownBy(() -> paymentService.getMyPayments(UUID.randomUUID(),
                PageRequest.of(0, 20, Sort.by("payer.passwordHash")))).isInstanceOf(IllegalArgumentException.class);
        verifyNoInteractions(paymentRepository);
    }

    @Test
    void shouldReadReceiptOnlyThroughPayerScopedQuery() {
        var own = payment();
        var payer = UUID.randomUUID();
        when(paymentRepository.findByIdAndPayerId(own.getId(), payer)).thenReturn(Optional.of(own));
        assertThat(paymentService.getMyPayment(own.getId(), payer).paymentId()).isEqualTo(own.getId());
    }

    @Test
    void shouldHideUnavailableReceiptWhenNotOwned() {
        var id = UUID.randomUUID();
        var payer = UUID.randomUUID();
        when(paymentRepository.findByIdAndPayerId(id, payer)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> paymentService.getMyPayment(id, payer)).isInstanceOf(ResourceNotFoundException.class);
    }

    @Test
    void shouldScopeOrderPaymentReadToPayer() {
        var order = UUID.randomUUID();
        var payer = UUID.randomUUID();
        var own = payment();
        when(paymentRepository.findByOrderIdAndPayerId(order, payer)).thenReturn(Optional.of(own));
        assertThat(paymentService.getPaymentByOrderId(order, payer).paymentId()).isEqualTo(own.getId());
    }

    @Test
    void shouldHideForeignOrderPayment() {
        var order = UUID.randomUUID();
        var payer = UUID.randomUUID();
        when(paymentRepository.findByOrderIdAndPayerId(order, payer)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> paymentService.getPaymentByOrderId(order, payer))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
