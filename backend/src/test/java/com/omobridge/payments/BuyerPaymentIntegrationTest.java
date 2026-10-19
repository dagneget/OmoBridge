package com.omobridge.payments;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.common.BaseIntegrationTest;
import com.omobridge.common.security.JwtService;
import com.omobridge.common.security.RoleName;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.EnterpriseStaff;
import com.omobridge.identity.domain.EnterpriseStaffRepository;
import com.omobridge.identity.domain.EnterpriseStatus;
import com.omobridge.identity.domain.Role;
import com.omobridge.identity.domain.RoleRepository;
import com.omobridge.identity.domain.StaffRole;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.orders.api.dto.CheckoutItemRequest;
import com.omobridge.orders.api.dto.CheckoutRequest;
import com.omobridge.orders.api.dto.CheckoutResponse;
import com.omobridge.orders.domain.CheckoutGroupRepository;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.orders.domain.OrderStatus;
import com.omobridge.orders.domain.StockReservationRepository;
import com.omobridge.orders.service.CheckoutService;
import com.omobridge.payments.api.dto.CreatePaymentAttemptRequest;
import com.omobridge.payments.api.dto.RefundRequest;
import com.omobridge.payments.domain.CommunityFundLedger;
import com.omobridge.payments.domain.CommunityFundLedgerRepository;
import com.omobridge.payments.domain.Payment;
import com.omobridge.payments.domain.PaymentAttempt;
import com.omobridge.payments.domain.PaymentAttemptRepository;
import com.omobridge.payments.domain.PaymentRepository;
import com.omobridge.payments.domain.PaymentStatus;
import com.omobridge.payments.domain.ProviderEventRepository;
import com.omobridge.payments.domain.RefundRepository;
import com.omobridge.products.domain.Product;
import com.omobridge.products.domain.ProductPriceBreakdown;
import com.omobridge.products.domain.ProductPriceBreakdownRepository;
import com.omobridge.products.domain.ProductRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.greaterThanOrEqualTo;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class BuyerPaymentIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private EnterpriseRepository enterpriseRepository;

    @Autowired
    private EnterpriseStaffRepository enterpriseStaffRepository;

    @Autowired
    private ProductRepository productRepository;

    @Autowired
    private ProductPriceBreakdownRepository priceBreakdownRepository;

    @Autowired
    private OrderRepository orderRepository;

    @Autowired
    private CheckoutGroupRepository checkoutGroupRepository;

    @Autowired
    private StockReservationRepository stockReservationRepository;

    @Autowired
    private PaymentRepository paymentRepository;

    @Autowired
    private PaymentAttemptRepository paymentAttemptRepository;

    @Autowired
    private ProviderEventRepository providerEventRepository;

    @Autowired
    private RefundRepository refundRepository;

    @Autowired
    private CommunityFundLedgerRepository communityFundLedgerRepository;

    @Autowired
    private CheckoutService checkoutService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @Autowired
    private com.omobridge.payments.service.PaymentService paymentService;

    @Autowired
    private jakarta.persistence.EntityManagerFactory entityManagerFactory;

    @Autowired
    private com.omobridge.bookings.domain.BookingRepository bookingRepository;

    private User buyer;
    private User enterpriseOwner;
    private Enterprise enterprise;
    private Product product;
    private Order order;

    private String buyerToken;
    private String enterpriseOwnerToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DELETE FROM delivery_job_orders; DELETE FROM delivery_status_history; DELETE FROM delivery_locations; DELETE FROM delivery_jobs; DELETE FROM reviews;");
        communityFundLedgerRepository.deleteAll();
        refundRepository.deleteAll();
        providerEventRepository.deleteAll();
        paymentAttemptRepository.deleteAll();
        paymentRepository.deleteAll();
        stockReservationRepository.deleteAll();
        orderRepository.deleteAll();
        checkoutGroupRepository.deleteAll();
        priceBreakdownRepository.deleteAll();
        productRepository.deleteAll();

        Role buyerRole = roleRepository.findByName(RoleName.BUYER_VISITOR.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.BUYER_VISITOR.name(), "Buyer")));
        Role enterpriseRole = roleRepository.findByName(RoleName.MICRO_ENTERPRISE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.MICRO_ENTERPRISE.name(), "Enterprise")));

        enterpriseOwner = createTestUser("+251911910001", "Enterprise Owner Pay", enterpriseRole);
        buyer = createTestUser("+251911910002", "Buyer Pay", buyerRole);

        enterprise = new Enterprise();
        enterprise.setName("Omo Valley Artisans");
        enterprise.setRegistrationNumber("REG-PAY-" + UUID.randomUUID().toString().substring(0, 6));
        enterprise.setOwnerUser(enterpriseOwner);
        enterprise.setLocationWoreda("Turmi");
        enterprise.setLocationTown("Dimeka");
        enterprise.setContactPhone(enterpriseOwner.getPhoneNumber());
        enterprise.setStatus(EnterpriseStatus.ACTIVE);
        enterprise = enterpriseRepository.save(enterprise);

        EnterpriseStaff staff = new EnterpriseStaff();
        staff.setEnterprise(enterprise);
        staff.setUser(enterpriseOwner);
        staff.setRole(StaffRole.OWNER);
        staff.setActive(true);
        enterpriseStaffRepository.save(staff);

        buyerToken = jwtService.generateToken(buyer.getId(), buyer.getPhoneNumber(), Set.of("ROLE_BUYER_VISITOR"));
        enterpriseOwnerToken = jwtService.generateToken(enterpriseOwner.getId(), enterpriseOwner.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));

        product = new Product();
        product.setEnterprise(enterprise);
        product.setSku("POT-001");
        product.setName("Handmade Clay Pot");
        product.setDescription("Authentic clay pot");
        product.setCategory("Crafts");
        product.setUnit("piece");
        product.setPackSize(new BigDecimal("1.00"));
        product.setUnitPrice(new BigDecimal("500.00"));
        product.setCurrency("ETB");
        product.setStockOnHand(new BigDecimal("10.00"));
        product.setStockReserved(BigDecimal.ZERO);
        product.setPublished(true);
        product = productRepository.save(product);

        ProductPriceBreakdown breakdown = new ProductPriceBreakdown();
        breakdown.setProduct(product);
        breakdown.setPurchaseCost(new BigDecimal("250.00"));
        breakdown.setProcessingCost(new BigDecimal("50.00"));
        breakdown.setPackagingCost(new BigDecimal("25.00"));
        breakdown.setLaborCost(new BigDecimal("50.00"));
        breakdown.setTransportCost(new BigDecimal("25.00"));
        breakdown.setEnterpriseMargin(new BigDecimal("50.00"));
        breakdown.setCommunityFund(new BigDecimal("10.00"));
        breakdown.setTaxAmount(new BigDecimal("25.00"));
        breakdown.setPlatformFee(new BigDecimal("15.00"));
        breakdown.setTotalPrice(new BigDecimal("500.00"));
        priceBreakdownRepository.save(breakdown);
        product.setPriceBreakdown(breakdown);

        // Create an initial test order via CheckoutService
        CheckoutRequest checkoutReq = new CheckoutRequest(
                "IDEMP-PAY-" + UUID.randomUUID(),
                List.of(new CheckoutItemRequest(product.getId(), new BigDecimal("2.00"))),
                "Jinka Main Street",
                buyer.getPhoneNumber(),
                null,
                null,
                null
        );
        CheckoutResponse checkoutResp = checkoutService.checkout(checkoutReq, buyer);
        UUID orderId = checkoutResp.orders().get(0).orderId();
        order = orderRepository.findById(orderId).orElseThrow();
    }


    private Payment saveHistoryPayment(User payer) {
        var payment = new Payment();
        payment.setPaymentNo("PAY-HISTORY-" + UUID.randomUUID());
        payment.setOrder(order);
        payment.setPayer(payer);
        payment.setAmount(new BigDecimal("500.00"));
        payment.setCurrency("ETB");
        payment.setStatus(PaymentStatus.PENDING);
        return paymentRepository.saveAndFlush(payment);
    }

    @Test
    void shouldListOnlyOwnPaymentsWithStablePagination() throws Exception {
        var own = saveHistoryPayment(buyer);
        saveHistoryPayment(buyer);
        var foreign = saveHistoryPayment(enterpriseOwner);
        mockMvc.perform(get("/api/v1/payments").header("Authorization", "Bearer " + buyerToken)
                        .param("size", "1").param("page", "0"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.totalElements").value(2))
                .andExpect(jsonPath("$.data.totalPages").value(2))
                .andExpect(jsonPath("$.data.isLast").value(false));
        mockMvc.perform(get("/api/v1/payments/" + own.getId()).header("Authorization", "Bearer " + buyerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentId").value(own.getId().toString()))
                .andExpect(jsonPath("$.data.orderNo").value(order.getOrderNo()));
        mockMvc.perform(get("/api/v1/payments/" + foreign.getId()).header("Authorization", "Bearer " + buyerToken))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/payments/" + UUID.randomUUID()).header("Authorization", "Bearer " + buyerToken))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldDenyCrossPayerOrderLookupAndRequireAuthentication() throws Exception {
        var own = saveHistoryPayment(buyer);
        // Even an old inconsistent payment cannot grant its payer access to another buyer's order.
        saveHistoryPayment(enterpriseOwner);
        mockMvc.perform(get("/api/v1/payments/order/" + order.getId())
                        .header("Authorization", "Bearer " + enterpriseOwnerToken)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/payments/order/" + order.getId())
                        .header("Authorization", "Bearer " + buyerToken)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.paymentId").value(own.getId().toString()));
        mockMvc.perform(get("/api/v1/payments")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/payments/" + own.getId())).andExpect(status().isUnauthorized());
    }

    @Test
    void shouldReturnEmptyHistoryAndRejectUnsupportedSort() throws Exception {
        mockMvc.perform(get("/api/v1/payments").header("Authorization", "Bearer " + buyerToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.content.length()").value(0))
                .andExpect(jsonPath("$.data.totalElements").value(0));
        mockMvc.perform(get("/api/v1/payments").header("Authorization", "Bearer " + buyerToken)
                        .param("sort", "payer.passwordHash,asc")).andExpect(status().isBadRequest());
    }

    @Test
    void shouldMapHistoryWithoutPerPaymentLazyQueries() {
        for (int index = 0; index < 4; index++) saveHistoryPayment(buyer);
        var booking = new com.omobridge.bookings.domain.Booking();
        booking.setBookingCode("BK-HISTORY-" + UUID.randomUUID().toString().substring(0, 8));
        booking.setEnterprise(enterprise);
        booking.setBuyer(buyer);
        booking.setVisitDate(java.time.LocalDate.now().plusDays(1));
        booking.setPartySize(1);
        booking.setContactName("History buyer");
        booking.setContactPhone(buyer.getPhoneNumber());
        booking.setSubtotal(new BigDecimal("500.00"));
        booking.setTotalAmount(new BigDecimal("500.00"));
        booking = bookingRepository.saveAndFlush(booking);
        var bookingPayment = new Payment();
        bookingPayment.setPaymentNo("PAY-BOOKING-" + UUID.randomUUID());
        bookingPayment.setBooking(booking);
        bookingPayment.setPayer(buyer);
        bookingPayment.setAmount(new BigDecimal("500.00"));
        paymentRepository.saveAndFlush(bookingPayment);
        var statistics = entityManagerFactory.unwrap(org.hibernate.SessionFactory.class).getStatistics();
        var previouslyEnabled = statistics.isStatisticsEnabled();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
        try {
            var page = paymentService.getMyPayments(buyer.getId(),
                    org.springframework.data.domain.PageRequest.of(0, 2));
            assertThat(page.getContent()).hasSize(2);
            assertThat(page.getTotalElements()).isEqualTo(5);
            assertThat(page.getContent()).anySatisfy(payment ->
                    assertThat(payment.orderNo()).isEqualTo(order.getOrderNo()));
            assertThat(page.getContent()).anySatisfy(payment ->
                    assertThat(payment.bookingCode()).startsWith("BK-HISTORY-"));
            assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(2);
        } finally {
            statistics.setStatisticsEnabled(previouslyEnabled);
        }
    }


    @Test
    void shouldExposePartialAndFullRefundsOnlyToTheirPayer() throws Exception {
        var payment = saveHistoryPayment(buyer);
        payment.setStatus(PaymentStatus.RELEASED);
        paymentRepository.saveAndFlush(payment);
        paymentService.refundPayment(payment.getId(), new RefundRequest(new BigDecimal("100.00"), "Partial return"),
                enterpriseOwner);
        mockMvc.perform(get("/api/v1/payments/" + payment.getId() + "/refunds")
                        .header("Authorization", "Bearer " + buyerToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.coverage").value("PARTIAL"))
                .andExpect(jsonPath("$.data.completedRefundAmount").value(100.00))
                .andExpect(jsonPath("$.data.notRefundedAmount").value(400.00))
                .andExpect(jsonPath("$.data.refunds.content[0].status").value("COMPLETED"));
        paymentService.refundPayment(payment.getId(), new RefundRequest(new BigDecimal("400.00"), "Remaining return"),
                enterpriseOwner);
        mockMvc.perform(get("/api/v1/payments/" + payment.getId() + "/refunds")
                        .header("Authorization", "Bearer " + buyerToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.coverage").value("FULL"))
                .andExpect(jsonPath("$.data.completedRefundAmount").value(500.00))
                .andExpect(jsonPath("$.data.notRefundedAmount").value(0.00));
        mockMvc.perform(get("/api/v1/payments/" + payment.getId() + "/refunds")
                        .header("Authorization", "Bearer " + enterpriseOwnerToken)).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/payments/" + payment.getId() + "/refunds"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void shouldExcludePendingAndFailedRefundsFromTotalsWithBoundedQueries() {
        var payment = saveHistoryPayment(buyer);
        for (var status : com.omobridge.payments.domain.RefundStatus.values()) {
            var refund = new com.omobridge.payments.domain.Refund();
            refund.setPayment(payment);
            refund.setRefundNo("REF-HISTORY-" + UUID.randomUUID());
            refund.setAmount(new BigDecimal("100.00"));
            refund.setStatus(status);
            refundRepository.saveAndFlush(refund);
        }
        var statistics = entityManagerFactory.unwrap(org.hibernate.SessionFactory.class).getStatistics();
        var previouslyEnabled = statistics.isStatisticsEnabled();
        statistics.setStatisticsEnabled(true);
        statistics.clear();
        try {
            var summary = paymentService.getMyRefunds(payment.getId(), buyer.getId(),
                    org.springframework.data.domain.PageRequest.of(0, 1));
            assertThat(summary.completedRefundAmount()).isEqualByComparingTo("100.00");
            assertThat(summary.notRefundedAmount()).isEqualByComparingTo("400.00");
            assertThat(summary.refunds().content()).hasSize(1);
            assertThat(summary.refunds().totalElements()).isEqualTo(3);
            assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(4);
        } finally {
            statistics.setStatisticsEnabled(previouslyEnabled);
        }
    }

    @Test
    void shouldRequireBookingBuyerAndPayerForBookingPaymentRead() throws Exception {
        var booking = new com.omobridge.bookings.domain.Booking();
        booking.setBookingCode("BK-REFUND-" + UUID.randomUUID().toString().substring(0, 8));
        booking.setEnterprise(enterprise);
        booking.setBuyer(buyer);
        booking.setVisitDate(java.time.LocalDate.now().plusDays(1));
        booking.setPartySize(1);
        booking.setContactName("Refund buyer");
        booking.setContactPhone(buyer.getPhoneNumber());
        booking.setSubtotal(new BigDecimal("500.00"));
        booking.setTotalAmount(new BigDecimal("500.00"));
        booking = bookingRepository.saveAndFlush(booking);
        var payment = new Payment();
        payment.setPaymentNo("PAY-BK-REFUND-" + UUID.randomUUID());
        payment.setBooking(booking);
        payment.setPayer(buyer);
        payment.setAmount(new BigDecimal("500.00"));
        payment = paymentRepository.saveAndFlush(payment);
        mockMvc.perform(get("/api/v1/payments/booking/" + booking.getId())
                        .header("Authorization", "Bearer " + buyerToken))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.paymentId").value(payment.getId().toString()))
                .andExpect(jsonPath("$.data.bookingCode").value(booking.getBookingCode()));
        mockMvc.perform(get("/api/v1/payments/booking/" + booking.getId())
                        .header("Authorization", "Bearer " + enterpriseOwnerToken)).andExpect(status().isNotFound());
    }

    private User createTestUser(String phone, String name, Role role) {
        return userRepository.findByPhoneNumber(phone).orElseGet(() -> {
            User user = new User();
            user.setPhoneNumber(phone);
            user.setPasswordHash(passwordEncoder.encode("Secret@123"));
            user.setFullName(name);
            user.setStatus(UserStatus.ACTIVE);
            user.addRole(role);
            return userRepository.save(user);
        });
    }

    @Test
    @DisplayName("Create payment attempt and idempotency: repeated request returns same attempt without second charge")
    void testCreatePaymentAttemptAndIdempotency() throws Exception {
        String idempotencyKey = "PAY-IDEMP-" + UUID.randomUUID();
        CreatePaymentAttemptRequest request = new CreatePaymentAttemptRequest(
                order.getId(),
                null,
                "CHAPA",
                idempotencyKey
        );

        // 1. First attempt
        mockMvc.perform(post("/api/v1/payments/attempt")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("SUCCESS")))
                .andExpect(jsonPath("$.data.provider", is("CHAPA")));

        assertThat(paymentAttemptRepository.count()).isEqualTo(1);
        PaymentAttempt firstAttempt = paymentAttemptRepository.findAll().get(0);

        // 2. Repeat exact same attempt with same idempotency key -> returns identical record
        mockMvc.perform(post("/api/v1/payments/attempt")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.attemptId", is(firstAttempt.getId().toString())));

        assertThat(paymentAttemptRepository.count()).isEqualTo(1);
    }

    @Test
    @DisplayName("Verified provider events: signature check, duplicate event rejection, order & community fund update")
    void testVerifiedWebhookEventFlow() throws Exception {
        // Create payment attempt first
        String idempotencyKey = "PAY-IDEMP-WH-" + UUID.randomUUID();
        paymentServiceAttempt(idempotencyKey);

        Payment payment = paymentRepository.findByOrderId(order.getId()).orElseThrow();
        String paymentNo = payment.getPaymentNo();

        String eventId = "TB-EVT-" + UUID.randomUUID();
        Map<String, Object> payload = Map.of(
                "paymentNo", paymentNo,
                "amount", payment.getAmount(),
                "status", "COMPLETED"
        );

        // 1. Invalid signature must be rejected
        mockMvc.perform(post("/api/v1/integrations/payments/CHAPA/webhook")
                        .param("eventId", "INVALID-EVT-" + UUID.randomUUID())
                        .param("eventType", "PAYMENT_SUCCESS")
                        .header("X-Signature", "INVALID_SIGNATURE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));

        // 2. Valid signature succeeds and transitions order to PAID and payment to RELEASED
        mockMvc.perform(post("/api/v1/integrations/payments/CHAPA/webhook")
                        .param("eventId", eventId)
                        .param("eventType", "PAYMENT_SUCCESS")
                        .header("X-Signature", "VALID_HMAC_SHA256_TEST_SIGNATURE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        Payment updatedPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(updatedPayment.getStatus()).isEqualTo(PaymentStatus.RELEASED);

        Order updatedOrder = orderRepository.findById(order.getId()).orElseThrow();
        assertThat(updatedOrder.getStatus()).isEqualTo(OrderStatus.PAID);

        // Verify community fund credit ledger
        List<CommunityFundLedger> ledgers = communityFundLedgerRepository.findBySourceTypeAndSourceId("ORDER", order.getId());
        assertThat(ledgers).hasSize(1);
        assertThat(ledgers.get(0).getAmount()).isGreaterThan(BigDecimal.ZERO);

        // 3. Duplicate event is ignored idempotently without second credit to fund
        mockMvc.perform(post("/api/v1/integrations/payments/CHAPA/webhook")
                        .param("eventId", eventId)
                        .param("eventType", "PAYMENT_SUCCESS")
                        .header("X-Signature", "VALID_HMAC_SHA256_TEST_SIGNATURE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isOk());

        assertThat(communityFundLedgerRepository.findBySourceTypeAndSourceId("ORDER", order.getId())).hasSize(1);
    }

    @Test
    @DisplayName("Refunds: partial refund, over-refund rejection, and community fund debit reversal")
    void testRefundsAndReversals() throws Exception {
        // Complete payment first
        testVerifiedWebhookEventFlow();

        Payment payment = paymentRepository.findByOrderId(order.getId()).orElseThrow();
        BigDecimal paymentAmount = payment.getAmount();

        // 1. Partial refund of 100.00
        RefundRequest partialRefund = new RefundRequest(new BigDecimal("100.00"), "Customer requested partial return");
        mockMvc.perform(post("/api/v1/enterprises/" + enterprise.getId() + "/payments/" + payment.getId() + "/refund")
                        .header("Authorization", "Bearer " + enterpriseOwnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(partialRefund)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("COMPLETED")));

        assertThat(refundRepository.count()).isEqualTo(1);
        BigDecimal completedRefunds = refundRepository.sumCompletedRefundsByPaymentId(payment.getId());
        assertThat(completedRefunds).isEqualByComparingTo("100.00");

        // 2. Over-refund rejection: attempting to refund more than remaining amount must fail
        RefundRequest overRefund = new RefundRequest(paymentAmount, "Excessive refund amount");
        mockMvc.perform(post("/api/v1/enterprises/" + enterprise.getId() + "/payments/" + payment.getId() + "/refund")
                        .header("Authorization", "Bearer " + enterpriseOwnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overRefund)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));

        // 3. Complete remaining refund -> payment status becomes REFUNDED
        BigDecimal remaining = paymentAmount.subtract(new BigDecimal("100.00"));
        RefundRequest finalRefund = new RefundRequest(remaining, "Final balance refund");
        mockMvc.perform(post("/api/v1/enterprises/" + enterprise.getId() + "/payments/" + payment.getId() + "/refund")
                        .header("Authorization", "Bearer " + enterpriseOwnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(finalRefund)))
                .andExpect(status().isOk());

        Payment finalPayment = paymentRepository.findById(payment.getId()).orElseThrow();
        assertThat(finalPayment.getStatus()).isEqualTo(PaymentStatus.REFUNDED);
    }

    @Test
    @DisplayName("Payment reconciliation report: detects and flags financial discrepancies")
    void testPaymentReconciliationReport() throws Exception {
        // Run payment flow
        testVerifiedWebhookEventFlow();

        mockMvc.perform(get("/api/v1/enterprises/" + enterprise.getId() + "/payments/reconciliation")
                        .header("Authorization", "Bearer " + enterpriseOwnerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalPayments", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.data.mismatchCount", is(0)));
    }

    private void paymentServiceAttempt(String key) throws Exception {
        CreatePaymentAttemptRequest request = new CreatePaymentAttemptRequest(
                order.getId(),
                null,
                "CHAPA",
                key
        );
        mockMvc.perform(post("/api/v1/payments/attempt")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }
}
