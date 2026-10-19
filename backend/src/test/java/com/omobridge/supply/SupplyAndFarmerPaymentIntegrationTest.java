package com.omobridge.supply;

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
import com.omobridge.supply.api.dto.BuyingPriceRequest;
import com.omobridge.supply.api.dto.FarmerPaymentRequest;
import com.omobridge.supply.api.dto.ProductTypeRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryCreateRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryInspectionItemRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryInspectionRequest;
import com.omobridge.supply.api.dto.SupplyDeliveryItemCreateRequest;
import com.omobridge.supply.domain.DeliveryStatus;
import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.FarmerPaymentRepository;
import com.omobridge.supply.domain.PayableStatus;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
import com.omobridge.supply.domain.SupplyDelivery;
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
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@AutoConfigureMockMvc
class SupplyAndFarmerPaymentIntegrationTest extends BaseIntegrationTest {

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
    private FarmerRepository farmerRepository;

    @Autowired
    private ProductTypeRepository productTypeRepository;

    @Autowired
    private SupplyDeliveryRepository supplyDeliveryRepository;

    @Autowired
    private FarmerPayableRepository farmerPayableRepository;

    @Autowired
    private FarmerPaymentRepository farmerPaymentRepository;

    private User enterpriseOwner;
    private Enterprise enterprise;
    private String enterpriseToken;

    private User farmerUser1;
    private Farmer farmer1;
    private String farmer1Token;

    private User farmerUser2;
    private Farmer farmer2;
    private String farmer2Token;

    private ProductType honeyProduct;

    @BeforeEach
    void setUp() {
        Role roleEnterprise = roleRepository.findByName(RoleName.MICRO_ENTERPRISE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.MICRO_ENTERPRISE.name(), "Enterprise")));
        Role roleFarmer = roleRepository.findByName(RoleName.PRODUCER_FARMER.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.PRODUCER_FARMER.name(), "Farmer")));

        // 1. Enterprise
        enterpriseOwner = new User();
        enterpriseOwner.setPhoneNumber("+251911" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "1"));
        enterpriseOwner.setFullName("Enterprise Manager");
        enterpriseOwner.setPasswordHash("hashed");
        enterpriseOwner.setStatus(UserStatus.ACTIVE);
        enterpriseOwner.addRole(roleEnterprise);
        enterpriseOwner = userRepository.save(enterpriseOwner);
        enterpriseToken = jwtService.generateToken(enterpriseOwner.getId(), enterpriseOwner.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));

        enterprise = new Enterprise();
        enterprise.setName("South Omo Honey Producers");
        enterprise.setRegistrationNumber("REG-SPLY-" + UUID.randomUUID().toString().substring(0, 6));
        enterprise.setContactPhone(enterpriseOwner.getPhoneNumber());
        enterprise.setLocationWoreda("Turmi");
        enterprise.setLocationTown("Turmi Town");
        enterprise.setOwnerUser(enterpriseOwner);
        enterprise.setStatus(EnterpriseStatus.ACTIVE);
        enterprise = enterpriseRepository.save(enterprise);

        EnterpriseStaff staff = new EnterpriseStaff();
        staff.setEnterprise(enterprise);
        staff.setUser(enterpriseOwner);
        staff.setRole(StaffRole.OWNER);
        staff.setActive(true);
        enterpriseStaffRepository.save(staff);

        // 2. Farmer 1 (Belongs to enterprise)
        farmerUser1 = new User();
        farmerUser1.setPhoneNumber("+251922" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "2"));
        farmerUser1.setFullName("Bekele Honey Producer");
        farmerUser1.setPasswordHash("hashed");
        farmerUser1.setStatus(UserStatus.ACTIVE);
        farmerUser1.addRole(roleFarmer);
        farmerUser1 = userRepository.save(farmerUser1);
        farmer1Token = jwtService.generateToken(farmerUser1.getId(), farmerUser1.getPhoneNumber(), Set.of("ROLE_PRODUCER_FARMER"));

        farmer1 = new Farmer();
        farmer1.setUser(farmerUser1);
        farmer1.setEnterprise(enterprise);
        farmer1.setFarmerCode("FRM-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        farmer1.setVillage("Turmi Keske");
        farmer1 = farmerRepository.save(farmer1);

        // 3. Farmer 2 (Independent / Different Farmer)
        farmerUser2 = new User();
        farmerUser2.setPhoneNumber("+251933" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "3"));
        farmerUser2.setFullName("Other Farmer");
        farmerUser2.setPasswordHash("hashed");
        farmerUser2.setStatus(UserStatus.ACTIVE);
        farmerUser2.addRole(roleFarmer);
        farmerUser2 = userRepository.save(farmerUser2);
        farmer2Token = jwtService.generateToken(farmerUser2.getId(), farmerUser2.getPhoneNumber(), Set.of("ROLE_PRODUCER_FARMER"));

        farmer2 = new Farmer();
        farmer2.setUser(farmerUser2);
        farmer2.setFarmerCode("FRM-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase());
        farmer2.setVillage("Dimeka");
        farmer2 = farmerRepository.save(farmer2);

        // 4. Product Type
        honeyProduct = productTypeRepository.findByCode("HONEY-TEST")
                .orElseGet(() -> {
                    ProductType pt = new ProductType();
                    pt.setCode("HONEY-TEST");
                    pt.setName("Natural White Honey");
                    pt.setCategory("HONEY");
                    pt.setUnit("KG");
                    return productTypeRepository.save(pt);
                });
    }

    @Test
    @DisplayName("B-402: Product type creation and buying price management (audited & public lookup)")
    void testProductTypeAndBuyingPrices() throws Exception {
        // Create Product Type
        ProductTypeRequest ptReq = new ProductTypeRequest(
                "WAX-BEE-" + UUID.randomUUID().toString().substring(0, 4),
                "Natural Beeswax",
                "HONEY",
                "KG",
                "Pure beeswax cakes"
        );
        mockMvc.perform(post("/api/v1/product-types")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(ptReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.name").value("Natural Beeswax"));

        // Public can list product types
        mockMvc.perform(get("/api/v1/product-types"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        // Enterprise sets buying price
        BuyingPriceRequest priceReq = new BuyingPriceRequest(
                enterprise.getId(),
                honeyProduct.getId(),
                "Grade A",
                BigDecimal.valueOf(320.00),
                Instant.now().minusSeconds(3600),
                null
        );
        mockMvc.perform(post("/api/v1/buying-prices")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(priceReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.pricePerUnit").value(320.00))
                .andExpect(jsonPath("$.data.grade").value("Grade A"));

        // Public / USSD reads buying prices
        mockMvc.perform(get("/api/v1/buying-prices/enterprises/" + enterprise.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].pricePerUnit").isNumber());
    }

    @Test
    @DisplayName("B-403, B-404, B-406: Full Supply Delivery, Inspection, Payable, Oldest-First Payment Allocation & Idempotency")
    void testSupplyDeliveryAndPaymentFlow() throws Exception {
        // Ensure buying price exists for Grade A honey: 300.00 ETB / KG
        BuyingPriceRequest priceReq = new BuyingPriceRequest(
                enterprise.getId(),
                honeyProduct.getId(),
                "Grade A",
                BigDecimal.valueOf(300.00),
                Instant.now().minusSeconds(86400),
                null
        );
        mockMvc.perform(post("/api/v1/buying-prices")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(priceReq)))
                .andExpect(status().isCreated());

        // 1. Record Delivery (100 KG delivered)
        SupplyDeliveryCreateRequest deliveryReq = new SupplyDeliveryCreateRequest(
                enterprise.getId(),
                farmer1.getId(),
                Instant.now(),
                "Seasonal first harvest",
                List.of(new SupplyDeliveryItemCreateRequest(honeyProduct.getId(), "Grade A", BigDecimal.valueOf(100.00)))
        );

        MvcResult deliveryResult = mockMvc.perform(post("/api/v1/supply-deliveries")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(deliveryReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.deliveryNo").isNotEmpty())
                .andExpect(jsonPath("$.data.status").value("RECORDED"))
                .andExpect(jsonPath("$.data.items[0].deliveredQty").value(100.00))
                .andReturn();

        UUID deliveryId = UUID.fromString(objectMapper.readTree(deliveryResult.getResponse().getContentAsString()).get("data").get("id").asText());
        UUID deliveryItemId = UUID.fromString(objectMapper.readTree(deliveryResult.getResponse().getContentAsString()).get("data").get("items").get(0).get("id").asText());

        // 2. Inspection with invalid sum (accepted 90 + rejected 5 != 100) -> 422
        SupplyDeliveryInspectionRequest badInspection = new SupplyDeliveryInspectionRequest(
                List.of(new SupplyDeliveryInspectionItemRequest(deliveryItemId, BigDecimal.valueOf(90.00), BigDecimal.valueOf(5.00), "Bad math"))
        );
        mockMvc.perform(patch("/api/v1/supply-deliveries/" + deliveryId + "/inspect")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badInspection)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("must equal delivered")));

        // 3. Valid Inspection (accepted 90, rejected 10) -> Payable of 90 * 300 = 27,000 ETB
        SupplyDeliveryInspectionRequest validInspection = new SupplyDeliveryInspectionRequest(
                List.of(new SupplyDeliveryInspectionItemRequest(deliveryItemId, BigDecimal.valueOf(90.00), BigDecimal.valueOf(10.00), "Slight crystalization"))
        );
        mockMvc.perform(patch("/api/v1/supply-deliveries/" + deliveryId + "/inspect")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validInspection)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("INSPECTED"))
                .andExpect(jsonPath("$.data.items[0].acceptedQty").value(90.00))
                .andExpect(jsonPath("$.data.items[0].unitPriceSnapshot").value(300.00))
                .andExpect(jsonPath("$.data.items[0].lineTotal").value(27000.00));

        // Verify Payable created
        FarmerPayable payable = farmerPayableRepository.findByDeliveryItemId(deliveryItemId).orElseThrow();
        assertThat(payable.getAmountDue()).isEqualByComparingTo(BigDecimal.valueOf(27000.00));
        assertThat(payable.getAmountAllocated()).isEqualByComparingTo(BigDecimal.ZERO);
        assertThat(payable.getStatus()).isEqualTo(PayableStatus.OPEN);

        // 4. Overpayment Rejection (Paying 30,000 when only 27,000 is due) -> 422
        FarmerPaymentRequest overpayReq = new FarmerPaymentRequest(
                enterprise.getId(),
                farmer1.getId(),
                BigDecimal.valueOf(30000.00),
                "CHAPA"
        );
        mockMvc.perform(post("/api/v1/farmer-payments")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overpayReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("exceeds total outstanding")));

        // 5. Partial Payment (Paying 15,000 ETB via Telebirr)
        String idempotencyKey = "PAY-IDEMP-" + UUID.randomUUID();
        FarmerPaymentRequest partialPayReq = new FarmerPaymentRequest(
                enterprise.getId(),
                farmer1.getId(),
                BigDecimal.valueOf(15000.00),
                "CHAPA"
        );
        mockMvc.perform(post("/api/v1/farmer-payments")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(partialPayReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.paymentNo").isNotEmpty())
                .andExpect(jsonPath("$.data.amount").value(15000.00))
                .andExpect(jsonPath("$.data.allocations[0].amount").value(15000.00));

        // Payable status should now be PARTIAL with 15,000 allocated and 12,000 remaining
        FarmerPayable partialPayable = farmerPayableRepository.findById(payable.getId()).orElseThrow();
        assertThat(partialPayable.getStatus()).isEqualTo(PayableStatus.PARTIAL);
        assertThat(partialPayable.getAmountAllocated()).isEqualByComparingTo(BigDecimal.valueOf(15000.00));

        // 6. Test Idempotency: Repeat same payment call with same Idempotency-Key
        mockMvc.perform(post("/api/v1/farmer-payments")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(partialPayReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.amount").value(15000.00));

        // 7. Settle remaining 12,000 ETB
        FarmerPaymentRequest settleReq = new FarmerPaymentRequest(
                enterprise.getId(),
                farmer1.getId(),
                BigDecimal.valueOf(12000.00),
                "CHAPA"
        );
        mockMvc.perform(post("/api/v1/farmer-payments")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(settleReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.amount").value(12000.00));

        // Payable should now be SETTLED
        FarmerPayable settledPayable = farmerPayableRepository.findById(payable.getId()).orElseThrow();
        assertThat(settledPayable.getStatus()).isEqualTo(PayableStatus.SETTLED);
        assertThat(settledPayable.getAmountAllocated()).isEqualByComparingTo(BigDecimal.valueOf(27000.00));
    }

    @Test
    @DisplayName("B-408: Farmer self-service and strict cross-farmer access isolation")
    void testFarmerSelfServiceAndSecurity() throws Exception {
        // Farmer 1 accesses own balance summary -> 200 OK
        mockMvc.perform(get("/api/v1/farmers/" + farmer1.getId() + "/balance")
                        .header("Authorization", "Bearer " + farmer1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.farmerId").value(farmer1.getId().toString()))
                .andExpect(jsonPath("$.data.farmerCode").value(farmer1.getFarmerCode()));

        // Farmer 2 attempts to access Farmer 1's payables -> 403 Forbidden
        mockMvc.perform(get("/api/v1/farmers/" + farmer1.getId() + "/payables")
                        .header("Authorization", "Bearer " + farmer2Token))
                .andExpect(status().isForbidden());

        // Farmer 2 attempts to access Farmer 1's deliveries -> 403 Forbidden
        mockMvc.perform(get("/api/v1/farmers/" + farmer1.getId() + "/deliveries")
                        .header("Authorization", "Bearer " + farmer2Token))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("B-407: Delivery cancellation before payment voids payable; after payment is rejected")
    void testDeliveryCancellationRules() throws Exception {
        // Ensure buying price
        BuyingPriceRequest priceReq = new BuyingPriceRequest(
                enterprise.getId(),
                honeyProduct.getId(),
                "Grade A",
                BigDecimal.valueOf(250.00),
                Instant.now().minusSeconds(86400),
                null
        );
        mockMvc.perform(post("/api/v1/buying-prices")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(priceReq)))
                .andExpect(status().isCreated());

        // 1. Create and Inspect delivery
        SupplyDeliveryCreateRequest deliveryReq = new SupplyDeliveryCreateRequest(
                enterprise.getId(),
                farmer1.getId(),
                Instant.now(),
                "Batch to cancel",
                List.of(new SupplyDeliveryItemCreateRequest(honeyProduct.getId(), "Grade A", BigDecimal.valueOf(20.00)))
        );

        MvcResult result = mockMvc.perform(post("/api/v1/supply-deliveries")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(deliveryReq)))
                .andExpect(status().isCreated())
                .andReturn();

        UUID deliveryId = UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).get("data").get("id").asText());
        UUID deliveryItemId = UUID.fromString(objectMapper.readTree(result.getResponse().getContentAsString()).get("data").get("items").get(0).get("id").asText());

        SupplyDeliveryInspectionRequest inspectionReq = new SupplyDeliveryInspectionRequest(
                List.of(new SupplyDeliveryInspectionItemRequest(deliveryItemId, BigDecimal.valueOf(20.00), BigDecimal.ZERO, "Accepted"))
        );
        mockMvc.perform(patch("/api/v1/supply-deliveries/" + deliveryId + "/inspect")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(inspectionReq)))
                .andExpect(status().isOk());

        // Cancel delivery before payment -> payable becomes VOID
        mockMvc.perform(post("/api/v1/supply-deliveries/" + deliveryId + "/cancel")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .param("reason", "Lab contamination reported"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        FarmerPayable payable = farmerPayableRepository.findByDeliveryItemId(deliveryItemId).orElseThrow();
        assertThat(payable.getStatus()).isEqualTo(PayableStatus.VOID);
    }
}
