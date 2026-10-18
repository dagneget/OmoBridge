package com.omobridge.reviews;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.ai.api.dto.GenerateReportRequest;
import com.omobridge.ai.domain.AiReport;
import com.omobridge.ai.domain.AiReportRepository;
import com.omobridge.ai.domain.AiReportStatus;
import com.omobridge.common.security.JwtService;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.EnterpriseStatus;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.identity.domain.Role;
import com.omobridge.identity.domain.RoleRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.identity.domain.VerificationStatus;
import com.omobridge.orders.domain.CheckoutGroup;
import com.omobridge.orders.domain.CheckoutGroupRepository;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderItem;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.orders.domain.OrderStatus;
import com.omobridge.products.domain.Product;
import com.omobridge.products.domain.ProductPriceBreakdown;
import com.omobridge.products.domain.ProductPriceBreakdownRepository;
import com.omobridge.products.domain.ProductRepository;
import com.omobridge.reviews.api.dto.CreateReviewRequest;
import com.omobridge.reviews.domain.Review;
import com.omobridge.reviews.domain.ReviewRepository;
import com.omobridge.reviews.domain.ReviewTargetType;
import com.omobridge.supply.domain.DeliveryStatus;
import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.PayableStatus;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
import com.omobridge.supply.domain.SupplyDelivery;
import com.omobridge.supply.domain.SupplyDeliveryItem;
import com.omobridge.supply.domain.SupplyDeliveryItemRepository;
import com.omobridge.supply.domain.SupplyDeliveryRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
public class ReviewsAndAiIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("omobridge_test")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.flyway.url", postgres::getJdbcUrl);
        registry.add("spring.flyway.user", postgres::getUsername);
        registry.add("spring.flyway.password", postgres::getPassword);
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtService jwtService;

    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private EnterpriseRepository enterpriseRepository;
    @Autowired private FarmerRepository farmerRepository;
    @Autowired private ProductTypeRepository productTypeRepository;
    @Autowired private ProductRepository productRepository;
    @Autowired private ProductPriceBreakdownRepository priceBreakdownRepository;
    @Autowired private SupplyDeliveryRepository supplyDeliveryRepository;
    @Autowired private SupplyDeliveryItemRepository supplyDeliveryItemRepository;
    @Autowired private FarmerPayableRepository farmerPayableRepository;
    @Autowired private CheckoutGroupRepository checkoutGroupRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ReviewRepository reviewRepository;
    @Autowired private AiReportRepository aiReportRepository;
    @Autowired private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private User enterpriseOwner;
    private User otherEnterpriseOwner;
    private User buyerA;
    private User buyerB;
    private Enterprise enterprise;
    private Enterprise otherEnterprise;
    private Farmer farmer;
    private Product product;
    private Order deliveredOrder;
    private Order paidOrder;

    private String enterpriseToken;
    private String otherEnterpriseToken;
    private String buyerAToken;
    private String buyerBToken;

    @BeforeEach
    void setupData() {
        jdbcTemplate.execute("DELETE FROM delivery_job_orders; DELETE FROM delivery_status_history; DELETE FROM delivery_locations; DELETE FROM delivery_jobs;");
        aiReportRepository.deleteAll();
        reviewRepository.deleteAll();
        orderRepository.deleteAll();
        checkoutGroupRepository.deleteAll();
        priceBreakdownRepository.deleteAll();
        productRepository.deleteAll();
        farmerPayableRepository.deleteAll();
        supplyDeliveryItemRepository.deleteAll();
        supplyDeliveryRepository.deleteAll();
        productTypeRepository.deleteAll();
        farmerRepository.deleteAll();
        enterpriseRepository.deleteAll();
        userRepository.deleteAll();

        Role buyerRole = roleRepository.findByName("ROLE_BUYER_VISITOR")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_BUYER_VISITOR", "Buyer")));
        Role enterpriseRole = roleRepository.findByName("ROLE_MICRO_ENTERPRISE")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_MICRO_ENTERPRISE", "Enterprise")));

        enterpriseOwner = createTestUser("+251911920001", "Union Manager", enterpriseRole);
        otherEnterpriseOwner = createTestUser("+251911920002", "Other Union Manager", enterpriseRole);
        buyerA = createTestUser("+251911920003", "John Tourist", buyerRole);
        buyerB = createTestUser("+251911920004", "Alice Visitor", buyerRole);

        enterpriseToken = jwtService.generateToken(enterpriseOwner.getId(), enterpriseOwner.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));
        otherEnterpriseToken = jwtService.generateToken(otherEnterpriseOwner.getId(), otherEnterpriseOwner.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));
        buyerAToken = jwtService.generateToken(buyerA.getId(), buyerA.getPhoneNumber(), Set.of("ROLE_BUYER_VISITOR"));
        buyerBToken = jwtService.generateToken(buyerB.getId(), buyerB.getPhoneNumber(), Set.of("ROLE_BUYER_VISITOR"));

        enterprise = new Enterprise();
        enterprise.setOwnerUser(enterpriseOwner);
        enterprise.setName("South Omo Honey Producers");
        enterprise.setRegistrationNumber("ENT-SO-REV-01");
        enterprise.setContactPhone("+251911920001");
        enterprise.setLocationWoreda("Turmi");
        enterprise.setLocationTown("Dimeka");
        enterprise.setStatus(EnterpriseStatus.ACTIVE);
        enterprise = enterpriseRepository.save(enterprise);

        otherEnterprise = new Enterprise();
        otherEnterprise.setOwnerUser(otherEnterpriseOwner);
        otherEnterprise.setName("Banna Weavers Cooperative");
        otherEnterprise.setRegistrationNumber("ENT-SO-REV-02");
        otherEnterprise.setContactPhone("+251911920002");
        otherEnterprise.setLocationWoreda("Key Afer");
        otherEnterprise.setLocationTown("Key Afer");
        otherEnterprise.setStatus(EnterpriseStatus.ACTIVE);
        otherEnterprise = enterpriseRepository.save(otherEnterprise);

        farmer = new Farmer();
        farmer.setUser(enterpriseOwner);
        farmer.setEnterprise(enterprise);
        farmer.setFarmerCode("FARM-REV-101");
        farmer.setVillage("Turmi Outskirts");
        farmer.setVerificationStatus(VerificationStatus.VERIFIED);
        farmer = farmerRepository.save(farmer);

        ProductType honeyType = new ProductType();
        honeyType.setCode("HONEY-PURE");
        honeyType.setName("Pure Forest Honey");
        honeyType.setCategory("FOOD");
        honeyType.setUnit("kg");
        honeyType = productTypeRepository.save(honeyType);

        // Supply delivery and payable
        SupplyDelivery delivery = new SupplyDelivery();
        delivery.setDeliveryNo("SUP-REV-1001");
        delivery.setEnterprise(enterprise);
        delivery.setFarmer(farmer);
        delivery.setReceivedByUser(enterpriseOwner);
        delivery.setStatus(DeliveryStatus.RECORDED);
        delivery.setDeliveredAt(Instant.now());
        delivery = supplyDeliveryRepository.save(delivery);

        SupplyDeliveryItem item = new SupplyDeliveryItem();
        item.setDelivery(delivery);
        item.setProductType(honeyType);
        item.setGrade("GRADE_1");
        item.setDeliveredQty(new BigDecimal("50.00"));
        item.setAcceptedQty(new BigDecimal("50.00"));
        item.setUnitPriceSnapshot(new BigDecimal("300.00"));
        item.setLineTotal(new BigDecimal("15000.00"));
        item = supplyDeliveryItemRepository.save(item);

        FarmerPayable payable = new FarmerPayable();
        payable.setPayableNo("PAY-REV-1001");
        payable.setFarmer(farmer);
        payable.setEnterprise(enterprise);
        payable.setDeliveryItem(item);
        payable.setAmountDue(new BigDecimal("15000.00"));
        payable.setAmountAllocated(new BigDecimal("10000.00")); // 10,000 disbursed, 5,000 pending
        payable.setStatus(PayableStatus.PARTIAL);
        farmerPayableRepository.save(payable);

        product = new Product();
        product.setEnterprise(enterprise);
        product.setSku("PRD-HONEY-01");
        product.setName("Wild Forest Honey 500g");
        product.setDescription("Organic raw honey harvested from Mursi forests.");
        product.setCategory("Food");
        product.setUnit("jar");
        product.setPackSize(new BigDecimal("0.50"));
        product.setUnitPrice(new BigDecimal("400.00"));
        product.setCurrency("ETB");
        product.setStockOnHand(new BigDecimal("100.00"));
        product.setStockReserved(BigDecimal.ZERO);
        product.setPublished(true);
        product = productRepository.save(product);

        ProductPriceBreakdown breakdown = new ProductPriceBreakdown();
        breakdown.setProduct(product);
        breakdown.setPurchaseCost(new BigDecimal("150.00"));
        breakdown.setProcessingCost(new BigDecimal("50.00"));
        breakdown.setPackagingCost(new BigDecimal("30.00"));
        breakdown.setLaborCost(new BigDecimal("20.00"));
        breakdown.setTransportCost(new BigDecimal("20.00"));
        breakdown.setEnterpriseMargin(new BigDecimal("60.00"));
        breakdown.setCommunityFund(new BigDecimal("10.00"));
        breakdown.setTaxAmount(new BigDecimal("40.00"));
        breakdown.setPlatformFee(new BigDecimal("20.00"));
        breakdown.setTotalPrice(new BigDecimal("400.00"));
        priceBreakdownRepository.save(breakdown);

        CheckoutGroup group = new CheckoutGroup();
        group.setGroupNo("GRP-REV-1001");
        group.setBuyer(buyerA);
        group.setCurrency("ETB");
        group.setTotalAmount(new BigDecimal("900.00"));
        group = checkoutGroupRepository.save(group);

        deliveredOrder = new Order();
        deliveredOrder.setOrderNo("ORD-REV-DELIVERED");
        deliveredOrder.setCheckoutGroup(group);
        deliveredOrder.setEnterprise(enterprise);
        deliveredOrder.setBuyer(buyerA);
        deliveredOrder.setStatus(OrderStatus.DELIVERED);
        deliveredOrder.setSubtotal(new BigDecimal("800.00"));
        deliveredOrder.setTax(new BigDecimal("80.00"));
        deliveredOrder.setPlatformFee(new BigDecimal("40.00"));
        deliveredOrder.setDeliveryFee(new BigDecimal("100.00"));
        deliveredOrder.setTotalAmount(new BigDecimal("1020.00"));
        deliveredOrder.setDeliveryAddress("Turmi Lodge");
        deliveredOrder.setDeliveryPhone(buyerA.getPhoneNumber());
        var purchasedItem = new OrderItem();
        purchasedItem.setOrder(deliveredOrder);
        purchasedItem.setProduct(product);
        purchasedItem.setProductNameSnapshot(product.getName());
        purchasedItem.setProductSkuSnapshot(product.getSku());
        purchasedItem.setUnitPriceSnapshot(new BigDecimal("400.00"));
        purchasedItem.setQuantity(new BigDecimal("2.00"));
        purchasedItem.setLineTotal(new BigDecimal("800.00"));
        deliveredOrder.getItems().add(purchasedItem);
        deliveredOrder = orderRepository.save(deliveredOrder);

        paidOrder = new Order();
        paidOrder.setOrderNo("ORD-REV-PAID");
        paidOrder.setCheckoutGroup(group);
        paidOrder.setEnterprise(enterprise);
        paidOrder.setBuyer(buyerB);
        paidOrder.setStatus(OrderStatus.PAID); // Not delivered yet!
        paidOrder.setSubtotal(new BigDecimal("400.00"));
        paidOrder.setTax(BigDecimal.ZERO);
        paidOrder.setPlatformFee(BigDecimal.ZERO);
        paidOrder.setDeliveryFee(new BigDecimal("50.00"));
        paidOrder.setTotalAmount(new BigDecimal("450.00"));
        paidOrder.setDeliveryAddress("Jinka Resort");
        paidOrder.setDeliveryPhone(buyerB.getPhoneNumber());
        paidOrder = orderRepository.save(paidOrder);
    }

    private User createTestUser(String phone, String name, Role role) {
        User user = new User();
        user.setPhoneNumber(phone);
        user.setPasswordHash(passwordEncoder.encode("Secret@123"));
        user.setFullName(name);
        user.setStatus(UserStatus.ACTIVE);
        user.addRole(role);
        return userRepository.save(user);
    }

    @Test
    void shouldRejectUnpurchasedProductWhenOrderIsDelivered() throws Exception {
        var request = new CreateReviewRequest(ReviewTargetType.PRODUCT, UUID.randomUUID(),
                deliveredOrder.getId(), null, 5, "Unrelated product");
        mockMvc.perform(post("/api/v1/reviews")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message", containsString("not part of")));
        assertThat(reviewRepository.count()).isZero();
    }

    @Test
    void shouldRejectAmbiguousProofWhenBothReferencesProvided() throws Exception {
        var request = new CreateReviewRequest(ReviewTargetType.PRODUCT, product.getId(),
                deliveredOrder.getId(), UUID.randomUUID(), 5, "Ambiguous proof");
        mockMvc.perform(post("/api/v1/reviews")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message", containsString("exactly one")));
        assertThat(reviewRepository.count()).isZero();
    }

    @Test
    @DisplayName("Review rules: only delivered orders, duplicate prevention, cross-buyer security, and public testimonials")
    void testReviewsWorkflowAndSecurity() throws Exception {
        // 1. Buyer B tries to review an undelivered order (PAID) -> 422 Unprocessable Entity
        CreateReviewRequest undeliveredReq = new CreateReviewRequest(
                ReviewTargetType.PRODUCT, product.getId(), paidOrder.getId(), null, 5, "Great honey!"
        );
        mockMvc.perform(post("/api/v1/reviews")
                        .header("Authorization", "Bearer " + buyerBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(undeliveredReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message", containsString("Cannot review product before order is DELIVERED")));

        // 2. Buyer B tries to review Buyer A's delivered order -> 403 Forbidden
        CreateReviewRequest crossBuyerReq = new CreateReviewRequest(
                ReviewTargetType.PRODUCT, product.getId(), deliveredOrder.getId(), null, 4, "Trying to review someone else's order"
        );
        mockMvc.perform(post("/api/v1/reviews")
                        .header("Authorization", "Bearer " + buyerBToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(crossBuyerReq)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code", is("ACCESS_DENIED")));

        // 3. Legitimate review by Buyer A for delivered order -> 201 Created
        CreateReviewRequest validReq = new CreateReviewRequest(
                ReviewTargetType.PRODUCT, product.getId(), deliveredOrder.getId(), null, 5, "Exquisite organic forest honey!"
        );
        mockMvc.perform(post("/api/v1/reviews")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.rating", is(5)))
                .andExpect(jsonPath("$.data.reviewerName", is("John Tourist")));

        // 4. Duplicate review attempt by Buyer A for the same product -> 409 Conflict
        mockMvc.perform(post("/api/v1/reviews")
                        .header("Authorization", "Bearer " + buyerAToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("Review already submitted")));

        // 5. Public target reviews endpoint calculates correct average and total
        mockMvc.perform(get("/api/v1/reviews/public/target")
                        .param("targetType", "PRODUCT")
                        .param("targetId", product.getId().toString()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.averageRating", is(5.0)))
                .andExpect(jsonPath("$.data.totalReviews", is(1)))
                .andExpect(jsonPath("$.data.reviews", hasSize(1)));

        // 6. Public testimonials endpoint
        mockMvc.perform(get("/api/v1/reviews/public/testimonials"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data", hasSize(1)))
                .andExpect(jsonPath("$.data[0].comment", containsString("Exquisite organic forest honey!")));
    }

    @Test
    @DisplayName("AI narrative generation, cross-enterprise isolation, and human approval gate")
    void testAiNarrativeReportsAndApprovalWorkflow() throws Exception {
        GenerateReportRequest genReq = new GenerateReportRequest("WEEKLY_SUMMARY", "2026-W42", "en");

        // 1. Cross-enterprise security: otherEnterpriseOwner cannot generate reports for enterprise -> 403 Forbidden
        mockMvc.perform(post("/api/v1/enterprises/" + enterprise.getId() + "/ai/reports")
                        .header("Authorization", "Bearer " + otherEnterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(genReq)))
                .andExpect(status().isForbidden());

        // 2. Legitimate owner generates AI narrative report -> 201 Created
        mockMvc.perform(post("/api/v1/enterprises/" + enterprise.getId() + "/ai/reports")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(genReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status", is("GENERATED")))
                .andExpect(jsonPath("$.data.content", containsString("OmoBridge Enterprise Weekly Executive Summary")))
                .andExpect(jsonPath("$.data.dataSnapshot.uniqueActiveFarmers", is(1)))
                .andExpect(jsonPath("$.data.dataSnapshot.totalFarmerPaidEtb", is(10000.00)));

        List<AiReport> reports = aiReportRepository.findAll();
        assertThat(reports).hasSize(1);
        AiReport report = reports.get(0);
        assertThat(report.getStatus()).isEqualTo(AiReportStatus.GENERATED);

        // 3. Human Approval Workflow: Owner approves the generated report -> 200 OK, status APPROVED
        mockMvc.perform(patch("/api/v1/enterprises/" + enterprise.getId() + "/ai/reports/" + report.getId() + "/approval")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .param("approve", "true"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status", is("APPROVED")));

        AiReport approvedReport = aiReportRepository.findById(report.getId()).orElseThrow();
        assertThat(approvedReport.getStatus()).isEqualTo(AiReportStatus.APPROVED);
        assertThat(approvedReport.getApprovedByUser().getId()).isEqualTo(enterpriseOwner.getId());
    }

    @Test
    @DisplayName("Impact analytics and farmer balances endpoints calculate accurate figures from operational records")
    void testImpactMetricsAndFarmerBalances() throws Exception {
        // 1. Query impact metrics
        mockMvc.perform(get("/api/v1/enterprises/" + enterprise.getId() + "/reports/impact-metrics")
                        .header("Authorization", "Bearer " + enterpriseToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.activeFarmersCount", is(1)))
                .andExpect(jsonPath("$.data.totalFarmerDisbursedEtb", is(10000.00)))
                .andExpect(jsonPath("$.data.totalSupplyQuantity", is(50.00)))
                .andExpect(jsonPath("$.data.totalOrdersCount", is(2)))
                .andExpect(jsonPath("$.data.averageHouseholdIncomeIncrementEtb", is(10000.00)));

        // 2. Query farmer balances
        mockMvc.perform(get("/api/v1/enterprises/" + enterprise.getId() + "/reports/farmer-balances")
                        .header("Authorization", "Bearer " + enterpriseToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalRegisteredFarmers", is(1)))
                .andExpect(jsonPath("$.data.farmersWithPendingBalance", is(1)))
                .andExpect(jsonPath("$.data.totalPendingPayablesEtb", is(5000.00)))
                .andExpect(jsonPath("$.data.totalDisbursedPayablesEtb", is(10000.00)));
    }
}
