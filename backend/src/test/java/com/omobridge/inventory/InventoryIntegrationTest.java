package com.omobridge.inventory;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.common.BaseIntegrationTest;
import com.omobridge.common.security.JwtService;
import com.omobridge.common.security.RoleName;
import com.omobridge.common.util.ConcurrencyTestHelper;
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
import com.omobridge.inventory.api.dto.InventoryAdjustmentRequest;
import com.omobridge.inventory.api.dto.InventoryDisposalRequest;
import com.omobridge.inventory.api.dto.InventoryLocationRequest;
import com.omobridge.inventory.api.dto.InventoryTransferRequest;
import com.omobridge.inventory.api.dto.ReconciliationReportResponse;
import com.omobridge.inventory.domain.InventoryLocation;
import com.omobridge.inventory.domain.InventoryLocationRepository;
import com.omobridge.inventory.domain.InventoryLot;
import com.omobridge.inventory.domain.InventoryLotRepository;
import com.omobridge.inventory.domain.InventoryMovementRepository;
import com.omobridge.inventory.domain.LotStatus;
import com.omobridge.inventory.service.InventoryService;
import com.omobridge.supply.api.dto.BuyingPriceRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryCreateRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryInspectionItemRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryInspectionRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryItemCreateRequest;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@AutoConfigureMockMvc
class InventoryIntegrationTest extends BaseIntegrationTest {

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
    private FarmerPayableRepository payableRepository;

    @Autowired
    private InventoryLocationRepository locationRepository;

    @Autowired
    private InventoryLotRepository lotRepository;

    @Autowired
    private InventoryMovementRepository movementRepository;

    @Autowired
    private InventoryService inventoryService;

    private User enterpriseOwnerA;
    private User enterpriseOwnerB;
    private Enterprise enterpriseA;
    private Enterprise enterpriseB;
    private ProductType coffeeProductType;
    private Farmer farmer;

    private String enterpriseTokenA;
    private String enterpriseTokenB;

    @BeforeEach
    void setUp() {
        Role roleEnterprise = roleRepository.findByName(RoleName.MICRO_ENTERPRISE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.MICRO_ENTERPRISE.name(), "Enterprise")));
        Role roleFarmer = roleRepository.findByName(RoleName.PRODUCER_FARMER.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.PRODUCER_FARMER.name(), "Farmer")));

        // Enterprise A
        enterpriseOwnerA = new User();
        enterpriseOwnerA.setPhoneNumber("+251911" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "1"));
        enterpriseOwnerA.setFullName("Enterprise Manager A");
        enterpriseOwnerA.setPasswordHash("hashed");
        enterpriseOwnerA.setStatus(UserStatus.ACTIVE);
        enterpriseOwnerA.addRole(roleEnterprise);
        enterpriseOwnerA = userRepository.save(enterpriseOwnerA);
        enterpriseTokenA = jwtService.generateToken(enterpriseOwnerA.getId(), enterpriseOwnerA.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));

        enterpriseA = new Enterprise();
        enterpriseA.setName("Omo Eco Processing Enterprise A");
        enterpriseA.setRegistrationNumber("REG-INV-A-" + UUID.randomUUID().toString().substring(0, 6));
        enterpriseA.setContactPhone(enterpriseOwnerA.getPhoneNumber());
        enterpriseA.setLocationWoreda("Jinka");
        enterpriseA.setLocationTown("Jinka Town");
        enterpriseA.setOwnerUser(enterpriseOwnerA);
        enterpriseA.setStatus(EnterpriseStatus.ACTIVE);
        enterpriseA = enterpriseRepository.save(enterpriseA);

        EnterpriseStaff staffA = new EnterpriseStaff();
        staffA.setEnterprise(enterpriseA);
        staffA.setUser(enterpriseOwnerA);
        staffA.setRole(StaffRole.OWNER);
        staffA.setActive(true);
        enterpriseStaffRepository.save(staffA);

        // Enterprise B
        enterpriseOwnerB = new User();
        enterpriseOwnerB.setPhoneNumber("+251911" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "2"));
        enterpriseOwnerB.setFullName("Enterprise Manager B");
        enterpriseOwnerB.setPasswordHash("hashed");
        enterpriseOwnerB.setStatus(UserStatus.ACTIVE);
        enterpriseOwnerB.addRole(roleEnterprise);
        enterpriseOwnerB = userRepository.save(enterpriseOwnerB);
        enterpriseTokenB = jwtService.generateToken(enterpriseOwnerB.getId(), enterpriseOwnerB.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));

        enterpriseB = new Enterprise();
        enterpriseB.setName("Omo Processing Enterprise B");
        enterpriseB.setRegistrationNumber("REG-INV-B-" + UUID.randomUUID().toString().substring(0, 6));
        enterpriseB.setContactPhone(enterpriseOwnerB.getPhoneNumber());
        enterpriseB.setLocationWoreda("Turmi");
        enterpriseB.setLocationTown("Turmi Town");
        enterpriseB.setOwnerUser(enterpriseOwnerB);
        enterpriseB.setStatus(EnterpriseStatus.ACTIVE);
        enterpriseB = enterpriseRepository.save(enterpriseB);

        EnterpriseStaff staffB = new EnterpriseStaff();
        staffB.setEnterprise(enterpriseB);
        staffB.setUser(enterpriseOwnerB);
        staffB.setRole(StaffRole.OWNER);
        staffB.setActive(true);
        enterpriseStaffRepository.save(staffB);

        // Product type
        coffeeProductType = productTypeRepository.findByCode("INV-COFFEE")
                .orElseGet(() -> {
                    ProductType pt = new ProductType();
                    pt.setCode("INV-COFFEE");
                    pt.setName("Forest Raw Coffee");
                    pt.setCategory("AGRICULTURE");
                    pt.setUnit("KG");
                    return productTypeRepository.save(pt);
                });

        // Farmer
        User farmerUser = new User();
        farmerUser.setPhoneNumber("+251922" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "3"));
        farmerUser.setFullName("Abebe Coffee Producer");
        farmerUser.setPasswordHash("hashed");
        farmerUser.setStatus(UserStatus.ACTIVE);
        farmerUser.addRole(roleFarmer);
        farmerUser = userRepository.save(farmerUser);

        farmer = new Farmer();
        farmer.setUser(farmerUser);
        farmer.setEnterprise(enterpriseA);
        farmer.setFarmerCode("FRM-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        farmer.setVillage("Key Afer");
        farmer = farmerRepository.save(farmer);
    }

    @Test
    @DisplayName("B-501, B-503: Enterprise creates location, lists locations, multi-tenant isolation")
    void testInventoryLocationsAndSecurity() throws Exception {
        InventoryLocationRequest request = new InventoryLocationRequest(
                "Central Cold Warehouse",
                "COLD_ROOM",
                "Main temperature controlled warehouse"
        );

        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/inventory/locations", enterpriseA.getId())
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Central Cold Warehouse"))
                .andExpect(jsonPath("$.data.locationType").value("COLD_ROOM"));

        // Enterprise B staff forbidden to access Enterprise A's locations
        mockMvc.perform(get("/api/v1/enterprises/{enterpriseId}/inventory/locations", enterpriseA.getId())
                        .header("Authorization", "Bearer " + enterpriseTokenB))
                .andExpect(status().isForbidden());

        // Enterprise A staff can list locations
        mockMvc.perform(get("/api/v1/enterprises/{enterpriseId}/inventory/locations", enterpriseA.getId())
                        .header("Authorization", "Bearer " + enterpriseTokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].name").value("Central Cold Warehouse"));
    }

    @Test
    @DisplayName("B-504: Supply delivery inspection creates inventory lot and payable in same transaction")
    void testSupplyDeliveryCreatesInventoryLotAndPayable() throws Exception {
        // Set buying price for GRADE_A coffee
        BuyingPriceRequest priceReq = new BuyingPriceRequest(
                enterpriseA.getId(),
                coffeeProductType.getId(),
                "GRADE_A",
                new BigDecimal("200.00"),
                Instant.now().minus(1, ChronoUnit.DAYS),
                null
        );
        mockMvc.perform(post("/api/v1/buying-prices")
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(priceReq)))
                .andExpect(status().isCreated());

        // Record delivery of 50.00 KG
        SupplyDeliveryCreateRequest delReq = new SupplyDeliveryCreateRequest(
                enterpriseA.getId(),
                farmer.getId(),
                Instant.now(),
                "Direct harvest intake",
                List.of(new SupplyDeliveryItemCreateRequest(coffeeProductType.getId(), "GRADE_A", new BigDecimal("50.00")))
        );

        MvcResult delResult = mockMvc.perform(post("/api/v1/supply-deliveries")
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(delReq)))
                .andExpect(status().isCreated())
                .andReturn();

        UUID deliveryId = UUID.fromString(objectMapper.readTree(delResult.getResponse().getContentAsString())
                .path("data").path("id").asText());
        UUID itemId = UUID.fromString(objectMapper.readTree(delResult.getResponse().getContentAsString())
                .path("data").path("items").get(0).path("id").asText());

        // Inspect delivery: 45 KG accepted, 5 KG rejected
        SupplyDeliveryInspectionRequest inspReq = new SupplyDeliveryInspectionRequest(
                List.of(new SupplyDeliveryInspectionItemRequest(itemId, new BigDecimal("45.00"), new BigDecimal("5.00"), "Moisture high"))
        );

        mockMvc.perform(patch("/api/v1/supply-deliveries/{id}/inspect", deliveryId)
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inspReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("INSPECTED"));

        // Verify InventoryLot was created with balance 45.00 KG
        List<InventoryLot> lots = lotRepository.findByEnterpriseId(enterpriseA.getId());
        assertThat(lots).isNotEmpty();
        InventoryLot lot = lots.stream()
                .filter(l -> l.getSourceDeliveryItem() != null && l.getSourceDeliveryItem().getId().equals(itemId))
                .findFirst()
                .orElseThrow();

        assertThat(lot.getBalanceQty()).isEqualByComparingTo("45.00");
        assertThat(lot.getReceivedQty()).isEqualByComparingTo("45.00");
        assertThat(lot.getStatus()).isEqualTo(LotStatus.ACTIVE);
        assertThat(lot.getGrade()).isEqualTo("GRADE_A");

        // Verify movement
        var movements = movementRepository.findByLotIdOrderByCreatedAtAsc(lot.getId());
        assertThat(movements).hasSize(1);
        assertThat(movements.get(0).getQuantity()).isEqualByComparingTo("45.00");
        assertThat(movements.get(0).getBalanceAfter()).isEqualByComparingTo("45.00");

        // Verify payable created
        var payables = payableRepository.findAllByEnterpriseIdOrderByCreatedAtDesc(enterpriseA.getId());
        assertThat(payables).isNotEmpty();
        assertThat(payables.get(0).getAmountDue()).isEqualByComparingTo("9000.00"); // 45 * 200
    }

    @Test
    @DisplayName("B-502, B-503, B-505: Lot lifecycle (adjust, transfer, dispose) and reconciliation check")
    void testLotLifecycleAdjustTransferDisposeAndReconcile() throws Exception {
        // Setup locations
        InventoryLocation loc1 = new InventoryLocation();
        loc1.setEnterprise(enterpriseA);
        loc1.setName("Receiving Bay");
        loc1.setLocationType("BAY");
        loc1 = locationRepository.save(loc1);

        InventoryLocation loc2 = new InventoryLocation();
        loc2.setEnterprise(enterpriseA);
        loc2.setName("Storage Rack 1");
        loc2.setLocationType("SHELF");
        loc2 = locationRepository.save(loc2);

        // Create base lot directly via service
        InventoryLot lot = inventoryService.receiveLot(
                enterpriseA,
                loc1,
                coffeeProductType,
                null,
                "GRADE_A",
                new BigDecimal("100.00"),
                "KG",
                "Direct receipt",
                enterpriseOwnerA
        );

        UUID lotId = lot.getId();

        // 1. Adjustment: +10 KG
        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/inventory/lots/{lotId}/adjustments", enterpriseA.getId(), lotId)
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InventoryAdjustmentRequest(new BigDecimal("10.00"), "Found extra bags"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.balanceAfter").value(110.00));

        // 2. Overdraw adjustment: -120 KG should fail with 422
        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/inventory/lots/{lotId}/adjustments", enterpriseA.getId(), lotId)
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InventoryAdjustmentRequest(new BigDecimal("-120.00"), "Huge loss"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("INSUFFICIENT_STOCK")));

        // 3. Transfer: 30 KG to loc2
        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/inventory/lots/{lotId}/transfers", enterpriseA.getId(), lotId)
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InventoryTransferRequest(loc2.getId(), new BigDecimal("30.00"), "Move to shelf"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.balanceAfter").value(80.00));

        // 4. Disposal: 5 KG damaged
        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/inventory/lots/{lotId}/disposals", enterpriseA.getId(), lotId)
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new InventoryDisposalRequest(new BigDecimal("5.00"), "Damaged by rain"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.balanceAfter").value(75.00));

        // 5. Reconcile: initial 100 + 10 - 30 - 5 = 75.00
        mockMvc.perform(get("/api/v1/enterprises/{enterpriseId}/inventory/lots/{lotId}/reconciliation", enterpriseA.getId(), lotId)
                        .header("Authorization", "Bearer " + enterpriseTokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.storedBalance").value(75.00))
                .andExpect(jsonPath("$.data.movementSum").value(75.00))
                .andExpect(jsonPath("$.data.reconciled").value(true));
    }

    @Test
    @DisplayName("B-505: Broken reconciliation detection when balance is out of sync")
    void testBrokenReconciliationDetection() {
        InventoryLocation loc = new InventoryLocation();
        loc.setEnterprise(enterpriseA);
        loc.setName("Warehouse X");
        loc.setLocationType("WAREHOUSE");
        loc = locationRepository.save(loc);

        InventoryLot lot = inventoryService.receiveLot(
                enterpriseA,
                loc,
                coffeeProductType,
                null,
                "GRADE_A",
                new BigDecimal("50.00"),
                "KG",
                "Initial stock",
                enterpriseOwnerA
        );

        // Intentionally break balance on the lot entity
        lot.setBalanceQty(new BigDecimal("999.00"));
        lotRepository.save(lot);

        ReconciliationReportResponse report = inventoryService.reconcileLotBalance(lot.getId());
        assertThat(report.reconciled()).isFalse();
        assertThat(report.storedBalance()).isEqualByComparingTo("999.00");
        assertThat(report.movementSum()).isEqualByComparingTo("50.00");
    }

    @Test
    @DisplayName("B-506: Concurrent consumption on same lot prevents negative balance and overdraw")
    void testConcurrentLotConsumption() throws Exception {
        InventoryLocation loc = new InventoryLocation();
        loc.setEnterprise(enterpriseA);
        loc.setName("Batching Bay");
        loc.setLocationType("WAREHOUSE");
        loc = locationRepository.save(loc);

        // Initial lot with 50.00 KG balance
        InventoryLot lot = inventoryService.receiveLot(
                enterpriseA,
                loc,
                coffeeProductType,
                null,
                "GRADE_A",
                new BigDecimal("50.00"),
                "KG",
                "Initial batch",
                enterpriseOwnerA
        );

        // 10 concurrent threads each try to consume 15.00 KG
        // Total requested = 150.00 KG, but only 50.00 KG available.
        // Exactly 3 threads should succeed (consuming 3 * 15 = 45.00 KG), leaving 5.00 KG.
        // 7 threads should fail with INSUFFICIENT_STOCK.
        var result = ConcurrencyTestHelper.executeConcurrently(10, index -> {
            inventoryService.consume(
                    lot.getId(),
                    new BigDecimal("15.00"),
                    "TEST_BATCH",
                    UUID.randomUUID(),
                    "Batch processing thread " + index,
                    enterpriseOwnerA
            );
        });

        assertThat(result.successCount()).isEqualTo(3);
        assertThat(result.exceptions()).hasSize(7);

        InventoryLot updatedLot = lotRepository.findById(lot.getId()).orElseThrow();
        assertThat(updatedLot.getBalanceQty()).isEqualByComparingTo("5.00");
        assertThat(updatedLot.getBalanceQty()).isGreaterThanOrEqualTo(BigDecimal.ZERO);

        ReconciliationReportResponse reconciliation = inventoryService.reconcileLotBalance(lot.getId());
        assertThat(reconciliation.reconciled()).isTrue();
        assertThat(reconciliation.movementSum()).isEqualByComparingTo("5.00");
    }
}
