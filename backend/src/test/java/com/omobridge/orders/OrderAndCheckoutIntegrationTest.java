package com.omobridge.orders;

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
import com.omobridge.orders.api.dto.UpdateOrderStatusRequest;
import com.omobridge.orders.domain.CheckoutGroupRepository;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderItem;
import com.omobridge.orders.domain.OrderItemRepository;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.orders.domain.OrderStatus;
import com.omobridge.orders.domain.ReservationStatus;
import com.omobridge.orders.domain.StockReservation;
import com.omobridge.orders.domain.StockReservationRepository;
import com.omobridge.orders.service.ReservationExpiryService;
import com.omobridge.products.domain.Product;
import com.omobridge.products.domain.ProductPriceBreakdown;
import com.omobridge.products.domain.ProductPriceBreakdownRepository;
import com.omobridge.products.domain.ProductRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class OrderAndCheckoutIntegrationTest extends BaseIntegrationTest {

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
    private OrderItemRepository orderItemRepository;

    @Autowired
    private CheckoutGroupRepository checkoutGroupRepository;

    @Autowired
    private StockReservationRepository stockReservationRepository;

    @Autowired
    private ReservationExpiryService reservationExpiryService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private User buyerA;
    private User buyerB;
    private User enterpriseOwnerA;
    private User enterpriseOwnerB;
    private Enterprise enterpriseA;
    private Enterprise enterpriseB;
    private Product productA;
    private Product productB;

    private String buyerAToken;
    private String buyerBToken;
    private String enterpriseAOwnerToken;
    private String enterpriseBOwnerToken;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DELETE FROM delivery_job_orders; DELETE FROM delivery_status_history; DELETE FROM delivery_locations; DELETE FROM delivery_jobs; DELETE FROM reviews; DELETE FROM refunds; DELETE FROM provider_events; DELETE FROM payment_attempts; DELETE FROM community_fund_ledger; DELETE FROM payments;");
        stockReservationRepository.deleteAll();
        orderRepository.deleteAll();
        checkoutGroupRepository.deleteAll();
        priceBreakdownRepository.deleteAll();
        productRepository.deleteAll();

        Role buyerRole = roleRepository.findByName(RoleName.BUYER_VISITOR.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.BUYER_VISITOR.name(), "Buyer")));
        Role enterpriseRole = roleRepository.findByName(RoleName.MICRO_ENTERPRISE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.MICRO_ENTERPRISE.name(), "Enterprise")));

        enterpriseOwnerA = createTestUser("+251911900001", "Enterprise Owner A", enterpriseRole);
        enterpriseOwnerB = createTestUser("+251911900002", "Enterprise Owner B", enterpriseRole);
        buyerA = createTestUser("+251911900003", "Buyer A", buyerRole);
        buyerB = createTestUser("+251911900004", "Buyer B", buyerRole);

        enterpriseA = createTestEnterprise("South Omo Honey Co", enterpriseOwnerA);
        enterpriseB = createTestEnterprise("Hamer Coffee Union", enterpriseOwnerB);

        buyerAToken = jwtService.generateToken(buyerA.getId(), buyerA.getPhoneNumber(), Set.of("ROLE_BUYER_VISITOR"));
        buyerBToken = jwtService.generateToken(buyerB.getId(), buyerB.getPhoneNumber(), Set.of("ROLE_BUYER_VISITOR"));
        enterpriseAOwnerToken = jwtService.generateToken(enterpriseOwnerA.getId(), enterpriseOwnerA.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));
        enterpriseBOwnerToken = jwtService.generateToken(enterpriseOwnerB.getId(), enterpriseOwnerB.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));

        productA = createTestProduct(enterpriseA, "HNY-001", "Forest Honey 500g", new BigDecimal("350.00"), new BigDecimal("20.00"));
        productB = createTestProduct(enterpriseB, "COF-001", "Highland Coffee 250g", new BigDecimal("250.00"), new BigDecimal("15.00"));
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

    private Enterprise createTestEnterprise(String name, User owner) {
        Enterprise enterprise = new Enterprise();
        enterprise.setName(name);
        enterprise.setRegistrationNumber("REG-" + UUID.randomUUID().toString().substring(0, 8));
        enterprise.setOwnerUser(owner);
        enterprise.setLocationWoreda("Turmi");
        enterprise.setLocationTown("Dimeka");
        enterprise.setContactPhone(owner.getPhoneNumber());
        enterprise.setStatus(EnterpriseStatus.ACTIVE);
        Enterprise saved = enterpriseRepository.save(enterprise);

        EnterpriseStaff staff = new EnterpriseStaff();
        staff.setEnterprise(saved);
        staff.setUser(owner);
        staff.setRole(StaffRole.OWNER);
        staff.setActive(true);
        enterpriseStaffRepository.save(staff);

        return saved;
    }

    private Product createTestProduct(Enterprise enterprise, String sku, String name, BigDecimal price, BigDecimal stock) {
        Product product = new Product();
        product.setEnterprise(enterprise);
        product.setSku(sku);
        product.setName(name);
        product.setDescription("Organic local product");
        product.setCategory("Food");
        product.setUnit("jar");
        product.setPackSize(new BigDecimal("1.00"));
        product.setUnitPrice(price);
        product.setCurrency("ETB");
        product.setStockOnHand(stock);
        product.setStockReserved(BigDecimal.ZERO);
        product.setPublished(true);
        Product saved = productRepository.save(product);

        ProductPriceBreakdown breakdown = new ProductPriceBreakdown();
        breakdown.setProduct(saved);
        breakdown.setPurchaseCost(price.multiply(new BigDecimal("0.50")));
        breakdown.setProcessingCost(price.multiply(new BigDecimal("0.10")));
        breakdown.setPackagingCost(price.multiply(new BigDecimal("0.05")));
        breakdown.setLaborCost(price.multiply(new BigDecimal("0.10")));
        breakdown.setTransportCost(price.multiply(new BigDecimal("0.05")));
        breakdown.setEnterpriseMargin(price.multiply(new BigDecimal("0.10")));
        breakdown.setCommunityFund(price.multiply(new BigDecimal("0.02")));
        breakdown.setTaxAmount(price.multiply(new BigDecimal("0.05")));
        breakdown.setPlatformFee(price.multiply(new BigDecimal("0.03")));
        breakdown.setTotalPrice(price);
        priceBreakdownRepository.save(breakdown);
        saved.setPriceBreakdown(breakdown);
        return saved;
    }

    @Test
    @DisplayName("Single and multi-enterprise checkout with stock reservation and idempotency")
    void testCheckoutMultiEnterpriseAndIdempotency() throws Exception {
        String idempotencyKey = "IDEMP-" + UUID.randomUUID();
        CheckoutRequest request = new CheckoutRequest(
                idempotencyKey,
                List.of(
                        new CheckoutItemRequest(productA.getId(), new BigDecimal("2.00")),
                        new CheckoutItemRequest(productB.getId(), new BigDecimal("3.00"))
                ),
                "Jinka Main Street, House 42",
                "+251911900003",
                5.78,
                36.56,
                "Leave at front desk"
        );

        // 1. Initial checkout
        mockMvc.perform(post("/api/v1/checkout")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("CREATED")))
                .andExpect(jsonPath("$.data.orders", hasSize(2)));

        // Verify stock reservations
        Product updatedA = productRepository.findById(productA.getId()).orElseThrow();
        Product updatedB = productRepository.findById(productB.getId()).orElseThrow();
        assertThat(updatedA.getStockReserved()).isEqualByComparingTo("2.00");
        assertThat(updatedB.getStockReserved()).isEqualByComparingTo("3.00");

        // 2. Test Idempotency: repeating checkout with exact same key returns same response and does not double-reserve stock
        mockMvc.perform(post("/api/v1/checkout")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.orders", hasSize(2)));

        Product updatedA2 = productRepository.findById(productA.getId()).orElseThrow();
        assertThat(updatedA2.getStockReserved()).isEqualByComparingTo("2.00");
    }

    @Test
    @DisplayName("Insufficient stock rejects entire checkout with all-or-nothing rollback")
    void testInsufficientStockRollback() throws Exception {
        CheckoutRequest request = new CheckoutRequest(
                "IDEMP-FAIL-" + UUID.randomUUID(),
                List.of(
                        new CheckoutItemRequest(productA.getId(), new BigDecimal("2.00")),
                        new CheckoutItemRequest(productB.getId(), new BigDecimal("500.00")) // exceeds 15.00 available!
                ),
                "Turmi Market",
                "+251911900003",
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/checkout")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));

        // Neither product A nor product B should have any reservations
        Product updatedA = productRepository.findById(productA.getId()).orElseThrow();
        Product updatedB = productRepository.findById(productB.getId()).orElseThrow();
        assertThat(updatedA.getStockReserved()).isEqualByComparingTo("0.00");
        assertThat(updatedB.getStockReserved()).isEqualByComparingTo("0.00");
        assertThat(orderRepository.count()).isZero();
    }

    @Test
    @DisplayName("Untrusted client price / snapshot test: modifying catalog price does not alter historical order snapshot")
    void testPriceSnapshotPreservation() throws Exception {
        CheckoutRequest request = new CheckoutRequest(
                "IDEMP-SNAP-" + UUID.randomUUID(),
                List.of(new CheckoutItemRequest(productA.getId(), new BigDecimal("1.00"))),
                "Jinka",
                "+251911900003",
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/checkout")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        Order savedOrder = orderRepository.findAll().get(0);
        OrderItem item = orderItemRepository.findAll().get(0);
        assertThat(item.getUnitPriceSnapshot()).isEqualByComparingTo("350.00");
        assertThat(item.getProductNameSnapshot()).isEqualTo("Forest Honey 500g");

        // Now change the product catalog price and name
        Product latestProductA = productRepository.findById(productA.getId()).orElseThrow();
        latestProductA.setUnitPrice(new BigDecimal("999.00"));
        latestProductA.setName("Super Premium Forest Honey");
        productRepository.save(latestProductA);

        // Fetch order details again and verify snapshot is unchanged
        mockMvc.perform(get("/api/v1/orders/" + savedOrder.getId())
                        .header("Authorization", "Bearer " + buyerAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items[0].unitPrice", is(350.0)))
                .andExpect(jsonPath("$.data.items[0].productName", is("Forest Honey 500g")));
    }

    @Test
    @DisplayName("Order lifecycle transition table: PLACED -> PAID -> PACKED -> IN_TRANSIT -> DELIVERED and invalid transition rejection")
    void testOrderLifecycleTransitions() throws Exception {
        CheckoutRequest request = new CheckoutRequest(
                "IDEMP-TRANS-" + UUID.randomUUID(),
                List.of(new CheckoutItemRequest(productA.getId(), new BigDecimal("2.00"))),
                "Jinka",
                "+251911900003",
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/checkout")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        Order savedOrder = orderRepository.findAll().get(0);
        UUID orderId = savedOrder.getId();

        // 1. Transition PLACED -> PAID (commits reservation and deducts stock on hand)
        mockMvc.perform(patch("/api/v1/enterprises/" + enterpriseA.getId() + "/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + enterpriseAOwnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateOrderStatusRequest(OrderStatus.PAID, "Payment received"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PAID")));

        Product productAfterPaid = productRepository.findById(productA.getId()).orElseThrow();
        assertThat(productAfterPaid.getStockOnHand()).isEqualByComparingTo("18.00");
        assertThat(productAfterPaid.getStockReserved()).isEqualByComparingTo("0.00");

        // 2. Transition PAID -> PACKED
        mockMvc.perform(patch("/api/v1/enterprises/" + enterpriseA.getId() + "/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + enterpriseAOwnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateOrderStatusRequest(OrderStatus.PACKED, "Items boxed"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PACKED")));

        // 3. Transition PACKED -> IN_TRANSIT
        mockMvc.perform(patch("/api/v1/enterprises/" + enterpriseA.getId() + "/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + enterpriseAOwnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateOrderStatusRequest(OrderStatus.IN_TRANSIT, "Dispatched"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("IN_TRANSIT")));

        // 4. Transition IN_TRANSIT -> DELIVERED
        mockMvc.perform(patch("/api/v1/enterprises/" + enterpriseA.getId() + "/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + enterpriseAOwnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateOrderStatusRequest(OrderStatus.DELIVERED, "Handed to customer"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("DELIVERED")));

        // 5. Invalid transition: DELIVERED -> CANCELLED must fail
        mockMvc.perform(patch("/api/v1/enterprises/" + enterpriseA.getId() + "/orders/" + orderId + "/status")
                        .header("Authorization", "Bearer " + enterpriseAOwnerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateOrderStatusRequest(OrderStatus.CANCELLED, "Too late"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));
    }

    @Test
    @DisplayName("Reservation expiry releases stock and cancels unpaid order")
    void testReservationExpiryReleasesStock() throws Exception {
        CheckoutRequest request = new CheckoutRequest(
                "IDEMP-EXP-" + UUID.randomUUID(),
                List.of(new CheckoutItemRequest(productA.getId(), new BigDecimal("3.00"))),
                "Jinka",
                "+251911900003",
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/checkout")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        Product product = productRepository.findById(productA.getId()).orElseThrow();
        assertThat(product.getStockReserved()).isEqualByComparingTo("3.00");

        // Manually artificially age the reservation to expired
        StockReservation reservation = stockReservationRepository.findAll().get(0);
        reservation.setExpiresAt(Instant.now().minus(10, ChronoUnit.MINUTES));
        stockReservationRepository.save(reservation);

        // Run expiry service
        int releasedCount = reservationExpiryService.releaseExpiredReservations();
        assertThat(releasedCount).isEqualTo(1);

        // Verify stock reserved returned to 0
        Product productAfterExpiry = productRepository.findById(productA.getId()).orElseThrow();
        assertThat(productAfterExpiry.getStockReserved()).isEqualByComparingTo("0.00");
        assertThat(productAfterExpiry.getStockOnHand()).isEqualByComparingTo("20.00");

        // Order should be automatically CANCELLED
        Order order = orderRepository.findAll().get(0);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    @DisplayName("Cross-tenant security: Buyer B cannot access Buyer A's order, and Enterprise B cannot access Enterprise A's order")
    void testCrossTenantSecurity() throws Exception {
        CheckoutRequest request = new CheckoutRequest(
                "IDEMP-SEC-" + UUID.randomUUID(),
                List.of(new CheckoutItemRequest(productA.getId(), new BigDecimal("1.00"))),
                "Jinka",
                "+251911900003",
                null,
                null,
                null
        );

        mockMvc.perform(post("/api/v1/checkout")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        Order savedOrder = orderRepository.findAll().get(0);
        UUID orderId = savedOrder.getId();

        // 1. Buyer B tries to access Buyer A's order -> 404 (Not found or access denied)
        mockMvc.perform(get("/api/v1/orders/" + orderId)
                        .header("Authorization", "Bearer " + buyerBToken))
                .andExpect(status().isNotFound());

        // 2. Enterprise B tries to access Enterprise A's orders -> 403 Forbidden
        mockMvc.perform(get("/api/v1/enterprises/" + enterpriseA.getId() + "/orders")
                        .header("Authorization", "Bearer " + enterpriseBOwnerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Concurrency test: 10 threads concurrently attempting to buy the last single unit; exactly 1 succeeds")
    void testConcurrentCheckoutForLastUnit() throws Exception {
        // Set product stockOnHand = 1.00
        productA.setStockOnHand(new BigDecimal("1.00"));
        productA.setStockReserved(BigDecimal.ZERO);
        productRepository.save(productA);

        int threads = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threads);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch endLatch = new CountDownLatch(threads);
        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failureCount = new AtomicInteger(0);

        for (int i = 0; i < threads; i++) {
            final int index = i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    CheckoutRequest request = new CheckoutRequest(
                            "IDEMP-CONCUR-" + index + "-" + UUID.randomUUID(),
                            List.of(new CheckoutItemRequest(productA.getId(), new BigDecimal("1.00"))),
                            "Jinka",
                            "+251911900003",
                            null,
                            null,
                            null
                    );
                    var result = mockMvc.perform(post("/api/v1/checkout")
                                    .header("Authorization", "Bearer " + buyerAToken)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(objectMapper.writeValueAsString(request)))
                            .andReturn();

                    if (result.getResponse().getStatus() == 201) {
                        successCount.incrementAndGet();
                    } else {
                        failureCount.incrementAndGet();
                    }
                } catch (Exception e) {
                    failureCount.incrementAndGet();
                } finally {
                    endLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        endLatch.await();
        executor.shutdown();

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failureCount.get()).isEqualTo(9);

        Product finalProduct = productRepository.findById(productA.getId()).orElseThrow();
        assertThat(finalProduct.getStockOnHand()).isEqualByComparingTo("1.00");
        assertThat(finalProduct.getStockReserved()).isEqualByComparingTo("1.00");
    }
}
