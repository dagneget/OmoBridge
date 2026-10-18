package com.omobridge.identity;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.common.BaseIntegrationTest;
import com.omobridge.common.security.JwtService;
import com.omobridge.identity.api.dto.BuyerRegisterRequest;
import com.omobridge.identity.api.dto.DeliveryProviderRegisterRequest;
import com.omobridge.identity.api.dto.EnterpriseRegisterRequest;
import com.omobridge.identity.api.dto.GuideRegisterRequest;
import com.omobridge.identity.api.dto.LoginRequest;
import com.omobridge.identity.api.dto.ProducerRegisterRequest;
import com.omobridge.identity.domain.DeliveryProvider;
import com.omobridge.identity.domain.DeliveryProviderRepository;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.identity.domain.Guide;
import com.omobridge.identity.domain.GuideRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.identity.domain.VehicleType;
import com.omobridge.identity.domain.VerificationStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@AutoConfigureMockMvc
class IdentityIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EnterpriseRepository enterpriseRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private DeliveryProviderRepository deliveryProviderRepository;

    @Autowired
    private GuideRepository guideRepository;

    @Autowired
    private JwtService jwtService;

    @Test
    @DisplayName("End-to-End: Buyer registration, duplicate check, login, and /auth/me")
    void testBuyerLifecycle() throws Exception {
        BuyerRegisterRequest registerReq = new BuyerRegisterRequest(
                "0911001122",
                "buyer1@omobridge.et",
                "Password123!",
                "Tariku Bekele",
                "am"
        );

        // 1. Register Buyer
        MvcResult regResult = mockMvc.perform(post("/api/v1/auth/register/buyer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.user.phoneNumber").value("+251911001122"))
                .andExpect(jsonPath("$.data.user.roles[0]").value("BUYER_VISITOR"))
                .andReturn();

        JsonNode regNode = objectMapper.readTree(regResult.getResponse().getContentAsString());
        String token = regNode.get("data").get("accessToken").asText();

        // 2. Reject duplicate phone
        mockMvc.perform(post("/api/v1/auth/register/buyer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESOURCE_CONFLICT"));

        // 3. Login with valid credentials
        LoginRequest loginReq = new LoginRequest("0911001122", null, "Password123!");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());

        // 4. Login with bad password -> 401
        LoginRequest badPwReq = new LoginRequest("0911001122", null, "WrongPassword");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(badPwReq)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));

        // 5. Query /auth/me with Bearer token
        mockMvc.perform(get("/api/v1/auth/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName").value("Tariku Bekele"))
                .andExpect(jsonPath("$.data.preferredLanguage").value("am"));

        // 6. Query /auth/me without token -> 401
        mockMvc.perform(get("/api/v1/auth/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("End-to-End: Enterprise registration, Farmer registration, and scoped approval")
    void testEnterpriseAndFarmerApproval() throws Exception {
        // 1. Register Enterprise
        EnterpriseRegisterRequest entReq = new EnterpriseRegisterRequest(
                "0922334455",
                "coop@omobridge.et",
                "Password123!",
                "Almaz Ayana",
                "en",
                "Omo Valley Coffee Coop",
                "REG-9876",
                "0922334455",
                "info@coop.et",
                "South Omo",
                "Jinka",
                "Near Main Market",
                new BigDecimal("5.7833"),
                new BigDecimal("36.5667")
        );

        MvcResult entResult = mockMvc.perform(post("/api/v1/auth/register/enterprise")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(entReq)))
                .andExpect(status().isCreated())
                .andReturn();

        JsonNode entNode = objectMapper.readTree(entResult.getResponse().getContentAsString());
        String entToken = entNode.get("data").get("accessToken").asText();
        UUID enterpriseId = UUID.fromString(entNode.get("data").get("user").get("enterpriseId").asText());

        // 2. Register Farmer linked to this enterprise
        ProducerRegisterRequest farmerReq = new ProducerRegisterRequest(
                "0933445566",
                "farmer1@omobridge.et",
                "Password123!",
                "Haile Gebrselassie",
                "am",
                enterpriseId,
                "Key Afer",
                "Kebele 01",
                "ID-12345",
                "0933445566",
                "CBE",
                "100012345678",
                true
        );

        MvcResult farmerResult = mockMvc.perform(post("/api/v1/auth/register/producer")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(farmerReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.user.farmerCode").isNotEmpty())
                .andExpect(jsonPath("$.data.user.verificationStatus").value("PENDING"))
                .andReturn();

        Farmer farmer = farmerRepository.findByFarmerCode(
                objectMapper.readTree(farmerResult.getResponse().getContentAsString())
                        .get("data").get("user").get("farmerCode").asText()
        ).orElseThrow();

        // 3. Enterprise approves its own farmer
        mockMvc.perform(patch("/api/v1/enterprises/" + enterpriseId + "/farmers/" + farmer.getId() + "/approve")
                        .header("Authorization", "Bearer " + entToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"));

        // 4. Verify unauthorized role (e.g. random buyer) cannot approve farmer
        String buyerToken = jwtService.generateToken(UUID.randomUUID(), "+251911999999", Set.of("BUYER_VISITOR"));
        mockMvc.perform(patch("/api/v1/enterprises/" + enterpriseId + "/farmers/" + farmer.getId() + "/approve")
                        .header("Authorization", "Bearer " + buyerToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("End-to-End: Delivery provider and Tour Guide registration with admin verification")
    void testProviderAndGuideLifecycle() throws Exception {
        // 1. Register Delivery Provider
        DeliveryProviderRegisterRequest provReq = new DeliveryProviderRegisterRequest(
                "0944556677",
                "driver1@omobridge.et",
                "Password123!",
                "Kenenisa Bekele",
                "en",
                VehicleType.MOTORCYCLE,
                "ET-3-12345",
                "LIC-9988",
                "Jinka Town"
        );

        mockMvc.perform(post("/api/v1/auth/register/delivery-provider")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(provReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.user.roles[0]").value("DELIVERY_PROVIDER"))
                .andExpect(jsonPath("$.data.user.verificationStatus").value("PENDING"));

        User provUser = userRepository.findByPhoneNumber("+251944556677").orElseThrow();
        DeliveryProvider provider = deliveryProviderRepository.findByUserId(provUser.getId()).orElseThrow();

        // 2. Register Tour Guide
        GuideRegisterRequest guideReq = new GuideRegisterRequest(
                "0955667788",
                "guide1@omobridge.et",
                "Password123!",
                "Derartu Tulu",
                "en",
                "GUIDE-LIC-77",
                "Experienced local cultural guide in South Omo",
                List.of("English", "Amharic", "Hamer"),
                "Trekking, Culture, Bird Watching",
                new BigDecimal("2000.00"),
                "ETB"
        );

        mockMvc.perform(post("/api/v1/auth/register/guide")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(guideReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.user.roles[0]").value("TOUR_GUIDE"))
                .andExpect(jsonPath("$.data.user.verificationStatus").value("PENDING"));

        User guideUser = userRepository.findByPhoneNumber("+251955667788").orElseThrow();
        Guide guide = guideRepository.findByUserId(guideUser.getId()).orElseThrow();

        // 3. Admin token
        String adminToken = jwtService.generateToken(UUID.randomUUID(), "+251911888888", Set.of("SYSTEM_ADMIN"));

        // Admin approves delivery provider
        mockMvc.perform(patch("/api/v1/admin/delivery-providers/" + provider.getId() + "/approve")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"));

        // Tourism Authority approves guide
        String authorityToken = jwtService.generateToken(UUID.randomUUID(), "+251911777777", Set.of("TOURISM_AUTHORITY"));
        mockMvc.perform(patch("/api/v1/admin/guides/" + guide.getId() + "/approve")
                        .header("Authorization", "Bearer " + authorityToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.verificationStatus").value("VERIFIED"));

        // 4. Suspend user and verify login is rejected
        mockMvc.perform(patch("/api/v1/admin/users/" + provUser.getId() + "/status?status=SUSPENDED")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("SUSPENDED"));

        LoginRequest suspendedLogin = new LoginRequest("0944556677", null, "Password123!");
        mockMvc.perform(post("/api/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(suspendedLogin)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("ACCESS_DENIED"));
    }
}
