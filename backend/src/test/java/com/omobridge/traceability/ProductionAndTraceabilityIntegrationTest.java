package com.omobridge.traceability;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.Result;
import com.google.zxing.client.j2se.BufferedImageLuminanceSource;
import com.google.zxing.common.HybridBinarizer;
import com.omobridge.common.BaseIntegrationTest;
import com.omobridge.common.security.JwtService;
import com.omobridge.common.security.RoleName;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.EnterpriseStaff;
import com.omobridge.identity.domain.EnterpriseStaffRepository;
import com.omobridge.identity.domain.EnterpriseStatus;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.identity.domain.Role;
import com.omobridge.identity.domain.RoleRepository;
import com.omobridge.identity.domain.StaffRole;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.inventory.domain.InventoryLocation;
import com.omobridge.inventory.domain.InventoryLocationRepository;
import com.omobridge.inventory.domain.InventoryLot;
import com.omobridge.inventory.domain.InventoryLotRepository;
import com.omobridge.inventory.service.InventoryService;
import com.omobridge.supply.domain.DeliveryStatus;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
import com.omobridge.supply.domain.SupplyDelivery;
import com.omobridge.supply.domain.SupplyDeliveryItem;
import com.omobridge.supply.domain.SupplyDeliveryRepository;
import com.omobridge.traceability.api.dto.ProductionBatchCreateRequest;
import com.omobridge.traceability.api.dto.ProductionInputRequest;
import com.omobridge.traceability.api.dto.ProductionLossRequest;
import com.omobridge.traceability.api.dto.ProductionOutputRequest;
import com.omobridge.traceability.api.dto.TraceRecordUpdateRequest;
import com.omobridge.traceability.domain.BatchStatus;
import com.omobridge.traceability.domain.ProductionBatch;
import com.omobridge.traceability.domain.ProductionBatchRepository;
import com.omobridge.traceability.service.ProductionBatchService;
import com.omobridge.traceability.service.TraceabilityService;
import java.io.ByteArrayInputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.imageio.ImageIO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@AutoConfigureMockMvc
class ProductionAndTraceabilityIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private EnterpriseRepository enterpriseRepository;

    @Autowired
    private EnterpriseStaffRepository enterpriseStaffRepository;

    @Autowired
    private ProductTypeRepository productTypeRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private SupplyDeliveryRepository deliveryRepository;

    @Autowired
    private InventoryLocationRepository locationRepository;

    @Autowired
    private InventoryLotRepository lotRepository;

    @Autowired
    private ProductionBatchRepository batchRepository;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private ProductionBatchService batchService;

    @Autowired
    private TraceabilityService traceabilityService;

    private User enterpriseOwner;
    private Enterprise enterprise;
    private String enterpriseToken;

    private User farmerUser1;
    private Farmer farmer1;

    private User farmerUser2;
    private Farmer farmer2;

    private ProductType rawCoffee;
    private ProductType roastedCoffee;
    private InventoryLocation warehouseLocation;

    @BeforeEach
    void setUp() {
        Role roleEnterprise = roleRepository.findByName(RoleName.MICRO_ENTERPRISE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.MICRO_ENTERPRISE.name(), "Enterprise")));
        Role roleFarmer = roleRepository.findByName(RoleName.PRODUCER_FARMER.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.PRODUCER_FARMER.name(), "Farmer")));

        // Enterprise
        enterpriseOwner = new User();
        enterpriseOwner.setPhoneNumber("+251911" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "4"));
        enterpriseOwner.setFullName("Ato Haile Mariam");
        enterpriseOwner.setPasswordHash("hashed");
        enterpriseOwner.setStatus(UserStatus.ACTIVE);
        enterpriseOwner.addRole(roleEnterprise);
        enterpriseOwner = userRepository.save(enterpriseOwner);
        enterpriseToken = jwtService.generateToken(enterpriseOwner.getId(), enterpriseOwner.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));

        enterprise = new Enterprise();
        enterprise.setName("South Omo Artisan Roasters");
        enterprise.setRegistrationNumber("REG-TRC-" + UUID.randomUUID().toString().substring(0, 6));
        enterprise.setContactPhone(enterpriseOwner.getPhoneNumber());
        enterprise.setLocationWoreda("South Ari");
        enterprise.setLocationTown("Gazer");
        enterprise.setOwnerUser(enterpriseOwner);
        enterprise.setStatus(EnterpriseStatus.ACTIVE);
        enterprise = enterpriseRepository.save(enterprise);

        EnterpriseStaff staff = new EnterpriseStaff();
        staff.setEnterprise(enterprise);
        staff.setUser(enterpriseOwner);
        staff.setRole(StaffRole.OWNER);
        staff.setActive(true);
        enterpriseStaffRepository.save(staff);

        // Location
        warehouseLocation = new InventoryLocation();
        warehouseLocation.setEnterprise(enterprise);
        warehouseLocation.setName("Primary Processing Depot");
        warehouseLocation.setLocationType("PROCESSING_FACILITY");
        warehouseLocation = locationRepository.save(warehouseLocation);

        // Products
        rawCoffee = productTypeRepository.findByCode("RAW-COFFEE-TRC")
                .orElseGet(() -> {
                    ProductType pt = new ProductType();
                    pt.setCode("RAW-COFFEE-TRC");
                    pt.setName("Raw Forest Cherry Coffee");
                    pt.setCategory("RAW_MATERIAL");
                    pt.setUnit("KG");
                    return productTypeRepository.save(pt);
                });

        roastedCoffee = productTypeRepository.findByCode("ROASTED-COFFEE-TRC")
                .orElseGet(() -> {
                    ProductType pt = new ProductType();
                    pt.setCode("ROASTED-COFFEE-TRC");
                    pt.setName("Medium Roast Forest Coffee");
                    pt.setCategory("FINISHED_GOOD");
                    pt.setUnit("KG");
                    return productTypeRepository.save(pt);
                });

        // Farmer 1 (Consent = TRUE)
        farmerUser1 = new User();
        farmerUser1.setPhoneNumber("+251922" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "5"));
        farmerUser1.setFullName("Kuma Woreta");
        farmerUser1.setPasswordHash("hashed");
        farmerUser1.setStatus(UserStatus.ACTIVE);
        farmerUser1.addRole(roleFarmer);
        farmerUser1 = userRepository.save(farmerUser1);

        farmer1 = new Farmer();
        farmer1.setUser(farmerUser1);
        farmer1.setEnterprise(enterprise);
        farmer1.setFarmerCode("FRM-KUMA-" + UUID.randomUUID().toString().substring(0, 4));
        farmer1.setVillage("Gazer Village");
        farmer1.setKebele("Gazer Kebele");
        farmer1.setConsentPublicName(true);
        farmer1 = farmerRepository.save(farmer1);

        // Farmer 2 (Consent = FALSE)
        farmerUser2 = new User();
        farmerUser2.setPhoneNumber("+251922" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "6"));
        farmerUser2.setFullName("Alula Chernet");
        farmerUser2.setPasswordHash("hashed");
        farmerUser2.setStatus(UserStatus.ACTIVE);
        farmerUser2.addRole(roleFarmer);
        farmerUser2 = userRepository.save(farmerUser2);

        farmer2 = new Farmer();
        farmer2.setUser(farmerUser2);
        farmer2.setEnterprise(enterprise);
        farmer2.setFarmerCode("FRM-ALULA-" + UUID.randomUUID().toString().substring(0, 4));
        farmer2.setVillage("Jinka Outskirts");
        farmer2.setKebele("Jinka Kebele");
        farmer2.setConsentPublicName(false);
        farmer2 = farmerRepository.save(farmer2);
    }

    private InventoryLot createFarmerDeliveryAndLot(Farmer farmer, BigDecimal qty) {
        SupplyDelivery delivery = new SupplyDelivery();
        delivery.setDeliveryNo("DEL-" + UUID.randomUUID().toString().substring(0, 8));
        delivery.setEnterprise(enterprise);
        delivery.setFarmer(farmer);
        delivery.setReceivedByUser(enterpriseOwner);
        delivery.setDeliveredAt(Instant.now());
        delivery.setStatus(DeliveryStatus.INSPECTED);

        SupplyDeliveryItem item = new SupplyDeliveryItem();
        item.setProductType(rawCoffee);
        item.setGrade("GRADE_A");
        item.setDeliveredQty(qty);
        item.setAcceptedQty(qty);
        item.setRejectedQty(BigDecimal.ZERO);
        item.setUnitPriceSnapshot(new BigDecimal("150.00"));
        item.setLineTotal(qty.multiply(new BigDecimal("150.00")));
        delivery.addItem(item);

        delivery = deliveryRepository.save(delivery);
        SupplyDeliveryItem savedItem = delivery.getItems().get(0);

        return inventoryService.receiveLot(
                enterprise,
                warehouseLocation,
                rawCoffee,
                savedItem,
                "GRADE_A",
                qty,
                "KG",
                "Farmer harvest intake",
                enterpriseOwner
        );
    }

    @Test
    @DisplayName("B-602: Batch creation with mass conservation, imbalance rejection, and stock consumption")
    void testBatchCreationMassConservationAndImbalance() throws Exception {
        InventoryLot lot = createFarmerDeliveryAndLot(farmer1, new BigDecimal("100.00"));

        // 1. Imbalance: 50 input != 40 output + 5 loss (sum = 45 != 50) -> fails with 422
        ProductionBatchCreateRequest unbalancedReq = new ProductionBatchCreateRequest(
                enterprise.getId(),
                new BigDecimal("500.00"),
                new BigDecimal("200.00"),
                new BigDecimal("150.00"),
                "Experimental roast",
                List.of(new ProductionInputRequest(lot.getId(), new BigDecimal("50.00"), "KG")),
                List.of(new ProductionOutputRequest(roastedCoffee.getId(), new BigDecimal("40.00"), "KG", "PREMIUM", true, warehouseLocation.getId())),
                List.of(new ProductionLossRequest(new BigDecimal("5.00"), "KG", "Chaff and moisture loss")),
                false,
                "Gazer Village",
                "Ari Highland Roasters",
                "Artisan roast",
                true
        );

        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/production/batches", enterprise.getId())
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(unbalancedReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("BATCH_IMBALANCE")));

        // 2. Balanced batch: 50 input = 42 output + 8 loss -> succeeds
        ProductionBatchCreateRequest balancedReq = new ProductionBatchCreateRequest(
                enterprise.getId(),
                new BigDecimal("500.00"),
                new BigDecimal("200.00"),
                new BigDecimal("150.00"),
                "First balanced roast",
                List.of(new ProductionInputRequest(lot.getId(), new BigDecimal("50.00"), "KG")),
                List.of(new ProductionOutputRequest(roastedCoffee.getId(), new BigDecimal("42.00"), "KG", "PREMIUM", true, warehouseLocation.getId())),
                List.of(new ProductionLossRequest(new BigDecimal("8.00"), "KG", "Chaff and moisture loss")),
                true, // complete immediately
                "Gazer Village",
                "Ari Highland Roasters",
                "Single origin batch",
                true
        );

        MvcResult result = mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/production/batches", enterprise.getId())
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(balancedReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.inputs[0].quantity").value(50.00))
                .andExpect(jsonPath("$.data.outputs[0].quantity").value(42.00))
                .andExpect(jsonPath("$.data.losses[0].quantity").value(8.00))
                .andReturn();

        // Verify source lot balance decreased from 100 to 50
        InventoryLot updatedLot = lotRepository.findById(lot.getId()).orElseThrow();
        assertThat(updatedLot.getBalanceQty()).isEqualByComparingTo("50.00");

        // Verify output lot created with 42 KG
        List<InventoryLot> lots = lotRepository.findByEnterpriseId(enterprise.getId());
        InventoryLot outputLot = lots.stream()
                .filter(l -> l.getProductType().getId().equals(roastedCoffee.getId()))
                .findFirst()
                .orElseThrow();
        assertThat(outputLot.getBalanceQty()).isEqualByComparingTo("42.00");
    }

    @Test
    @DisplayName("B-603: Batch lifecycle (draft -> complete -> cancel) and stock reversal")
    void testBatchLifecycleAndReversal() throws Exception {
        InventoryLot lot = createFarmerDeliveryAndLot(farmer1, new BigDecimal("60.00"));

        // 1. Create draft batch
        ProductionBatchCreateRequest draftReq = new ProductionBatchCreateRequest(
                enterprise.getId(),
                BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                "Draft batch test",
                List.of(new ProductionInputRequest(lot.getId(), new BigDecimal("60.00"), "KG")),
                List.of(new ProductionOutputRequest(roastedCoffee.getId(), new BigDecimal("50.00"), "KG", "GRADE_A", true, warehouseLocation.getId())),
                List.of(new ProductionLossRequest(new BigDecimal("10.00"), "KG", "Expected moisture evaporation")),
                false, // draft
                "Gazer", "Ari Roasters", "Draft batch story", false
        );

        MvcResult createResult = mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/production/batches", enterprise.getId())
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(draftReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andReturn();

        UUID batchId = UUID.fromString(objectMapper.readTree(createResult.getResponse().getContentAsString())
                .path("data").path("id").asText());

        // Source lot depleted to 0.00
        InventoryLot depletedLot = lotRepository.findById(lot.getId()).orElseThrow();
        assertThat(depletedLot.getBalanceQty()).isEqualByComparingTo("0.00");

        // 2. Complete batch
        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/production/batches/{batchId}/complete", enterprise.getId(), batchId)
                        .header("Authorization", "Bearer " + enterpriseToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        // 3. Cancel batch -> reverts stock via adjustment
        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/production/batches/{batchId}/cancel", enterprise.getId(), batchId)
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .param("reason", "Batch roasted too dark"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        // Source lot restored back to 60.00 KG!
        InventoryLot restoredLot = lotRepository.findById(lot.getId()).orElseThrow();
        assertThat(restoredLot.getBalanceQty()).isEqualByComparingTo("60.00");
    }

    @Test
    @DisplayName("B-604: Protect used lots from deletion")
    void testProtectUsedLots() {
        InventoryLot lot = createFarmerDeliveryAndLot(farmer1, new BigDecimal("30.00"));

        batchService.createBatch(
                enterprise.getId(),
                new ProductionBatchCreateRequest(
                        enterprise.getId(),
                        BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO, "Protected lot test",
                        List.of(new ProductionInputRequest(lot.getId(), new BigDecimal("30.00"), "KG")),
                        List.of(new ProductionOutputRequest(roastedCoffee.getId(), new BigDecimal("30.00"), "KG", "GRADE_A", false, null)),
                        null, true, "Gazer", "Ari", "Story", true
                ),
                enterpriseOwner
        );

        // Attempting to delete or modify used lot fails with BusinessRuleException
        org.junit.jupiter.api.Assertions.assertThrows(com.omobridge.common.exception.BusinessRuleException.class, () -> {
            batchService.validateLotNotUsedInProduction(lot.getId());
        });
    }

    @Test
    @DisplayName("B-605, B-606, B-607: Public trace consent rules, validation check, and QR code image")
    void testPublicTraceConsentValidationAndQrCode() throws Exception {
        // Multi-farmer input: farmer1 (consent=true), farmer2 (consent=false)
        InventoryLot lot1 = createFarmerDeliveryAndLot(farmer1, new BigDecimal("40.00"));
        InventoryLot lot2 = createFarmerDeliveryAndLot(farmer2, new BigDecimal("40.00"));

        ProductionBatchCreateRequest request = new ProductionBatchCreateRequest(
                enterprise.getId(),
                new BigDecimal("300.00"), BigDecimal.ZERO, BigDecimal.ZERO, "Collective blend",
                List.of(
                        new ProductionInputRequest(lot1.getId(), new BigDecimal("40.00"), "KG"),
                        new ProductionInputRequest(lot2.getId(), new BigDecimal("40.00"), "KG")
                ),
                List.of(new ProductionOutputRequest(roastedCoffee.getId(), new BigDecimal("70.00"), "KG", "SPECIALTY", true, warehouseLocation.getId())),
                List.of(new ProductionLossRequest(new BigDecimal("10.00"), "KG", "Screening and hulls")),
                true,
                "Ari Highland Forest",
                "South Omo Artisan Roasters",
                "Cultivated under wild shade trees by Ari agro-pastoral communities.",
                true // showFarmerNames = true on batch
        );

        var batchResp = batchService.createBatch(enterprise.getId(), request, enterpriseOwner);
        String publicToken = batchResp.traceToken();
        assertThat(publicToken).isNotBlank();

        // 1. Public Trace when batch showFarmerNames = TRUE:
        // Farmer 1 has consent=true -> name "Kuma Woreta" is visible
        // Farmer 2 has consent=false -> name is null, only village/group visible
        MvcResult publicResult = mockMvc.perform(get("/api/v1/trace/{publicToken}", publicToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.publicToken").value(publicToken))
                .andExpect(jsonPath("$.data.enterpriseName").value("South Omo Artisan Roasters"))
                .andExpect(jsonPath("$.data.originVillage").value("Ari Highland Forest"))
                .andExpect(jsonPath("$.data.farmerOrigins").isArray())
                .andReturn();

        String body = publicResult.getResponse().getContentAsString();
        assertThat(body).contains("Kuma Woreta");
        assertThat(body).doesNotContain("Alula Chernet"); // Farmer 2 withheld consent!
        assertThat(body).contains("Jinka Outskirts");    // But origin village is present!

        // 2. Change batch setting: showFarmerNames = FALSE
        mockMvc.perform(patch("/api/v1/enterprises/{enterpriseId}/production/batches/{batchId}/trace", enterprise.getId(), batchResp.id())
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new TraceRecordUpdateRequest(null, null, null, false))))
                .andExpect(status().isOk());

        // Now neither farmer name appears
        MvcResult privateResult = mockMvc.perform(get("/api/v1/trace/{publicToken}", publicToken))
                .andExpect(status().isOk())
                .andReturn();

        String privateBody = privateResult.getResponse().getContentAsString();
        assertThat(privateBody).doesNotContain("Kuma Woreta");
        assertThat(privateBody).doesNotContain("Alula Chernet");

        // 3. Trace Validation (B-606): full chain verified back to 2 farmers
        mockMvc.perform(get("/api/v1/enterprises/{enterpriseId}/production/batches/{batchId}/validation", enterprise.getId(), batchResp.id())
                        .header("Authorization", "Bearer " + enterpriseToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.valid").value(true))
                .andExpect(jsonPath("$.data.inputLotCount").value(2))
                .andExpect(jsonPath("$.data.farmerCount").value(2));

        // 4. QR Code generation & decoding (B-607)
        MvcResult qrResult = mockMvc.perform(get("/api/v1/trace/{publicToken}/qr", publicToken))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.IMAGE_PNG))
                .andReturn();

        byte[] qrBytes = qrResult.getResponse().getContentAsByteArray();
        assertThat(qrBytes).isNotEmpty();

        // Decode QR code with ZXing and verify it matches the trace URL
        var bufferedImage = ImageIO.read(new ByteArrayInputStream(qrBytes));
        assertThat(bufferedImage).isNotNull();
        var source = new BufferedImageLuminanceSource(bufferedImage);
        var bitmap = new BinaryBitmap(new HybridBinarizer(source));
        Result decoded = new MultiFormatReader().decode(bitmap);

        assertThat(decoded.getText()).contains("/trace/" + publicToken);
    }
}
