package com.omobridge.payments;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.omobridge.common.security.JwtAuthenticationFilter;
import com.omobridge.common.security.JwtService;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.config.SecurityConfig;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.payments.api.BuyerPaymentController;
import com.omobridge.payments.api.dto.PaymentResponse;
import com.omobridge.payments.domain.PaymentStatus;
import com.omobridge.payments.service.PaymentService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(BuyerPaymentController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
class BuyerPaymentControllerTest {
    @Autowired
    private MockMvc mockMvc;
    @MockitoBean
    private PaymentService paymentService;
    @MockitoBean
    private UserRepository userRepository;
    @MockitoBean
    private JwtService jwtService;

    private final UUID payerId = UUID.randomUUID();
    private final UUID paymentId = UUID.randomUUID();
    private final UUID orderId = UUID.randomUUID();

    private UsernamePasswordAuthenticationToken auth() {
        var principal = UserPrincipal.create(payerId, "+251911000000", Set.of("BUYER_VISITOR"));
        var user = new User();
        user.setId(payerId);
        when(userRepository.findById(payerId)).thenReturn(Optional.of(user));
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    private PaymentResponse response() {
        return new PaymentResponse(paymentId, "PAY-TEST", orderId, "ORD-TEST", null, null,
                new BigDecimal("25.00"), "ETB", PaymentStatus.RELEASED, Instant.now());
    }

    @Test
    void shouldUsePrincipalPayerInsteadOfCallerSuppliedHistoryFilter() throws Exception {
        when(paymentService.getMyPayments(eq(payerId), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(response())));
        mockMvc.perform(get("/api/v1/payments").param("payerId", UUID.randomUUID().toString())
                        .with(authentication(auth())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.content[0].paymentNo").value("PAY-TEST"));
        verify(paymentService).getMyPayments(eq(payerId), any(Pageable.class));
    }

    @Test
    void shouldScopeReceiptToPrincipal() throws Exception {
        when(paymentService.getMyPayment(paymentId, payerId)).thenReturn(response());
        mockMvc.perform(get("/api/v1/payments/" + paymentId).with(authentication(auth())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.paymentId").value(paymentId.toString()));
        verify(paymentService).getMyPayment(paymentId, payerId);
    }

    @Test
    void shouldScopeOrderLookupToPrincipal() throws Exception {
        when(paymentService.getPaymentByOrderId(orderId, payerId)).thenReturn(response());
        mockMvc.perform(get("/api/v1/payments/order/" + orderId).with(authentication(auth())))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.orderId").value(orderId.toString()));
        verify(paymentService).getPaymentByOrderId(orderId, payerId);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/api/v1/payments", "/api/v1/payments/11111111-1111-4111-8111-111111111111",
            "/api/v1/payments/order/11111111-1111-4111-8111-111111111111"})
    void shouldRejectAnonymousPaymentReads(String path) throws Exception {
        mockMvc.perform(get(path)).andExpect(status().isUnauthorized());
        verifyNoInteractions(paymentService);
    }
}
