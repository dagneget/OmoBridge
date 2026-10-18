package com.omobridge.bookings;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.bookings.api.dto.BookingCreateRequest;
import com.omobridge.bookings.api.dto.BookingItemRequest;
import com.omobridge.bookings.api.dto.BookingStatusUpdateRequest;
import com.omobridge.bookings.domain.BookingItemType;
import com.omobridge.bookings.domain.BookingRepository;
import com.omobridge.bookings.domain.BookingStatus;
import com.omobridge.bookings.service.BookingService;
import com.omobridge.common.BaseIntegrationTest;
import com.omobridge.common.security.JwtService;
import com.omobridge.common.security.RoleName;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.common.util.ConcurrencyTestHelper;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.EnterpriseStaff;
import com.omobridge.identity.domain.EnterpriseStaffRepository;
import com.omobridge.identity.domain.EnterpriseStatus;
import com.omobridge.identity.domain.Guide;
import com.omobridge.identity.domain.GuideRepository;
import com.omobridge.identity.domain.Role;
import com.omobridge.identity.domain.RoleRepository;
import com.omobridge.identity.domain.StaffRole;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.identity.domain.VerificationStatus;
import com.omobridge.tourism.api.dto.GuideProfileRequest;
import com.omobridge.tourism.domain.SessionStatus;
import com.omobridge.tourism.domain.TourAvailabilitySession;
import com.omobridge.tourism.domain.TourAvailabilitySessionRepository;
import com.omobridge.tourism.domain.TourPackage;
import com.omobridge.tourism.domain.TourPackageRepository;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
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
class TourismAndBookingIntegrationTest extends BaseIntegrationTest {

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
    private GuideRepository guideRepository;

    @Autowired
    private TourPackageRepository tourPackageRepository;

    @Autowired
    private TourAvailabilitySessionRepository sessionRepository;

    @Autowired
    private BookingRepository bookingRepository;

    @Autowired
    private BookingService bookingService;

    private User enterpriseOwner;
    private Enterprise enterprise;
    private User guideUser;
    private Guide guide;
    private User buyer;
    private TourPackage tourPackage;
    private TourAvailabilitySession session;

    private String enterpriseToken;
    private String guideToken;
    private String buyerToken;

    @BeforeEach
    void setUp() {
        Role roleEnterprise = roleRepository.findByName(RoleName.MICRO_ENTERPRISE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.MICRO_ENTERPRISE.name(), "Enterprise")));
        Role roleGuide = roleRepository.findByName(RoleName.TOUR_GUIDE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.TOUR_GUIDE.name(), "Guide")));
        Role roleBuyer = roleRepository.findByName(RoleName.BUYER_VISITOR.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.BUYER_VISITOR.name(), "Buyer")));

        // 1. Enterprise Owner
        enterpriseOwner = new User();
        enterpriseOwner.setPhoneNumber("+251922" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "1"));
        enterpriseOwner.setFullName("Enterprise Owner");
        enterpriseOwner.setPasswordHash("hashed");
        enterpriseOwner.setStatus(UserStatus.ACTIVE);
        enterpriseOwner.addRole(roleEnterprise);
        enterpriseOwner = userRepository.save(enterpriseOwner);
        enterpriseToken = jwtService.generateToken(enterpriseOwner.getId(), enterpriseOwner.getPhoneNumber(), Set.of("ROLE_MICRO_ENTERPRISE"));

        enterprise = new Enterprise();
        enterprise.setName("Turmi Cultural Enterprise");
        enterprise.setRegistrationNumber("REG-" + UUID.randomUUID().toString().substring(0, 8));
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

        // 2. Guide
        guideUser = new User();
        guideUser.setPhoneNumber("+251933" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "2"));
        guideUser.setFullName("Local Guide");
        guideUser.setPasswordHash("hashed");
        guideUser.setStatus(UserStatus.ACTIVE);
        guideUser.addRole(roleGuide);
        guideUser = userRepository.save(guideUser);
        guideToken = jwtService.generateToken(guideUser.getId(), guideUser.getPhoneNumber(), Set.of("ROLE_TOUR_GUIDE"));

        guide = new Guide();
        guide.setUser(guideUser);
        guide.setLicenseNumber("LIC-TEST-001");
        guide.setBio("Experienced local guide");
        guide.setLanguages(List.of("English", "Hamer"));
        guide.setDailyRate(BigDecimal.valueOf(1500.00));
        guide.setVerificationStatus(VerificationStatus.VERIFIED);
        guide.setAvailable(true);
        guide = guideRepository.save(guide);

        // 3. Buyer
        buyer = new User();
        buyer.setPhoneNumber("+251944" + UUID.randomUUID().toString().substring(0, 6).replaceAll("[^0-9]", "3"));
        buyer.setFullName("Tourist Buyer");
        buyer.setPasswordHash("hashed");
        buyer.setStatus(UserStatus.ACTIVE);
        buyer.addRole(roleBuyer);
        buyer = userRepository.save(buyer);
        buyerToken = jwtService.generateToken(buyer.getId(), buyer.getPhoneNumber(), Set.of("ROLE_BUYER_VISITOR"));

        // 4. Package & Session
        tourPackage = new TourPackage();
        tourPackage.setEnterprise(enterprise);
        tourPackage.setName("Bull Jumping Ceremony Tour");
        tourPackage.setCategory("CULTURAL_EVENT");
        tourPackage.setOverview("Authentic cultural ceremony");
        tourPackage.setLocationText("Turmi, South Omo");
        tourPackage.setPriceAmount(BigDecimal.valueOf(2000.00));
        tourPackage.setMaxGroupSize(10);
        tourPackage.setActive(true);
        tourPackage = tourPackageRepository.save(tourPackage);

        session = new TourAvailabilitySession();
        session.setTourPackage(tourPackage);
        session.setSessionDate(LocalDate.now().plusDays(2));
        session.setStartTime(LocalTime.of(10, 0));
        session.setCapacity(6);
        session.setBookedCount(0);
        session.setStatus(SessionStatus.OPEN);
        session = sessionRepository.save(session);
    }

    @Test
    @DisplayName("B-302: Public can browse packages without authentication")
    void testPublicPackageBrowsing() throws Exception {
        mockMvc.perform(get("/api/v1/tourism/packages"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray())
                .andExpect(jsonPath("$.data[0].name").isNotEmpty());
    }

    @Test
    @DisplayName("B-307: Guide can update own profile; cross-guide update is forbidden")
    void testGuideProfileManagement() throws Exception {
        GuideProfileRequest updateReq = new GuideProfileRequest(
                "Updated bio with 10 years experience",
                List.of("English", "Amharic", "Hamer"),
                "Ceremonies and trekking",
                BigDecimal.valueOf(1800.00),
                true
        );

        // Guide updates own profile
        mockMvc.perform(put("/api/v1/tourism/guides/" + guide.getId())
                        .header("Authorization", "Bearer " + guideToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bio").value("Updated bio with 10 years experience"))
                .andExpect(jsonPath("$.data.dailyRate").value(1800.00));

        // Another user (buyer) attempts to update guide profile -> 403 Forbidden
        mockMvc.perform(put("/api/v1/tourism/guides/" + guide.getId())
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateReq)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("B-309, B-310, B-311: Full booking lifecycle with seat reservation, price snapshot, and cancellation release")
    void testBookingLifecycle() throws Exception {
        BookingCreateRequest createReq = new BookingCreateRequest(
                enterprise.getId(),
                session.getId(),
                guide.getId(),
                session.getSessionDate(),
                4, // 4 seats out of 6
                "Sarah Connor",
                "+251911998877",
                "sarah@example.com",
                "Vegetarian food",
                List.of(new BookingItemRequest(BookingItemType.PACKAGE, tourPackage.getId(), 4))
        );

        // 1. Create Booking
        MvcResult result = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + buyerToken)
                        .header("Idempotency-Key", "BOOKING-KEY-" + UUID.randomUUID())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.bookingCode").isNotEmpty())
                .andExpect(jsonPath("$.data.partySize").value(4))
                .andExpect(jsonPath("$.data.status").value("REQUESTED"))
                .andExpect(jsonPath("$.data.subtotal").value(8000.00)) // 2000 * 4
                .andExpect(jsonPath("$.data.items[0].itemNameSnapshot").value("Bull Jumping Ceremony Tour"))
                .andExpect(jsonPath("$.data.items[0].unitPriceSnapshot").value(2000.00))
                .andReturn();

        String responseBody = result.getResponse().getContentAsString();
        String bookingIdStr = objectMapper.readTree(responseBody).get("data").get("id").asText();
        UUID bookingId = UUID.fromString(bookingIdStr);

        // Check session booked count incremented to 4
        TourAvailabilitySession updatedSession = sessionRepository.findById(session.getId()).orElseThrow();
        assertThat(updatedSession.getBookedCount()).isEqualTo(4);

        // 2. Reject over-capacity booking (remaining capacity is 2, requesting 3)
        BookingCreateRequest overReq = new BookingCreateRequest(
                enterprise.getId(),
                session.getId(),
                null,
                session.getSessionDate(),
                3,
                "Over Capacity Request",
                "+251911998877",
                null,
                null,
                List.of(new BookingItemRequest(BookingItemType.PACKAGE, tourPackage.getId(), 3))
        );

        mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(overReq)))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("capacity exceeded")));

        // 3. Enterprise confirms booking
        BookingStatusUpdateRequest confirmReq = new BookingStatusUpdateRequest(BookingStatus.CONFIRMED, "Confirmed by enterprise");
        mockMvc.perform(patch("/api/v1/bookings/" + bookingId + "/status")
                        .header("Authorization", "Bearer " + enterpriseToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(confirmReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CONFIRMED"));

        // 4. Cancel booking and verify session seats are released
        BookingStatusUpdateRequest cancelReq = new BookingStatusUpdateRequest(BookingStatus.CANCELLED, "Trip cancelled by buyer");
        mockMvc.perform(patch("/api/v1/bookings/" + bookingId + "/status")
                        .header("Authorization", "Bearer " + buyerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(cancelReq)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("CANCELLED"));

        // Verify seats released back to 0
        TourAvailabilitySession releasedSession = sessionRepository.findById(session.getId()).orElseThrow();
        assertThat(releasedSession.getBookedCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("B-312: Booking concurrency test - N threads reserving seats; booked count never exceeds capacity")
    void testBookingConcurrencySafety() throws Exception {
        // Session capacity: 6
        TourAvailabilitySession concSession = new TourAvailabilitySession();
        concSession.setTourPackage(tourPackage);
        concSession.setSessionDate(LocalDate.now().plusDays(5));
        concSession.setStartTime(LocalTime.of(9, 0));
        concSession.setCapacity(6);
        concSession.setBookedCount(0);
        concSession.setStatus(SessionStatus.OPEN);
        concSession = sessionRepository.save(concSession);

        final UUID concSessionId = concSession.getId();
        int threadCount = 10; // 10 threads, each trying to book 2 seats (total 20 seats requested, only 6 available)

        ConcurrencyTestHelper.ConcurrencyResult result = ConcurrencyTestHelper.executeConcurrently(threadCount, index -> {
            BookingCreateRequest req = new BookingCreateRequest(
                    enterprise.getId(),
                    concSessionId,
                    null,
                    LocalDate.now().plusDays(5),
                    2,
                    "Concurrent Buyer " + index,
                    "+2519110000" + (index < 10 ? "0" + index : index),
                    null,
                    null,
                    List.of(new BookingItemRequest(BookingItemType.PACKAGE, tourPackage.getId(), 2))
            );
            bookingService.createBooking(buyer.getId(), req, "CONC-KEY-" + UUID.randomUUID());
        });

        // Exactly 3 requests must succeed (3 * 2 = 6 seats), and 7 requests must fail with BusinessRuleException
        assertThat(result.successCount()).isEqualTo(3);
        assertThat(result.exceptions()).hasSize(7);

        TourAvailabilitySession finalSession = sessionRepository.findById(concSessionId).orElseThrow();
        assertThat(finalSession.getBookedCount()).isEqualTo(6);
        assertThat(finalSession.getBookedCount()).isLessThanOrEqualTo(finalSession.getCapacity());
    }
}
