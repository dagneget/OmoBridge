package com.omobridge.products;

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
import com.omobridge.inventory.service.InventoryService;
import com.omobridge.products.api.dto.ProductCreateFromOutputRequest;
import com.omobridge.products.api.dto.ProductResponse;
import com.omobridge.products.api.dto.ProductStockAdjustmentRequest;
import com.omobridge.products.domain.Product;
import com.omobridge.products.domain.ProductRepository;
import com.omobridge.products.domain.ProductStockMovementRepository;
import com.omobridge.products.service.ProductService;
import com.omobridge.supply.domain.DeliveryStatus;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
import com.omobridge.supply.domain.SupplyDelivery;
import com.omobridge.supply.domain.SupplyDeliveryItem;
import com.omobridge.supply.domain.SupplyDeliveryRepository;
import com.omobridge.traceability.api.dto.ProductionBatchCreateRequest;
import com.omobridge.traceability.api.dto.ProductionInputRequest;
import com.omobridge.traceability.api.dto.ProductionOutputRequest;
import com.omobridge.traceability.domain.ProductionBatch;
import com.omobridge.traceability.domain.ProductionOutput;
import com.omobridge.traceability.service.ProductionBatchService;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@AutoConfigureMockMvc
class ProductAndCatalogIntegrationTest extends BaseIntegrationTest {

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
    private ProductRepository productRepository;

    @Autowired
    private ProductStockMovementRepository stockMovementRepository;

    @Autowired
    private InventoryService inventoryService;

    @Autowired
    private ProductionBatchService batchService;

    @Autowired
    private ProductService productService;

    private User enterpriseOwnerA;
    private User enterpriseOwnerB;
    private Enterprise enterpriseA;
    private Enterprise enterpriseB;
    private String enterpriseTokenA;
    private String enterpriseTokenB;

    private ProductType rawHoney;
    private ProductType packagedHoney;
    private InventoryLocation warehouseLocation;
    private Farmer farmer;
    private ProductionOutput productionOutput;

    @BeforeEach
    void setUp() {
        Role roleEnterprise = roleRepository.findByName(RoleName.MICRO_ENTERPRISE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.MICRO_ENTERPRISE.name(), "Enterprise")));
        Role roleFarmer = roleRepository.findByName(RoleName.PRODUCER_FARMER.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.PRODUCER_FARMER.name(), "Farmer")));

        // Enterprise A
        enterpriseOwnerA = new User();
        enterpriseOwnerA.setPhoneNumber("+251911" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "7"));
        enterpriseOwnerA.setFullName("Enterprise Owner A");
        enterpriseOwnerA.setPasswordHash("hashed");
        enterpriseOwnerA.setStatus(UserStatus.ACTIVE);
        enterpriseOwnerA.addRole(roleEnterprise);
        enterpriseOwnerA = userRepository.save(enterpriseOwnerA);
        enterpriseTokenA = jwtService.generateToken(enterpriseOwnerA.getId(), enterpriseOwnerA.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));

        enterpriseA = new Enterprise();
        enterpriseA.setName("Mursi Honey Cooperative");
        enterpriseA.setRegistrationNumber("REG-CAT-A-" + UUID.randomUUID().toString().substring(0, 6));
        enterpriseA.setContactPhone(enterpriseOwnerA.getPhoneNumber());
        enterpriseA.setLocationWoreda("Salamago");
        enterpriseA.setLocationTown("Hana");
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
        enterpriseOwnerB.setPhoneNumber("+251911" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "8"));
        enterpriseOwnerB.setFullName("Enterprise Owner B");
        enterpriseOwnerB.setPasswordHash("hashed");
        enterpriseOwnerB.setStatus(UserStatus.ACTIVE);
        enterpriseOwnerB.addRole(roleEnterprise);
        enterpriseOwnerB = userRepository.save(enterpriseOwnerB);
        enterpriseTokenB = jwtService.generateToken(enterpriseOwnerB.getId(), enterpriseOwnerB.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));

        enterpriseB = new Enterprise();
        enterpriseB.setName("Hamers Wild Spices Enterprise");
        enterpriseB.setRegistrationNumber("REG-CAT-B-" + UUID.randomUUID().toString().substring(0, 6));
        enterpriseB.setContactPhone(enterpriseOwnerB.getPhoneNumber());
        enterpriseB.setLocationWoreda("Dimeka");
        enterpriseB.setLocationTown("Turmi");
        enterpriseB.setOwnerUser(enterpriseOwnerB);
        enterpriseB.setStatus(EnterpriseStatus.ACTIVE);
        enterpriseB = enterpriseRepository.save(enterpriseB);

        EnterpriseStaff staffB = new EnterpriseStaff();
        staffB.setEnterprise(enterpriseB);
        staffB.setUser(enterpriseOwnerB);
        staffB.setRole(StaffRole.OWNER);
        staffB.setActive(true);
        enterpriseStaffRepository.save(staffB);

        warehouseLocation = new InventoryLocation();
        warehouseLocation.setEnterprise(enterpriseA);
        warehouseLocation.setName("Hana Bottling Center");
        warehouseLocation.setLocationType("PROCESSING_FACILITY");
        warehouseLocation = locationRepository.save(warehouseLocation);

        rawHoney = productTypeRepository.findByCode("RAW-HONEY-CAT")
                .orElseGet(() -> {
                    ProductType pt = new ProductType();
                    pt.setCode("RAW-HONEY-CAT");
                    pt.setName("Raw Forest Honey");
                    pt.setCategory("RAW_MATERIAL");
                    pt.setUnit("KG");
                    return productTypeRepository.save(pt);
                });

        packagedHoney = productTypeRepository.findByCode("JAR-HONEY-CAT")
                .orElseGet(() -> {
                    ProductType pt = new ProductType();
                    pt.setCode("JAR-HONEY-CAT");
                    pt.setName("500g Jar Pure White Honey");
                    pt.setCategory("PROCESSED_FOOD");
                    pt.setUnit("JAR");
                    return productTypeRepository.save(pt);
                });

        User farmerUser = new User();
        farmerUser.setPhoneNumber("+251922" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "9"));
        farmerUser.setFullName("Lalisho Bula");
        farmerUser.setPasswordHash("hashed");
        farmerUser.setStatus(UserStatus.ACTIVE);
        farmerUser.addRole(roleFarmer);
        farmerUser = userRepository.save(farmerUser);

        farmer = new Farmer();
        farmer.setUser(farmerUser);
        farmer.setEnterprise(enterpriseA);
        farmer.setFarmerCode("FRM-LALISHO-" + UUID.randomUUID().toString().substring(0, 4));
        farmer.setVillage("Mago River Basin");
        farmer.setKebele("Hana 01");
        farmer.setConsentPublicName(true);
        farmer = farmerRepository.save(farmer);

        // Create delivery and inventory lot
        SupplyDelivery delivery = new SupplyDelivery();
        delivery.setDeliveryNo("DEL-" + UUID.randomUUID().toString().substring(0, 8));
        delivery.setEnterprise(enterpriseA);
        delivery.setFarmer(farmer);
        delivery.setReceivedByUser(enterpriseOwnerA);
        delivery.setDeliveredAt(Instant.now());
        delivery.setStatus(DeliveryStatus.INSPECTED);

        SupplyDeliveryItem item = new SupplyDeliveryItem();
        item.setProductType(rawHoney);
        item.setGrade("GRADE_A");
        item.setDeliveredQty(new BigDecimal("100.00"));
        item.setAcceptedQty(new BigDecimal("100.00"));
        item.setRejectedQty(BigDecimal.ZERO);
        item.setUnitPriceSnapshot(new BigDecimal("180.00")); // 180 ETB per KG
        item.setLineTotal(new BigDecimal("18000.00"));
        delivery.addItem(item);
        delivery = deliveryRepository.save(delivery);

        InventoryLot rawLot = inventoryService.receiveLot(
                enterpriseA,
                warehouseLocation,
                rawHoney,
                delivery.getItems().get(0),
                "GRADE_A",
                new BigDecimal("100.00"),
                "KG",
                "Raw honey intake",
                enterpriseOwnerA
        );

        // Create production batch producing 200 JARS of 500g honey from 100 KG raw honey
        var batchResp = batchService.createBatch(
                enterpriseA.getId(),
                new ProductionBatchCreateRequest(
                        enterpriseA.getId(),
                        new BigDecimal("1000.00"), // labor cost
                        new BigDecimal("400.00"),  // processing cost
                        new BigDecimal("600.00"),  // packaging cost
                        "Honey filtering and bottling into 500g glass jars",
                        List.of(new ProductionInputRequest(rawLot.getId(), new BigDecimal("100.00"), "KG")),
                        List.of(new ProductionOutputRequest(packagedHoney.getId(), new BigDecimal("200.00"), "JAR", "PREMIUM", true, warehouseLocation.getId())),
                        null,
                        true,
                        "Mago River Basin",
                        "Mursi Honey Cooperative",
                        "Pure single-origin white honey from wild bees in Mago National Park.",
                        true
                ),
                enterpriseOwnerA
        );

        var batch = batchService.getBatchById(batchResp.id(), enterpriseA.getId());
        productionOutput = new ProductionOutput();
        productionOutput.setId(batch.outputs().get(0).id());
        productionOutput.setQuantity(batch.outputs().get(0).quantity());
        productionOutput.setUnit(batch.outputs().get(0).unit());
        productionOutput.setProductType(packagedHoney);
    }

    @Test
    @DisplayName("B-701, B-702, B-703: Create product from output with automated price breakdown and stock constraint check")
    void testCreateProductFromOutputAndPriceBreakdown() throws Exception {
        // 1. Initial stock exceeding production output (250 > 200) fails with 422
        ProductCreateFromOutputRequest invalidStockReq = new ProductCreateFromOutputRequest(
                productionOutput.getId(),
                "HONEY-500G",
                "Mursi Wild Forest Honey 500g",
                "Raw unfiltered organic honey",
                "Harvested sustainably by Mursi tribal beekeepers.",
                "HONEY",
                new BigDecimal("0.50"), // 0.5 KG pack
                new BigDecimal("250.00"), // exceeds 200 available
                new BigDecimal("10.00"), // transport cost
                new BigDecimal("0.20"), // 20% margin
                true
        );

        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/products", enterpriseA.getId())
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidStockReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("STOCK_EXCEEDS_OUTPUT")));

        // 2. Valid creation: 200 jars
        ProductCreateFromOutputRequest validReq = new ProductCreateFromOutputRequest(
                productionOutput.getId(),
                "HONEY-500G",
                "Mursi Wild Forest Honey 500g",
                "Raw unfiltered organic honey",
                "Harvested sustainably by Mursi tribal beekeepers.",
                "HONEY",
                new BigDecimal("0.50"),
                new BigDecimal("200.00"),
                new BigDecimal("15.00"), // transport
                new BigDecimal("0.15"), // 15% margin
                true // published immediately
        );

        MvcResult result = mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/products", enterpriseA.getId())
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.sku").value("HONEY-500G"))
                .andExpect(jsonPath("$.data.stockOnHand").value(200.00))
                .andExpect(jsonPath("$.data.published").value(true))
                .andExpect(jsonPath("$.data.priceBreakdown").isMap())
                .andExpect(jsonPath("$.data.priceBreakdown.totalPrice").isNumber())
                .andReturn();

        ProductResponse created = objectMapper.readValue(
                objectMapper.readTree(result.getResponse().getContentAsString()).path("data").toString(),
                ProductResponse.class
        );

        // Verify transparent price breakdown lines sum up correctly
        var pb = created.priceBreakdown();
        assertThat(pb).isNotNull();
        assertThat(pb.purchaseCost()).isGreaterThan(BigDecimal.ZERO);
        assertThat(pb.processingCost()).isGreaterThan(BigDecimal.ZERO);
        assertThat(pb.packagingCost()).isGreaterThan(BigDecimal.ZERO);
        assertThat(pb.laborCost()).isGreaterThan(BigDecimal.ZERO);
        assertThat(pb.enterpriseMargin()).isGreaterThan(BigDecimal.ZERO);
        assertThat(pb.communityFund()).isGreaterThan(BigDecimal.ZERO);
        assertThat(pb.taxAmount()).isGreaterThan(BigDecimal.ZERO);
        assertThat(pb.platformFee()).isGreaterThan(BigDecimal.ZERO);

        BigDecimal sumOfParts = pb.purchaseCost()
                .add(pb.processingCost())
                .add(pb.packagingCost())
                .add(pb.laborCost())
                .add(pb.transportCost())
                .add(pb.enterpriseMargin())
                .add(pb.communityFund())
                .add(pb.taxAmount())
                .add(pb.platformFee());

        assertThat(created.unitPrice()).isEqualByComparingTo(sumOfParts);
        assertThat(pb.totalPrice()).isEqualByComparingTo(created.unitPrice());
    }

    @Test
    @DisplayName("B-704: Public catalog search, filter, and visibility rules (unpublished hidden)")
    void testPublicCatalogSearchFilterAndVisibility() throws Exception {
        // Create 2 products: 1 published, 1 unpublished
        ProductCreateFromOutputRequest pubReq = new ProductCreateFromOutputRequest(
                productionOutput.getId(),
                "PUB-HONEY",
                "Pure Wild Forest Honey Jar",
                "Delicious golden sweet honey",
                "Mursi story",
                "HONEY",
                new BigDecimal("1.00"),
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                new BigDecimal("0.10"),
                true // published
        );

        ProductCreateFromOutputRequest unpubReq = new ProductCreateFromOutputRequest(
                productionOutput.getId(),
                "UNPUB-HONEY",
                "Secret Reserve Honey Draft",
                "Experimental honey",
                "Private story",
                "HONEY",
                new BigDecimal("1.00"),
                new BigDecimal("50.00"),
                BigDecimal.ZERO,
                new BigDecimal("0.10"),
                false // NOT published
        );

        var pubProduct = productService.createProductFromOutput(enterpriseA.getId(), pubReq, enterpriseOwnerA);
        var unpubProduct = productService.createProductFromOutput(enterpriseA.getId(), unpubReq, enterpriseOwnerA);

        // 1. Public catalog listing contains published product, but NOT unpublished
        mockMvc.perform(get("/api/v1/public/products"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[*].sku").value(org.hamcrest.Matchers.hasItem("PUB-HONEY")))
                .andExpect(jsonPath("$.data[*].sku").value(org.hamcrest.Matchers.not(org.hamcrest.Matchers.hasItem("UNPUB-HONEY"))));

        // 2. Direct public detail for published product -> 200
        mockMvc.perform(get("/api/v1/public/products/{id}", pubProduct.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Pure Wild Forest Honey Jar"))
                .andExpect(jsonPath("$.data.priceBreakdown").isMap());

        // 3. Direct public detail for unpublished product -> 404
        mockMvc.perform(get("/api/v1/public/products/{id}", unpubProduct.id()))
                .andExpect(status().isNotFound());

        // 4. Keyword search
        mockMvc.perform(get("/api/v1/public/products").param("search", "golden sweet"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].sku").value("PUB-HONEY"));

        // 5. Category filter
        mockMvc.perform(get("/api/v1/public/products").param("category", "HONEY"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].category").value("HONEY"));
    }

    @Test
    @DisplayName("B-705: Stock adjustments and multi-tenant security isolation")
    void testStockAdjustmentsAndSecurity() throws Exception {
        ProductCreateFromOutputRequest req = new ProductCreateFromOutputRequest(
                productionOutput.getId(),
                "STOCK-HONEY",
                "Stock Check Honey",
                "Desc", "Story", "HONEY",
                new BigDecimal("1.00"),
                new BigDecimal("50.00"),
                BigDecimal.ZERO, BigDecimal.ZERO, true
        );
        var prod = productService.createProductFromOutput(enterpriseA.getId(), req, enterpriseOwnerA);

        // 1. Enterprise B staff gets 403 trying to adjust Enterprise A's product
        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/products/{productId}/adjust-stock", enterpriseA.getId(), prod.id())
                        .header("Authorization", "Bearer " + enterpriseTokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductStockAdjustmentRequest(new BigDecimal("10.00"), "Intrusion"))))
                .andExpect(status().isForbidden());

        // 2. Enterprise A adjusts stock (+10) -> 60
        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/products/{productId}/adjust-stock", enterpriseA.getId(), prod.id())
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductStockAdjustmentRequest(new BigDecimal("10.00"), "Found extra cartons"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.stockAfter").value(60.00));

        // 3. Negative overdraw adjustment (-70) fails with 422
        mockMvc.perform(post("/api/v1/enterprises/{enterpriseId}/products/{productId}/adjust-stock", enterpriseA.getId(), prod.id())
                        .header("Authorization", "Bearer " + enterpriseTokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ProductStockAdjustmentRequest(new BigDecimal("-70.00"), "Breakage"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("NEGATIVE_STOCK")));
    }
}
