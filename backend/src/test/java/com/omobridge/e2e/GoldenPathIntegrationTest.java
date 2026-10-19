package com.omobridge.e2e;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.ai.api.dto.EnterpriseImpactMetricsResponse;
import com.omobridge.ai.service.ImpactReportingService;
import com.omobridge.common.BaseIntegrationTest;
import com.omobridge.delivery.api.dto.CreateDeliveryJobRequest;
import com.omobridge.delivery.api.dto.DeliveryJobResponse;
import com.omobridge.delivery.domain.DeliveryJob;
import com.omobridge.delivery.domain.DeliveryJobRepository;
import com.omobridge.delivery.domain.DeliveryStatus;
import com.omobridge.delivery.service.DeliveryService;
import com.omobridge.identity.domain.DeliveryProvider;
import com.omobridge.identity.domain.DeliveryProviderRepository;
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
import com.omobridge.identity.domain.VehicleType;
import com.omobridge.identity.domain.VerificationStatus;
import com.omobridge.integrations.sms.InboundSmsRequest;
import com.omobridge.integrations.sms.InboundSmsService;
import com.omobridge.integrations.ussd.UssdRequest;
import com.omobridge.integrations.ussd.UssdResponse;
import com.omobridge.integrations.ussd.UssdService;
import com.omobridge.inventory.domain.InventoryLocation;
import com.omobridge.inventory.domain.InventoryLocationRepository;
import com.omobridge.inventory.domain.InventoryLot;
import com.omobridge.inventory.domain.InventoryLotRepository;
import com.omobridge.orders.api.dto.CheckoutItemRequest;
import com.omobridge.orders.api.dto.CheckoutRequest;
import com.omobridge.orders.api.dto.CheckoutResponse;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.orders.domain.OrderStatus;
import com.omobridge.orders.service.CheckoutService;
import com.omobridge.orders.service.OrderService;
import com.omobridge.payments.api.dto.CreatePaymentAttemptRequest;
import com.omobridge.payments.api.dto.PaymentAttemptResponse;
import com.omobridge.payments.domain.Payment;
import com.omobridge.payments.domain.PaymentRepository;
import com.omobridge.payments.service.PaymentService;
import com.omobridge.products.domain.Product;
import com.omobridge.products.domain.ProductPriceBreakdown;
import com.omobridge.products.domain.ProductPriceBreakdownRepository;
import com.omobridge.products.domain.ProductRepository;
import com.omobridge.reviews.api.dto.CreateReviewRequest;
import com.omobridge.reviews.api.dto.ReviewResponse;
import com.omobridge.reviews.domain.ReviewTargetType;
import com.omobridge.reviews.service.ReviewService;
import com.omobridge.supply.api.dto.FarmerPaymentRequest;
import com.omobridge.supply.api.dto.FarmerPaymentResponse;
import com.omobridge.supply.api.dto.SupplyDeliveryCreateRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryInspectionItemRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryInspectionRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryItemCreateRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryResponse;
import com.omobridge.supply.domain.BuyingPrice;
import com.omobridge.supply.domain.BuyingPriceRepository;
import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.FarmerPaymentStatus;
import com.omobridge.supply.domain.PayableStatus;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
import com.omobridge.supply.service.FarmerPaymentService;
import com.omobridge.supply.service.SupplyDeliveryService;
import com.omobridge.traceability.api.dto.ProductionBatchCreateRequest;
import com.omobridge.traceability.api.dto.ProductionBatchResponse;
import com.omobridge.traceability.api.dto.ProductionInputRequest;
import com.omobridge.traceability.api.dto.ProductionOutputRequest;
import com.omobridge.traceability.api.dto.PublicTraceResponse;
import com.omobridge.traceability.domain.BatchStatus;
import com.omobridge.traceability.service.ProductionBatchService;
import com.omobridge.traceability.service.TraceabilityService;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@AutoConfigureMockMvc
@TestPropertySource(properties = {
        "omobridge.integrations.sms.webhook-secret=golden-path-sms-secret"
})
public class GoldenPathIntegrationTest extends BaseIntegrationTest {

    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private EnterpriseRepository enterpriseRepository;
    @Autowired private FarmerRepository farmerRepository;
    @Autowired private ProductTypeRepository productTypeRepository;
    @Autowired private BuyingPriceRepository buyingPriceRepository;
    @Autowired private InventoryLocationRepository inventoryLocationRepository;
    @Autowired private SupplyDeliveryService supplyDeliveryService;
    @Autowired private FarmerPaymentService farmerPaymentService;
    @Autowired private FarmerPayableRepository farmerPayableRepository;
    @Autowired private InventoryLotRepository inventoryLotRepository;
    @Autowired private ProductionBatchService productionBatchService;
    @Autowired private ProductRepository productRepository;
    @Autowired private ProductPriceBreakdownRepository priceBreakdownRepository;
    @Autowired private CheckoutService checkoutService;
    @Autowired private OrderService orderService;
    @Autowired private OrderRepository orderRepository;
    @Autowired private PaymentService paymentService;
    @Autowired private PaymentRepository paymentRepository;
    @Autowired private DeliveryProviderRepository deliveryProviderRepository;
    @Autowired private DeliveryService deliveryService;
    @Autowired private DeliveryJobRepository deliveryJobRepository;
    @Autowired private InboundSmsService inboundSmsService;
    @Autowired private TraceabilityService traceabilityService;
    @Autowired private ReviewService reviewService;
    @Autowired private ImpactReportingService impactReportingService;
    @Autowired private UssdService ussdService;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private ObjectMapper objectMapper;

    private User enterpriseUser;
    private Enterprise enterprise;
    private User farmerUser;
    private Farmer farmer;
    private ProductType rawSesame;
    private User providerUser;
    private DeliveryProvider deliveryProvider;
    private User buyer;
    private InventoryLocation warehouseLocation;

    @BeforeEach
    void setUp() {
        Role enterpriseRole = roleRepository.findByName("ROLE_MICRO_ENTERPRISE")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_MICRO_ENTERPRISE", "Enterprise")));
        Role farmerRole = roleRepository.findByName("ROLE_PRODUCER_FARMER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_PRODUCER_FARMER", "Farmer")));
        Role providerRole = roleRepository.findByName("ROLE_DELIVERY_PROVIDER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_DELIVERY_PROVIDER", "Delivery Provider")));
        Role buyerRole = roleRepository.findByName("ROLE_BUYER_VISITOR")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_BUYER_VISITOR", "Buyer")));

        enterpriseUser = createUser("+251911920010", "Dimeka Honey & Oil Union", enterpriseRole);
        farmerUser = createUser("+251911920020", "Girma Banna Farmer", farmerRole);
        providerUser = createUser("+251911920030", "Jinka Express Rider", providerRole);
        buyer = createUser("+251911920040", "International Buyer", buyerRole);

        enterprise = enterpriseRepository.findAll().stream()
                .filter(e -> "ENT-DIMEKA-01".equals(e.getRegistrationNumber()))
                .findFirst()
                .orElseGet(() -> {
                    Enterprise ent = new Enterprise();
                    ent.setOwnerUser(enterpriseUser);
                    ent.setName("Dimeka Agro Cooperative");
                    ent.setRegistrationNumber("ENT-DIMEKA-01");
                    ent.setContactPhone(enterpriseUser.getPhoneNumber());
                    ent.setLocationWoreda("Hamer");
                    ent.setLocationTown("Dimeka");
                    ent.setStatus(EnterpriseStatus.ACTIVE);
                    return enterpriseRepository.save(ent);
                });

        farmer = farmerRepository.findByUserPhoneNumber(farmerUser.getPhoneNumber())
                .orElseGet(() -> {
                    Farmer f = new Farmer();
                    f.setUser(farmerUser);
                    f.setEnterprise(enterprise);
                    f.setFarmerCode("FARM-GOLD-01");
                    f.setVillage("Alduba");
                    f.setVerificationStatus(VerificationStatus.VERIFIED);
                    return farmerRepository.save(f);
                });

        rawSesame = productTypeRepository.findByCode("RAW-SESAME")
                .orElseGet(() -> {
                    ProductType pt = new ProductType();
                    pt.setCode("RAW-SESAME");
                    pt.setName("Organic White Sesame");
                    pt.setCategory("OILSEEDS");
                    pt.setUnit("kg");
                    return productTypeRepository.save(pt);
                });

        warehouseLocation = inventoryLocationRepository.findFirstByEnterpriseId(enterprise.getId())
                .orElseGet(() -> {
                    InventoryLocation loc = new InventoryLocation();
                    loc.setEnterprise(enterprise);
                    loc.setName("Dimeka Main Store");
                    loc.setLocationType("WAREHOUSE");
                    loc.setDescription("Main agricultural commodity storage");
                    return inventoryLocationRepository.save(loc);
                });

        // Ensure active buying price configured
        buyingPriceRepository.findFirstActivePrice(enterprise.getId(), rawSesame.getId(), "GRADE_1", Instant.now())
                .orElseGet(() -> {
                    BuyingPrice bp = new BuyingPrice();
                    bp.setEnterprise(enterprise);
                    bp.setProductType(rawSesame);
                    bp.setGrade("GRADE_1");
                    bp.setPricePerUnit(new BigDecimal("120.00"));
                    bp.setEffectiveFrom(Instant.now().minusSeconds(86400));
                    bp.setActive(true);
                    return buyingPriceRepository.save(bp);
                });

        deliveryProvider = deliveryProviderRepository.findByUserId(providerUser.getId())
                .orElseGet(() -> {
                    DeliveryProvider dp = new DeliveryProvider();
                    dp.setUser(providerUser);
                    dp.setVehicleType(VehicleType.TRUCK);
                    dp.setVehiclePlateNumber("ET-3-88123");
                    dp.setServiceArea("South Omo Zone");
                    dp.setVerificationStatus(VerificationStatus.VERIFIED);
                    return deliveryProviderRepository.save(dp);
                });
    }

    private User createUser(String phone, String name, Role role) {
        return userRepository.findByPhoneNumber(phone).orElseGet(() -> {
            User user = new User();
            user.setPhoneNumber(phone);
            user.setFullName(name);
            user.setPasswordHash(passwordEncoder.encode("Secret@123"));
            user.setStatus(UserStatus.ACTIVE);
            user.addRole(role);
            return userRepository.save(user);
        });
    }

    @Test
    @DisplayName("End-to-end golden path: farmer delivery -> inspection -> payment -> lot -> batch -> product -> checkout -> payment -> delivery -> trace -> review -> metrics -> USSD")
    void testEndToEndGoldenPath() {
        // STEP 1: Farmer delivers 100 kg sesame to Enterprise
        SupplyDeliveryCreateRequest deliveryReq = new SupplyDeliveryCreateRequest(
                enterprise.getId(),
                farmer.getId(),
                Instant.now(),
                "Harvest delivery at Dimeka warehouse",
                List.of(new SupplyDeliveryItemCreateRequest(rawSesame.getId(), "GRADE_1", new BigDecimal("100.00")))
        );
        SupplyDeliveryResponse deliveryResp = supplyDeliveryService.recordDelivery(enterprise.getId(), enterpriseUser.getId(), deliveryReq);
        assertThat(deliveryResp.items()).hasSize(1);
        UUID deliveryItemId = deliveryResp.items().get(0).id();

        // STEP 2: Enterprise inspects & accepts delivery -> Farmer Payable and Inventory Lot automatically created
        SupplyDeliveryInspectionRequest inspReq = new SupplyDeliveryInspectionRequest(List.of(
                new SupplyDeliveryInspectionItemRequest(deliveryItemId, new BigDecimal("100.00"), BigDecimal.ZERO, null)
        ));
        supplyDeliveryService.inspectDelivery(deliveryResp.id(), enterpriseUser.getId(), inspReq);

        FarmerPayable payable = farmerPayableRepository.findByDeliveryItemId(deliveryItemId).orElseThrow();
        assertThat(payable.getAmountDue()).isEqualByComparingTo("12000.00");
        assertThat(payable.getStatus()).isEqualTo(PayableStatus.OPEN);

        // STEP 3: Enterprise disburses payment to farmer
        FarmerPaymentResponse payResp = farmerPaymentService.payFarmer(
                enterprise.getId(),
                enterpriseUser.getId(),
                new FarmerPaymentRequest(enterprise.getId(), farmer.getId(), new BigDecimal("12000.00"), "TELEBIRR"),
                "IDEMP-FARM-PAY-GOLD-01"
        );
        assertThat(payResp.status()).isEqualTo(FarmerPaymentStatus.SUCCESS);

        FarmerPayable paidPayable = farmerPayableRepository.findById(payable.getId()).orElseThrow();
        assertThat(paidPayable.getStatus()).isEqualTo(PayableStatus.SETTLED);
        assertThat(paidPayable.getAmountAllocated()).isEqualByComparingTo("12000.00");

        // STEP 4: Verify Raw Material Inventory Lot received
        List<InventoryLot> lots = inventoryLotRepository.findByEnterpriseId(enterprise.getId());
        assertThat(lots).isNotEmpty();
        InventoryLot rawLot = lots.stream()
                .filter(l -> l.getProductType().getId().equals(rawSesame.getId()))
                .findFirst()
                .orElseThrow();
        assertThat(rawLot.getBalanceQty()).isEqualByComparingTo("100.00");

        // STEP 5: Production Batch processes raw sesame into finished goods
        ProductionBatchCreateRequest batchReq = new ProductionBatchCreateRequest(
                enterprise.getId(),
                new BigDecimal("40.00"),
                new BigDecimal("20.00"),
                new BigDecimal("10.00"),
                "Cold-pressed virgin sesame oil first run",
                List.of(new ProductionInputRequest(rawLot.getId(), new BigDecimal("100.00"), "kg")),
                List.of(new ProductionOutputRequest(rawSesame.getId(), new BigDecimal("100.00"), "kg", "GRADE_1", false, null)),
                null,
                true,
                "Alduba",
                "Dimeka Agro Cooperative",
                "Crafted by indigenous South Omo smallholder farmers using cold stone pressing.",
                true
        );
        ProductionBatchResponse batchResp = productionBatchService.createBatch(enterprise.getId(), batchReq, enterpriseUser);
        assertThat(batchResp.status()).isEqualTo(BatchStatus.COMPLETED);
        assertThat(batchResp.traceToken()).isNotBlank();

        // STEP 6: Create and publish retail product
        Product retailProduct = new Product();
        retailProduct.setEnterprise(enterprise);
        retailProduct.setSku("OIL-SESAME-500ML");
        retailProduct.setName("Pure Virgin Sesame Oil 500ml");
        retailProduct.setDescription("Cold-pressed from organic South Omo sesame.");
        retailProduct.setCategory("Oil");
        retailProduct.setUnit("bottle");
        retailProduct.setPackSize(new BigDecimal("0.50"));
        retailProduct.setUnitPrice(new BigDecimal("450.00"));
        retailProduct.setCurrency("ETB");
        retailProduct.setStockOnHand(new BigDecimal("40.00"));
        retailProduct.setStockReserved(BigDecimal.ZERO);
        retailProduct.setPublished(true);
        retailProduct = productRepository.save(retailProduct);

        ProductPriceBreakdown priceBreakdown = new ProductPriceBreakdown();
        priceBreakdown.setProduct(retailProduct);
        priceBreakdown.setPurchaseCost(new BigDecimal("300.00"));
        priceBreakdown.setProcessingCost(new BigDecimal("40.00"));
        priceBreakdown.setPackagingCost(new BigDecimal("20.00"));
        priceBreakdown.setLaborCost(new BigDecimal("10.00"));
        priceBreakdown.setTransportCost(new BigDecimal("10.00"));
        priceBreakdown.setEnterpriseMargin(new BigDecimal("30.00"));
        priceBreakdown.setCommunityFund(new BigDecimal("10.00"));
        priceBreakdown.setTaxAmount(new BigDecimal("30.00"));
        priceBreakdown.setTotalPrice(new BigDecimal("450.00"));
        priceBreakdownRepository.save(priceBreakdown);
        retailProduct.setPriceBreakdown(priceBreakdown);

        // STEP 7: Buyer places order at checkout
        CheckoutResponse checkoutResp = checkoutService.checkout(new CheckoutRequest(
                "IDEMP-GOLD-ORD-1",
                List.of(new CheckoutItemRequest(retailProduct.getId(), new BigDecimal("2.00"))),
                "Jinka Airport Lounge",
                buyer.getPhoneNumber(),
                5.78, 36.56, "Call on arrival"
        ), buyer);

        UUID orderId = checkoutResp.orders().get(0).orderId();
        Order order = orderRepository.findById(orderId).orElseThrow();
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PLACED);
        assertThat(order.getSubtotal()).isEqualByComparingTo("900.00");

        // STEP 8: Buyer completes payment via gateway
        PaymentAttemptResponse attemptResp = paymentService.createPaymentAttempt(
                new CreatePaymentAttemptRequest(orderId, null, "TELEBIRR", "IDEMP-GOLD-PAY-1"),
                buyer
        );
        Payment payment = paymentRepository.findByOrderId(orderId).orElseThrow();

        paymentService.processVerifiedWebhook(
                "TELEBIRR",
                "TB-EVT-GOLD-01",
                "PAYMENT_SUCCESS",
                "VALID_HMAC_SHA256_TEST_SIGNATURE",
                objectMapper.valueToTree(Map.of(
                        "paymentNo", payment.getPaymentNo(),
                        "amount", payment.getAmount(),
                        "status", "COMPLETED"
                ))
        );

        Order paidOrder = orderRepository.findById(orderId).orElseThrow();
        assertThat(paidOrder.getStatus()).isEqualTo(OrderStatus.PAID);

        // STEP 9: Create and assign delivery job
        DeliveryJobResponse jobResp = deliveryService.createAndAssignJob(new CreateDeliveryJobRequest(
                List.of(orderId), deliveryProvider.getId(),
                "Dimeka Facility", 5.17, 36.56, "Jinka Airport Lounge", 5.78, 36.56,
                new BigDecimal("150.00")
        ), enterpriseUser);

        // STEP 10: Delivery provider updates checkpoints via SMS
        inboundSmsService.handleInboundSms(new InboundSmsRequest(
                providerUser.getPhoneNumber(), "+251911000000",
                jobResp.jobNo() + " PICKED UP from warehouse", "golden-path-sms-secret"
        ), "golden-path-sms-secret");

        inboundSmsService.handleInboundSms(new InboundSmsRequest(
                providerUser.getPhoneNumber(), "+251911000000",
                jobResp.jobNo() + " IN TRANSIT to destination", "golden-path-sms-secret"
        ), "golden-path-sms-secret");

        inboundSmsService.handleInboundSms(new InboundSmsRequest(
                providerUser.getPhoneNumber(), "+251911000000",
                jobResp.jobNo() + " ARRIVED and DELIVERED to buyer", "golden-path-sms-secret"
        ), "golden-path-sms-secret");

        DeliveryJob deliveredJob = deliveryJobRepository.findById(jobResp.jobId()).orElseThrow();
        assertThat(deliveredJob.getStatus()).isEqualTo(DeliveryStatus.DELIVERED);

        // Mark order IN_TRANSIT then DELIVERED to satisfy review requirements
        orderService.updateOrderStatus(orderId, OrderStatus.IN_TRANSIT, "Dispatched with delivery provider", null);
        orderService.updateOrderStatus(orderId, OrderStatus.DELIVERED, "Delivered to buyer", null);

        // STEP 11: Consumer public traceability query
        PublicTraceResponse trace = traceabilityService.getPublicTrace(batchResp.traceToken(), "192.168.1.1", "curl/8.0");
        assertThat(trace.batchCode()).isEqualTo(batchResp.batchCode());
        assertThat(trace.enterpriseName()).isEqualTo("Dimeka Agro Cooperative");
        assertThat(trace.originVillage()).isEqualTo("Alduba");

        // STEP 12: Buyer leaves verified review
        ReviewResponse review = reviewService.createReview(new CreateReviewRequest(
                ReviewTargetType.PRODUCT, retailProduct.getId(), orderId, null, 5, "Superb pure virgin sesame oil!"
        ), buyer);
        assertThat(review.rating()).isEqualTo(5);

        // STEP 13: Enterprise impact metrics calculated
        EnterpriseImpactMetricsResponse metrics = impactReportingService.getImpactMetrics(enterprise.getId(), enterpriseUser);
        assertThat(metrics.activeFarmersCount()).isEqualTo(1);
        assertThat(metrics.totalFarmerDisbursedEtb()).isEqualByComparingTo("12000.00");
        assertThat(metrics.totalOrdersCount()).isEqualTo(1);

        // STEP 14: Offline farmer checks balance via USSD
        UssdResponse ussd1 = ussdService.handleUssdRequest(new UssdRequest("sess-gold-1", farmerUser.getPhoneNumber(), ""));
        assertThat(ussd1.message()).contains("እንኳን ወደ ኦሞብሪጅ");

        UssdResponse ussd2 = ussdService.handleUssdRequest(new UssdRequest("sess-gold-1", farmerUser.getPhoneNumber(), "2"));
        assertThat(ussd2.message()).contains("ያልተከፈለ ቀሪ ሂሳብ: 0"); // 12,000 was fully disbursed!
    }
}
