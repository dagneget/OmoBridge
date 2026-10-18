package com.omobridge.delivery;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.common.BaseIntegrationTest;
import com.omobridge.common.security.JwtService;
import com.omobridge.common.security.RoleName;
import com.omobridge.delivery.api.dto.BatchLocationIngestionRequest;
import com.omobridge.delivery.api.dto.CreateDeliveryJobRequest;
import com.omobridge.delivery.api.dto.LocationIngestionRequest;
import com.omobridge.delivery.api.dto.UpdateDeliveryJobStatusRequest;
import com.omobridge.delivery.domain.DeliveryJob;
import com.omobridge.delivery.domain.DeliveryJobOrder;
import com.omobridge.delivery.domain.DeliveryJobOrderRepository;
import com.omobridge.delivery.domain.DeliveryJobRepository;
import com.omobridge.delivery.domain.DeliveryLocationRepository;
import com.omobridge.delivery.domain.DeliveryStatus;
import com.omobridge.delivery.domain.DeliveryStatusHistoryRepository;
import com.omobridge.identity.domain.DeliveryProvider;
import com.omobridge.identity.domain.DeliveryProviderRepository;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.Role;
import com.omobridge.identity.domain.RoleRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.identity.domain.VehicleType;
import com.omobridge.identity.domain.VerificationStatus;
import com.omobridge.orders.api.dto.CheckoutItemRequest;
import com.omobridge.orders.api.dto.CheckoutRequest;
import com.omobridge.orders.api.dto.CheckoutResponse;
import com.omobridge.orders.domain.CheckoutGroupRepository;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.orders.domain.OrderStatus;
import com.omobridge.orders.domain.StockReservationRepository;
import com.omobridge.orders.service.CheckoutService;
import com.omobridge.orders.service.OrderService;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
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
class DeliveryAndTrackingIntegrationTest extends BaseIntegrationTest {

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
    private DeliveryProviderRepository deliveryProviderRepository;

    @Autowired
    private DeliveryJobRepository deliveryJobRepository;

    @Autowired
    private DeliveryJobOrderRepository deliveryJobOrderRepository;

    @Autowired
    private DeliveryLocationRepository deliveryLocationRepository;

    @Autowired
    private DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;

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
    private CheckoutService checkoutService;

    @Autowired
    private OrderService orderService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtService jwtService;

    private User buyer;
    private User providerUserA;
    private User providerUserB;
    private DeliveryProvider approvedProviderA;
    private DeliveryProvider pendingProviderB;
    private Enterprise enterprise;
    private Product product;
    private Order paidOrder1;
    private Order paidOrder2;
    private Order unpaidOrder;

    private String buyerToken;
    private String providerAToken;
    private String providerBToken;

    @BeforeEach
    void setUp() {
        deliveryLocationRepository.deleteAll();
        deliveryStatusHistoryRepository.deleteAll();
        deliveryJobOrderRepository.deleteAll();
        deliveryJobRepository.deleteAll();
        deliveryProviderRepository.deleteAll();
        stockReservationRepository.deleteAll();
        orderRepository.deleteAll();
        checkoutGroupRepository.deleteAll();
        priceBreakdownRepository.deleteAll();
        productRepository.deleteAll();

        Role buyerRole = roleRepository.findByName(RoleName.BUYER_VISITOR.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.BUYER_VISITOR.name(), "Buyer")));
        Role providerRole = roleRepository.findByName(RoleName.DELIVERY_PROVIDER.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.DELIVERY_PROVIDER.name(), "Delivery Provider")));
        Role enterpriseRole = roleRepository.findByName(RoleName.MICRO_ENTERPRISE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.MICRO_ENTERPRISE.name(), "Enterprise")));

        User enterpriseOwner = createTestUser("+251911920001", "Enterprise Owner Del", enterpriseRole);
        buyer = createTestUser("+251911920002", "Buyer Del", buyerRole);
        providerUserA = createTestUser("+251911920003", "Provider User A", providerRole);
        providerUserB = createTestUser("+251911920004", "Provider User B", providerRole);

        enterprise = new Enterprise();
        enterprise.setName("Omo Transport Union");
        enterprise.setRegistrationNumber("REG-DEL-" + UUID.randomUUID().toString().substring(0, 6));
        enterprise.setOwnerUser(enterpriseOwner);
        enterprise.setLocationWoreda("Turmi");
        enterprise.setLocationTown("Dimeka");
        enterprise.setContactPhone(enterpriseOwner.getPhoneNumber());
        enterprise.setStatus(com.omobridge.identity.domain.EnterpriseStatus.ACTIVE);
        enterprise = enterpriseRepository.save(enterprise);

        approvedProviderA = new DeliveryProvider();
        approvedProviderA.setUser(providerUserA);
        approvedProviderA.setVehicleType(VehicleType.MOTORCYCLE);
        approvedProviderA.setVehiclePlateNumber("ET-3-12345");
        approvedProviderA.setLicenseNumber("LIC-A-001");
        approvedProviderA.setServiceArea("South Omo Zone");
        approvedProviderA.setAvailable(true);
        approvedProviderA.setVerificationStatus(VerificationStatus.VERIFIED);
        approvedProviderA = deliveryProviderRepository.save(approvedProviderA);

        pendingProviderB = new DeliveryProvider();
        pendingProviderB.setUser(providerUserB);
        pendingProviderB.setVehicleType(VehicleType.VAN);
        pendingProviderB.setVehiclePlateNumber("ET-3-67890");
        pendingProviderB.setLicenseNumber("LIC-B-002");
        pendingProviderB.setServiceArea("Jinka City");
        pendingProviderB.setAvailable(true);
        pendingProviderB.setVerificationStatus(VerificationStatus.PENDING); // UNAPPROVED
        pendingProviderB = deliveryProviderRepository.save(pendingProviderB);

        buyerToken = jwtService.generateToken(buyer.getId(), buyer.getPhoneNumber(), Set.of("ROLE_BUYER_VISITOR"));
        providerAToken = jwtService.generateToken(providerUserA.getId(), providerUserA.getPhoneNumber(), Set.of("ROLE_DELIVERY_PROVIDER"));
        providerBToken = jwtService.generateToken(providerUserB.getId(), providerUserB.getPhoneNumber(), Set.of("ROLE_DELIVERY_PROVIDER"));

        product = new Product();
        product.setEnterprise(enterprise);
        product.setSku("DEL-PRD-01");
        product.setName("Delivery Test Honey");
        product.setDescription("Honey for delivery test");
        product.setCategory("Food");
        product.setUnit("jar");
        product.setPackSize(new BigDecimal("1.00"));
        product.setUnitPrice(new BigDecimal("200.00"));
        product.setCurrency("ETB");
        product.setStockOnHand(new BigDecimal("50.00"));
        product.setStockReserved(BigDecimal.ZERO);
        product.setPublished(true);
        product = productRepository.save(product);

        ProductPriceBreakdown breakdown = new ProductPriceBreakdown();
        breakdown.setProduct(product);
        breakdown.setPurchaseCost(new BigDecimal("100.00"));
        breakdown.setProcessingCost(new BigDecimal("20.00"));
        breakdown.setPackagingCost(new BigDecimal("10.00"));
        breakdown.setLaborCost(new BigDecimal("20.00"));
        breakdown.setTransportCost(new BigDecimal("10.00"));
        breakdown.setEnterpriseMargin(new BigDecimal("20.00"));
        breakdown.setCommunityFund(new BigDecimal("4.00"));
        breakdown.setTaxAmount(new BigDecimal("10.00"));
        breakdown.setPlatformFee(new BigDecimal("6.00"));
        breakdown.setTotalPrice(new BigDecimal("200.00"));
        priceBreakdownRepository.save(breakdown);
        product.setPriceBreakdown(breakdown);

        // Checkout 3 orders
        CheckoutResponse checkoutResp1 = checkoutService.checkout(
                new CheckoutRequest("IDEMP-DEL-1-" + UUID.randomUUID(), List.of(new CheckoutItemRequest(product.getId(), new BigDecimal("1.00"))), "Jinka Center", buyer.getPhoneNumber(), 5.78, 36.56, null), buyer);
        paidOrder1 = orderRepository.findById(checkoutResp1.orders().get(0).orderId()).orElseThrow();
        orderService.updateOrderStatus(paidOrder1.getId(), OrderStatus.PAID, "Prepaid", null);
        paidOrder1 = orderRepository.findById(paidOrder1.getId()).orElseThrow();

        CheckoutResponse checkoutResp2 = checkoutService.checkout(
                new CheckoutRequest("IDEMP-DEL-2-" + UUID.randomUUID(), List.of(new CheckoutItemRequest(product.getId(), new BigDecimal("1.00"))), "Turmi Road", buyer.getPhoneNumber(), 5.80, 36.58, null), buyer);
        paidOrder2 = orderRepository.findById(checkoutResp2.orders().get(0).orderId()).orElseThrow();
        orderService.updateOrderStatus(paidOrder2.getId(), OrderStatus.PAID, "Prepaid", null);
        paidOrder2 = orderRepository.findById(paidOrder2.getId()).orElseThrow();

        CheckoutResponse checkoutResp3 = checkoutService.checkout(
                new CheckoutRequest("IDEMP-DEL-3-" + UUID.randomUUID(), List.of(new CheckoutItemRequest(product.getId(), new BigDecimal("1.00"))), "Hana Village", buyer.getPhoneNumber(), null, null, null), buyer);
        unpaidOrder = orderRepository.findById(checkoutResp3.orders().get(0).orderId()).orElseThrow();
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
    @DisplayName("Create delivery job: rejects unpaid orders and unapproved providers; verifies exact shared fee split")
    void testCreateAndAssignJobRules() throws Exception {
        // 1. Unpaid order must be rejected
        CreateDeliveryJobRequest unpaidReq = new CreateDeliveryJobRequest(
                List.of(unpaidOrder.getId()),
                approvedProviderA.getId(),
                "Jinka Depot",
                5.78, 36.56,
                "Customer Home",
                5.79, 36.57,
                new BigDecimal("150.00")
        );
        mockMvc.perform(post("/api/v1/delivery/jobs")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unpaidReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));

        // 2. Unapproved provider must be rejected
        CreateDeliveryJobRequest unapprovedProvReq = new CreateDeliveryJobRequest(
                List.of(paidOrder1.getId()),
                pendingProviderB.getId(), // PENDING verification status!
                "Jinka Depot",
                5.78, 36.56,
                "Customer Home",
                5.79, 36.57,
                new BigDecimal("150.00")
        );
        mockMvc.perform(post("/api/v1/delivery/jobs")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unapprovedProvReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));

        // 3. Shared logistics: consolidate 2 paid orders into 1 job with 150.00 total fee
        CreateDeliveryJobRequest validReq = new CreateDeliveryJobRequest(
                List.of(paidOrder1.getId(), paidOrder2.getId()),
                approvedProviderA.getId(),
                "Jinka Central Warehouse",
                5.78, 36.56,
                "Multiple Drop-offs",
                5.80, 36.58,
                new BigDecimal("150.00")
        );
        mockMvc.perform(post("/api/v1/delivery/jobs")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("ASSIGNED")))
                .andExpect(jsonPath("$.data.orderIds", hasSize(2)));

        // Verify shared fee split: sum of allocated fees must equal exactly 150.00!
        DeliveryJob job = deliveryJobRepository.findAll().get(0);
        List<DeliveryJobOrder> jobOrders = deliveryJobOrderRepository.findByJobId(job.getId());
        assertThat(jobOrders).hasSize(2);

        BigDecimal sumAllocated = jobOrders.stream()
                .map(DeliveryJobOrder::getAllocatedFee)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        assertThat(sumAllocated).isEqualByComparingTo("150.00");
    }

    @Test
    @DisplayName("Provider job APIs and order cascading: status transitions follow job and unauthorized access is denied")
    void testProviderJobLifecycleAndSecurity() throws Exception {
        // Create job for paidOrder1
        CreateDeliveryJobRequest validReq = new CreateDeliveryJobRequest(
                List.of(paidOrder1.getId()),
                approvedProviderA.getId(),
                "Depot", 5.78, 36.56, "Home", 5.80, 36.58, new BigDecimal("100.00")
        );
        mockMvc.perform(post("/api/v1/delivery/jobs")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated());

        DeliveryJob job = deliveryJobRepository.findAll().get(0);
        UUID jobId = job.getId();

        // 1. Cross-provider security: Provider B cannot view Provider A's jobs -> 403 Forbidden
        mockMvc.perform(get("/api/v1/delivery/providers/" + approvedProviderA.getId() + "/jobs")
                        .header("Authorization", "Bearer " + providerBToken))
                .andExpect(status().isForbidden());

        // 2. Provider A views own jobs -> 200 OK
        mockMvc.perform(get("/api/v1/delivery/providers/" + approvedProviderA.getId() + "/jobs")
                        .header("Authorization", "Bearer " + providerAToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)));

        // 3. Provider A updates job status: ASSIGNED -> PICKED_UP (order moves to IN_TRANSIT)
        mockMvc.perform(patch("/api/v1/delivery/jobs/" + jobId + "/status")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateDeliveryJobStatusRequest(DeliveryStatus.PICKED_UP, "Package collected"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("PICKED_UP")));

        Order orderAfterPickup = orderRepository.findById(paidOrder1.getId()).orElseThrow();
        assertThat(orderAfterPickup.getStatus()).isEqualTo(OrderStatus.IN_TRANSIT);

        // 4. Update status: PICKED_UP -> IN_TRANSIT -> DELIVERED (order moves to DELIVERED)
        mockMvc.perform(patch("/api/v1/delivery/jobs/" + jobId + "/status")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateDeliveryJobStatusRequest(DeliveryStatus.IN_TRANSIT, "On the road"))))
                .andExpect(status().isOk());

        mockMvc.perform(patch("/api/v1/delivery/jobs/" + jobId + "/status")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateDeliveryJobStatusRequest(DeliveryStatus.DELIVERED, "Delivered to buyer"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("DELIVERED")));

        Order orderAfterDelivery = orderRepository.findById(paidOrder1.getId()).orElseThrow();
        assertThat(orderAfterDelivery.getStatus()).isEqualTo(OrderStatus.DELIVERED);

        // 5. Invalid transition: DELIVERED -> CANCELLED must fail
        mockMvc.perform(patch("/api/v1/delivery/jobs/" + jobId + "/status")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UpdateDeliveryJobStatusRequest(DeliveryStatus.CANCELLED, "Too late"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code", is("BUSINESS_RULE_VIOLATION")));
    }

    @Test
    @DisplayName("Location telemetry ingestion (offline replay order) and public live tracking token")
    void testLocationIngestionAndTracking() throws Exception {
        CreateDeliveryJobRequest validReq = new CreateDeliveryJobRequest(
                List.of(paidOrder1.getId()),
                approvedProviderA.getId(),
                "Depot", 5.78, 36.56, "Home", 5.80, 36.58, new BigDecimal("100.00")
        );
        mockMvc.perform(post("/api/v1/delivery/jobs")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated());

        DeliveryJob job = deliveryJobRepository.findAll().get(0);
        UUID jobId = job.getId();
        String trackingToken = job.getTrackingToken();

        // Start job
        orderService.updateOrderStatus(paidOrder1.getId(), OrderStatus.IN_TRANSIT, "In transit", null);
        job.setStatus(DeliveryStatus.IN_TRANSIT);
        deliveryJobRepository.save(job);

        // Ingest batch out-of-order device points (t1, t3, t2)
        Instant now = Instant.now();
        Instant t1 = now.minus(15, ChronoUnit.MINUTES);
        Instant t2 = now.minus(10, ChronoUnit.MINUTES);
        Instant t3 = now.minus(5, ChronoUnit.MINUTES);

        BatchLocationIngestionRequest batchReq = new BatchLocationIngestionRequest(List.of(
                new LocationIngestionRequest(5.781, 36.561, 40.0, t1),
                new LocationIngestionRequest(5.795, 36.575, 55.0, t3), // later point first
                new LocationIngestionRequest(5.788, 36.568, 48.0, t2)  // middle point second
        ));

        mockMvc.perform(post("/api/v1/delivery/jobs/" + jobId + "/locations")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(batchReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", is(3)));

        // Public live tracking endpoint
        mockMvc.perform(get("/api/v1/delivery/track/" + trackingToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.data.status", is("IN_TRANSIT")))
                .andExpect(jsonPath("$.data.currentLatitude", is(5.795)))
                .andExpect(jsonPath("$.data.history", hasSize(3)))
                // Verify chronological order: t1 -> t2 -> t3
                .andExpect(jsonPath("$.data.history[0].latitude", is(5.781)))
                .andExpect(jsonPath("$.data.history[1].latitude", is(5.788)))
                .andExpect(jsonPath("$.data.history[2].latitude", is(5.795)));

        // Mark DELIVERED
        DeliveryJob jobToDeliver = deliveryJobRepository.findById(jobId).orElseThrow();
        jobToDeliver.setStatus(DeliveryStatus.DELIVERED);
        deliveryJobRepository.save(jobToDeliver);

        // Points sent after DELIVERED are ignored
        BatchLocationIngestionRequest lateReq = new BatchLocationIngestionRequest(List.of(
                new LocationIngestionRequest(5.801, 36.581, 10.0, Instant.now())
        ));
        mockMvc.perform(post("/api/v1/delivery/jobs/" + jobId + "/locations")
                        .header("Authorization", "Bearer " + providerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(lateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", is(0))); // 0 stored!
    }
}
