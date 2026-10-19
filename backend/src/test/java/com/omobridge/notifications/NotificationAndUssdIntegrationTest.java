package com.omobridge.notifications;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.common.outbox.OutboxEvent;
import com.omobridge.common.outbox.OutboxEventRepository;
import com.omobridge.common.outbox.TransactionalOutboxService;
import com.omobridge.common.util.LogMaskingUtil;
import com.omobridge.delivery.domain.DeliveryJob;
import com.omobridge.delivery.domain.DeliveryJobOrder;
import com.omobridge.delivery.domain.DeliveryJobOrderRepository;
import com.omobridge.delivery.domain.DeliveryJobRepository;
import com.omobridge.delivery.domain.DeliveryStatus;
import com.omobridge.delivery.domain.DeliveryStatusHistoryRepository;
import com.omobridge.identity.domain.DeliveryProvider;
import com.omobridge.identity.domain.DeliveryProviderRepository;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.identity.domain.Role;
import com.omobridge.identity.domain.RoleRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.VerificationStatus;
import com.omobridge.integrations.sms.InboundSmsRequest;
import com.omobridge.integrations.sms.MockSmsGateway;
import com.omobridge.integrations.sms.SmsMessage;
import com.omobridge.integrations.sms.SmsMessageRepository;
import com.omobridge.integrations.sms.SmsMessageStatus;
import com.omobridge.integrations.ussd.UssdRequest;
import com.omobridge.integrations.ussd.UssdSession;
import com.omobridge.integrations.ussd.UssdSessionRepository;
import com.omobridge.notifications.domain.Notification;
import com.omobridge.notifications.domain.NotificationChannel;
import com.omobridge.notifications.domain.NotificationRepository;
import com.omobridge.notifications.domain.NotificationStatus;
import com.omobridge.notifications.service.NotificationEventListener;
import com.omobridge.notifications.service.NotificationService;
import com.omobridge.notifications.service.NotificationTemplateEngine;
import com.omobridge.notifications.service.OutboxNotificationDispatcher;
import com.omobridge.orders.domain.Order;
import com.omobridge.orders.domain.OrderRepository;
import com.omobridge.orders.domain.OrderStatus;
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
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
public class NotificationAndUssdIntegrationTest {

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
        registry.add("omobridge.integrations.sms.webhook-secret", () -> "test-sms-secret");
    }

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private NotificationService notificationService;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private NotificationTemplateEngine templateEngine;
    @Autowired private OutboxNotificationDispatcher outboxDispatcher;
    @Autowired private TransactionalOutboxService transactionalOutboxService;
    @Autowired private OutboxEventRepository outboxEventRepository;
    @Autowired private MockSmsGateway mockSmsGateway;
    @Autowired private SmsMessageRepository smsMessageRepository;
    @Autowired private UssdSessionRepository ussdSessionRepository;
    @Autowired private UserRepository userRepository;
    @Autowired private RoleRepository roleRepository;
    @Autowired private FarmerRepository farmerRepository;
    @Autowired private EnterpriseRepository enterpriseRepository;
    @Autowired private SupplyDeliveryRepository supplyDeliveryRepository;
    @Autowired private SupplyDeliveryItemRepository supplyDeliveryItemRepository;
    @Autowired private ProductTypeRepository productTypeRepository;
    @Autowired private FarmerPayableRepository farmerPayableRepository;
    @Autowired private DeliveryProviderRepository deliveryProviderRepository;
    @Autowired private DeliveryJobRepository deliveryJobRepository;
    @Autowired private DeliveryJobOrderRepository deliveryJobOrderRepository;
    @Autowired private DeliveryStatusHistoryRepository deliveryStatusHistoryRepository;
    @Autowired private OrderRepository orderRepository;
    @Autowired private ApplicationEventPublisher eventPublisher;
    @Autowired private TransactionTemplate transactionTemplate;

    private User farmerUser;
    private Farmer farmer;
    private Enterprise enterprise;
    private DeliveryProvider deliveryProvider;
    private User providerUser;
    private Order paidOrder;
    private DeliveryJob deliveryJob;

    @BeforeEach
    void setupData() {
        mockSmsGateway.clear();
        notificationRepository.deleteAll();
        smsMessageRepository.deleteAll();
        ussdSessionRepository.deleteAll();
        outboxEventRepository.deleteAll();
        deliveryStatusHistoryRepository.deleteAll();
        deliveryJobOrderRepository.deleteAll();
        deliveryJobRepository.deleteAll();
        farmerPayableRepository.deleteAll();
        supplyDeliveryItemRepository.deleteAll();
        supplyDeliveryRepository.deleteAll();
        productTypeRepository.deleteAll();
        orderRepository.deleteAll();
        deliveryProviderRepository.deleteAll();
        farmerRepository.deleteAll();
        enterpriseRepository.deleteAll();
        userRepository.deleteAll();

        Role farmerRole = roleRepository.findByName("ROLE_PRODUCER_FARMER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_PRODUCER_FARMER", "Farmer")));
        Role providerRole = roleRepository.findByName("ROLE_DELIVERY_PROVIDER")
                .orElseGet(() -> roleRepository.save(new Role("ROLE_DELIVERY_PROVIDER", "Delivery Provider")));

        farmerUser = new User();
        farmerUser.setPhoneNumber("+251911920001");
        farmerUser.setFullName("Alemayehu Haile");
        farmerUser.setPasswordHash("hashedpassword");
        farmerUser.setRoles(Set.of(farmerRole));
        userRepository.save(farmerUser);

        enterprise = new Enterprise();
        enterprise.setOwnerUser(farmerUser);
        enterprise.setName("South Omo Honey Union");
        enterprise.setRegistrationNumber("ENT-SO-1001");
        enterprise.setContactPhone("+251911920099");
        enterprise.setContactEmail("union@southomo.et");
        enterprise.setLocationWoreda("Turmi");
        enterprise.setLocationTown("Dimeka");
        enterpriseRepository.save(enterprise);

        farmer = new Farmer();
        farmer.setUser(farmerUser);
        farmer.setEnterprise(enterprise);
        farmer.setFarmerCode("FARM-1001");
        farmer.setVillage("Key Afer");
        farmer.setVerificationStatus(VerificationStatus.VERIFIED);
        farmerRepository.save(farmer);

        providerUser = new User();
        providerUser.setPhoneNumber("+251911920002");
        providerUser.setFullName("Benti Transport Driver");
        providerUser.setPasswordHash("hashedpassword");
        providerUser.setRoles(Set.of(providerRole));
        userRepository.save(providerUser);

        deliveryProvider = new DeliveryProvider();
        deliveryProvider.setUser(providerUser);
        deliveryProvider.setVehicleType(com.omobridge.identity.domain.VehicleType.TRUCK);
        deliveryProvider.setVehiclePlateNumber("3-44123-AA");
        deliveryProvider.setServiceArea("Jinka, Turmi, Key Afer");
        deliveryProvider.setVerificationStatus(VerificationStatus.VERIFIED);
        deliveryProvider = deliveryProviderRepository.save(deliveryProvider);

        deliveryJob = new DeliveryJob();
        deliveryJob.setJobNo("DEL-20261018-SMS1");
        deliveryJob.setProvider(deliveryProvider);
        deliveryJob.setStatus(DeliveryStatus.ASSIGNED);
        deliveryJob.setPickupAddress("Jinka Depot");
        deliveryJob.setDropoffAddress("Key Afer Market");
        deliveryJob.setFee(new BigDecimal("50.00"));
        deliveryJob.setTrackingToken("trk-test-sms-123");
        deliveryJob = deliveryJobRepository.save(deliveryJob);
    }

    @Test
    @DisplayName("Transactional outbox dispatcher processes events and sends SMS via Gateway")
    void testTransactionalOutboxAndNotificationDispatch() {
        // 1. Transactional publishing of outbox event
        transactionTemplate.executeWithoutResult(status -> {
            transactionalOutboxService.publishInTransaction(
                    "SUPPLY_RECEIVED",
                    "SUPPLY_DELIVERY",
                    UUID.randomUUID(),
                    Map.of(
                            "phone", farmerUser.getPhoneNumber(),
                            "language", "en",
                            "crop", "Forest Honey",
                            "quantity", "25",
                            "unit", "kg",
                            "enterprise", enterprise.getName()
                    )
            );
        });

        List<OutboxEvent> outboxEvents = outboxEventRepository.findAll();
        assertThat(outboxEvents).hasSize(1);
        assertThat(outboxEvents.get(0).getProcessedAt()).isNull();

        // 2. Dispatcher processes pending outbox event -> creates Notification in QUEUED status
        int processedEvents = outboxDispatcher.dispatchPendingOutboxEvents(10);
        assertThat(processedEvents).isEqualTo(1);

        OutboxEvent processedOutbox = outboxEventRepository.findById(outboxEvents.get(0).getId()).orElseThrow();
        assertThat(processedOutbox.getProcessedAt()).isNotNull();

        List<Notification> queuedNotifications = notificationRepository.findAll();
        assertThat(queuedNotifications).hasSize(1);
        Notification notification = queuedNotifications.get(0);
        assertThat(notification.getStatus()).isEqualTo(NotificationStatus.QUEUED);
        assertThat(notification.getMessage()).contains("Forest Honey", "25 kg", "South Omo Honey Union");

        // 3. Dispatch pending notifications via SMS gateway
        int sentCount = notificationService.dispatchPendingNotifications(10);
        assertThat(sentCount).isEqualTo(1);

        Notification sentNotification = notificationRepository.findById(notification.getId()).orElseThrow();
        assertThat(sentNotification.getStatus()).isEqualTo(NotificationStatus.SENT);
        assertThat(sentNotification.getSentAt()).isNotNull();

        // 4. Verify SMS Gateway recorded outbound message
        assertThat(mockSmsGateway.getSentRecords()).hasSize(1);
        assertThat(mockSmsGateway.getSentRecords().get(0).phoneNumber()).isEqualTo(farmerUser.getPhoneNumber());

        List<SmsMessage> smsLogs = smsMessageRepository.findAll();
        assertThat(smsLogs).hasSize(1);
        assertThat(smsLogs.get(0).getStatus()).isEqualTo(SmsMessageStatus.SENT);
    }

    @Test
    @DisplayName("Multi-lingual template rendering & EventListener integration")
    void testMultiLingualEventNotifications() {
        // Publish supply received event in Amharic
        eventPublisher.publishEvent(new NotificationEventListener.SupplyReceivedNotificationEvent(
                UUID.randomUUID(),
                farmerUser.getPhoneNumber(),
                "am",
                "ቡና",
                new BigDecimal("50.00"),
                "ኪግ",
                "የደቡብ ኦሞ ህብረት"
        ));

        List<Notification> notifications = notificationRepository.findAll();
        assertThat(notifications).hasSize(1);
        Notification amNotification = notifications.get(0);
        assertThat(amNotification.getMessage()).contains("ኦሞብሪጅ", "50 ኪግ ቡና", "የደቡብ ኦሞ ህብረት");

        // Publish farmer payment event in English
        eventPublisher.publishEvent(new NotificationEventListener.FarmerPaymentNotificationEvent(
                UUID.randomUUID(),
                farmerUser.getPhoneNumber(),
                "en",
                new BigDecimal("4500.00"),
                "PAY-20261018-999"
        ));

        List<Notification> allNotifications = notificationRepository.findAll();
        assertThat(allNotifications).hasSize(2);
        Notification paymentNotif = allNotifications.stream()
                .filter(n -> "PAYMENT_SENT".equals(n.getTemplateCode()))
                .findFirst().orElseThrow();
        assertThat(paymentNotif.getMessage()).contains("4500 ETB", "PAY-20261018-999");
    }

    @Test
    @DisplayName("Inbound SMS webhook updates delivery checkpoint for authorized provider and rejects spoofed sender")
    void testInboundSmsDeliveryCheckpointAndSpoofingProtection() throws Exception {
        // 1. Invalid signature returns 401 Unauthorized
        InboundSmsRequest badSignatureReq = new InboundSmsRequest(
                providerUser.getPhoneNumber(),
                "+251911000000",
                "DEL-20261018-SMS1 ARRIVED Key Afer",
                "wrong-secret"
        );
        mockMvc.perform(post("/api/v1/integrations/sms/inbound")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badSignatureReq)))
                .andExpect(status().isUnauthorized());

        // 2. Spoofed sender attempt: Phone number does not match assigned provider -> REJECTED
        InboundSmsRequest spoofedReq = new InboundSmsRequest(
                "+251911999999", // not providerUser's phone!
                "+251911000000",
                "DEL-20261018-SMS1 ARRIVED Key Afer",
                "test-sms-secret"
        );
        mockMvc.perform(post("/api/v1/integrations/sms/inbound")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(spoofedReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.processed", is(false)))
                .andExpect(jsonPath("$.data.action", is("SPOOFED_SENDER")));

        DeliveryJob jobUnchanged = deliveryJobRepository.findById(deliveryJob.getId()).orElseThrow();
        assertThat(jobUnchanged.getStatus()).isEqualTo(DeliveryStatus.ASSIGNED);

        // 3. Legitimate provider sends "DEL-20261018-SMS1 TRANSIT" -> moves to IN_TRANSIT
        deliveryJob.setStatus(DeliveryStatus.PICKED_UP);
        deliveryJobRepository.save(deliveryJob);

        InboundSmsRequest validTransitReq = new InboundSmsRequest(
                providerUser.getPhoneNumber(),
                "+251911000000",
                "DEL-20261018-SMS1 LEFT depot and in transit",
                "test-sms-secret"
        );
        mockMvc.perform(post("/api/v1/integrations/sms/inbound")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validTransitReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.processed", is(true)))
                .andExpect(jsonPath("$.data.action", is("CHECKPOINT_UPDATED")));

        DeliveryJob jobTransit = deliveryJobRepository.findById(deliveryJob.getId()).orElseThrow();
        assertThat(jobTransit.getStatus()).isEqualTo(DeliveryStatus.IN_TRANSIT);

        // 4. Legitimate provider sends "DEL-20261018-SMS1 ARRIVED" -> moves to DELIVERED
        InboundSmsRequest validDeliveredReq = new InboundSmsRequest(
                providerUser.getPhoneNumber(),
                "+251911000000",
                "DEL-20261018-SMS1 ARRIVED at customer location",
                "test-sms-secret"
        );
        mockMvc.perform(post("/api/v1/integrations/sms/inbound")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validDeliveredReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.processed", is(true)))
                .andExpect(jsonPath("$.data.action", is("CHECKPOINT_UPDATED")));

        DeliveryJob jobDelivered = deliveryJobRepository.findById(deliveryJob.getId()).orElseThrow();
        assertThat(jobDelivered.getStatus()).isEqualTo(DeliveryStatus.DELIVERED);
    }

    @Test
    @DisplayName("USSD engine state machine, farmer privacy isolation, and session navigation")
    void testUssdFarmerMenusAndSessionFlow() throws Exception {
        // Setup supply delivery & payable for farmer
        SupplyDelivery delivery = new SupplyDelivery();
        delivery.setDeliveryNo("SUP-20261018-TEST");
        delivery.setEnterprise(enterprise);
        delivery.setFarmer(farmer);
        delivery.setReceivedByUser(farmerUser);
        delivery.setStatus(com.omobridge.supply.domain.DeliveryStatus.RECORDED);
        delivery.setDeliveredAt(Instant.now());
        delivery = supplyDeliveryRepository.save(delivery);

        ProductType sesame = new ProductType();
        sesame.setCode("SESAME-01");
        sesame.setName("White Sesame");
        sesame.setCategory("OILSEEDS");
        sesame.setUnit("kg");
        sesame = productTypeRepository.save(sesame);

        SupplyDeliveryItem item = new SupplyDeliveryItem();
        item.setDelivery(delivery);
        item.setProductType(sesame);
        item.setGrade("GRADE_1");
        item.setDeliveredQty(new BigDecimal("100.00"));
        item.setAcceptedQty(new BigDecimal("100.00"));
        item.setUnitPriceSnapshot(new BigDecimal("120.00"));
        item.setLineTotal(new BigDecimal("12000.00"));
        supplyDeliveryItemRepository.save(item);

        FarmerPayable payable = new FarmerPayable();
        payable.setPayableNo("PAYABLE-1001");
        payable.setFarmer(farmer);
        payable.setEnterprise(enterprise);
        payable.setDeliveryItem(item);
        payable.setAmountDue(new BigDecimal("12000.00"));
        payable.setAmountAllocated(new BigDecimal("2000.00")); // 10000 pending
        payable.setStatus(PayableStatus.PARTIAL);
        farmerPayableRepository.save(payable);

        String sessionId = "ussd-sess-1001";
        String farmerPhone = farmerUser.getPhoneNumber();

        // 1. Initial dial -> Main menu
        mockMvc.perform(post("/api/v1/integrations/ussd")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UssdRequest(sessionId, farmerPhone, ""))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.shouldClose", is(false)))
                .andExpect(jsonPath("$.data.message", containsString("እንኳን ወደ ኦሞብሪጅ")));

        // 2. Select option 4 (Language) -> switch to English
        mockMvc.perform(post("/api/v1/integrations/ussd")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UssdRequest(sessionId, farmerPhone, "4"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message", containsString("Select Language")));

        mockMvc.perform(post("/api/v1/integrations/ussd")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UssdRequest(sessionId, farmerPhone, "1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message", containsString("Welcome to OmoBridge")));

        // 3. Select option 1 (My Deliveries) in English -> displays White Sesame delivery
        mockMvc.perform(post("/api/v1/integrations/ussd")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UssdRequest(sessionId, farmerPhone, "1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message", containsString("White Sesame")))
                .andExpect(jsonPath("$.data.message", containsString("FARM-1001")));

        // 4. Return to main menu (0)
        mockMvc.perform(post("/api/v1/integrations/ussd")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UssdRequest(sessionId, farmerPhone, "0"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message", containsString("Welcome to OmoBridge")));

        // 5. Select option 2 (My Payments & Balance) -> displays 10000.00 ETB pending
        mockMvc.perform(post("/api/v1/integrations/ussd")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UssdRequest(sessionId, farmerPhone, "2"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.message", containsString("Pending Balance: 10000.00 ETB")));

        // 6. Farmer Privacy: An unregistered or different phone cannot see this farmer's data
        String strangerPhone = "+251911777777";
        String strangerSession = "ussd-sess-stranger";
        mockMvc.perform(post("/api/v1/integrations/ussd")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UssdRequest(strangerSession, strangerPhone, ""))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/integrations/ussd")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UssdRequest(strangerSession, strangerPhone, "1"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.shouldClose", is(true)))
                .andExpect(jsonPath("$.data.message", containsString("ስልክ ቁጥርዎ እንደ አርሶ አደር አልተመዘገበም")));

        // 7. Session expiry resets back to Main menu
        UssdSession session = ussdSessionRepository.findBySessionId(sessionId).orElseThrow();
        session.setExpiresAt(Instant.now().minus(10, ChronoUnit.MINUTES));
        ussdSessionRepository.save(session);

        mockMvc.perform(post("/api/v1/integrations/ussd")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new UssdRequest(sessionId, farmerPhone, ""))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.shouldClose", is(false)))
                .andExpect(jsonPath("$.data.message", containsString("እንኳን ወደ ኦሞብሪጅ")));
    }

    @Test
    @DisplayName("Log masking utility masks phone numbers, secrets, and auth tokens")
    void testLogMaskingHygiene() {
        assertThat(LogMaskingUtil.maskPhone("+251911920001")).isEqualTo("+2519****01");
        assertThat(LogMaskingUtil.maskPhone(null)).isEqualTo("***");
        assertThat(LogMaskingUtil.maskToken("eyJhbGciOiJIUzM4NCJ9.eyJuYW1lIjoiSm9obiJ9")).isEqualTo("eyJhb...****");
        assertThat(LogMaskingUtil.maskSecret("omo-secret-key-12345")).isEqualTo("omo***");
    }
}
