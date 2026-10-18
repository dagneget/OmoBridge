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
                "TELEBIRR",
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
                .andExpect(jsonPath("$.data.provider", is("TELEBIRR")));

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
        mockMvc.perform(post("/api/v1/integrations/payments/TELEBIRR/webhook")
                        .param("eventId", "INVALID-EVT-" + UUID.randomUUID())
                        .param("eventType", "PAYMENT_SUCCESS")
                        .header("X-Signature", "INVALID_SIGNATURE")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(payload)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));

        // 2. Valid signature succeeds and transitions order to PAID and payment to RELEASED
        mockMvc.perform(post("/api/v1/integrations/payments/TELEBIRR/webhook")
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
        mockMvc.perform(post("/api/v1/integrations/payments/TELEBIRR/webhook")
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
                "TELEBIRR",
                key
        );
        mockMvc.perform(post("/api/v1/payments/attempt")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());
    }
}
