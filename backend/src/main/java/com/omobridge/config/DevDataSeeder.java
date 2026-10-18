package com.omobridge.config;

import com.omobridge.common.security.RoleName;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.EnterpriseStaff;
import com.omobridge.identity.domain.EnterpriseStaffRepository;
import com.omobridge.identity.domain.EnterpriseStatus;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.identity.domain.Guide;
import com.omobridge.identity.domain.GuideRepository;
import com.omobridge.identity.domain.Role;
import com.omobridge.identity.domain.RoleRepository;
import com.omobridge.identity.domain.StaffRole;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.identity.domain.VerificationStatus;
import com.omobridge.supply.domain.BuyingPrice;
import com.omobridge.supply.domain.BuyingPriceRepository;
import com.omobridge.supply.domain.DeliveryStatus;
import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.FarmerPayment;
import com.omobridge.supply.domain.FarmerPaymentRepository;
import com.omobridge.supply.domain.FarmerPaymentStatus;
import com.omobridge.supply.domain.PayableStatus;
import com.omobridge.supply.domain.PaymentAllocation;
import com.omobridge.supply.domain.ProductType;
import com.omobridge.supply.domain.ProductTypeRepository;
import com.omobridge.supply.domain.SupplyDelivery;
import com.omobridge.supply.domain.SupplyDeliveryItem;
import com.omobridge.supply.domain.SupplyDeliveryRepository;
import com.omobridge.tourism.domain.Hotel;
import com.omobridge.tourism.domain.HotelRepository;
import com.omobridge.tourism.domain.SessionStatus;
import com.omobridge.tourism.domain.TourAvailabilitySession;
import com.omobridge.tourism.domain.TourAvailabilitySessionRepository;
import com.omobridge.tourism.domain.TourPackage;
import com.omobridge.tourism.domain.TourPackageRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevDataSeeder implements ApplicationRunner {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final EnterpriseStaffRepository enterpriseStaffRepository;
    private final GuideRepository guideRepository;
    private final FarmerRepository farmerRepository;
    private final TourPackageRepository tourPackageRepository;
    private final TourAvailabilitySessionRepository sessionRepository;
    private final HotelRepository hotelRepository;
    private final ProductTypeRepository productTypeRepository;
    private final BuyingPriceRepository buyingPriceRepository;
    private final SupplyDeliveryRepository supplyDeliveryRepository;
    private final FarmerPayableRepository farmerPayableRepository;
    private final FarmerPaymentRepository farmerPaymentRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        log.info("Running OmoBridge dev data seeder...");

        // 1. Roles
        Role roleEnterprise = roleRepository.findByName(RoleName.MICRO_ENTERPRISE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.MICRO_ENTERPRISE.name(), "Micro enterprise")));
        Role roleGuide = roleRepository.findByName(RoleName.TOUR_GUIDE.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.TOUR_GUIDE.name(), "Tourism guide")));
        Role roleBuyer = roleRepository.findByName(RoleName.BUYER_VISITOR.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.BUYER_VISITOR.name(), "Buyer")));
        Role roleFarmer = roleRepository.findByName(RoleName.PRODUCER_FARMER.name())
                .orElseGet(() -> roleRepository.save(new Role(RoleName.PRODUCER_FARMER.name(), "Producer farmer")));

        // 2. Dev Users
        User enterpriseUser = userRepository.findByPhoneNumber("+251911000001")
                .orElseGet(() -> {
                    User u = new User();
                    u.setPhoneNumber("+251911000001");
                    u.setPasswordHash(passwordEncoder.encode("Password123!"));
                    u.setFullName("Turmi Cultural Union Admin");
                    u.setEmail("enterprise@omobridge.et");
                    u.setStatus(UserStatus.ACTIVE);
                    u.addRole(roleEnterprise);
                    return userRepository.save(u);
                });

        User guideUser = userRepository.findByPhoneNumber("+251911000002")
                .orElseGet(() -> {
                    User u = new User();
                    u.setPhoneNumber("+251911000002");
                    u.setPasswordHash(passwordEncoder.encode("Password123!"));
                    u.setFullName("Desta Eyasu");
                    u.setEmail("guide@omobridge.et");
                    u.setStatus(UserStatus.ACTIVE);
                    u.addRole(roleGuide);
                    return userRepository.save(u);
                });

        userRepository.findByPhoneNumber("+251911000003")
                .orElseGet(() -> {
                    User u = new User();
                    u.setPhoneNumber("+251911000003");
                    u.setPasswordHash(passwordEncoder.encode("Password123!"));
                    u.setFullName("Sarah Jenkins (Tourist)");
                    u.setEmail("buyer@omobridge.et");
                    u.setStatus(UserStatus.ACTIVE);
                    u.addRole(roleBuyer);
                    return userRepository.save(u);
                });

        User farmerUser = userRepository.findByPhoneNumber("+251911000004")
                .orElseGet(() -> {
                    User u = new User();
                    u.setPhoneNumber("+251911000004");
                    u.setPasswordHash(passwordEncoder.encode("Password123!"));
                    u.setFullName("Alemayehu Haile (Hamer Honey Producer)");
                    u.setEmail("farmer@omobridge.et");
                    u.setStatus(UserStatus.ACTIVE);
                    u.addRole(roleFarmer);
                    return userRepository.save(u);
                });

        // 3. Enterprise
        Enterprise enterprise = enterpriseRepository.findAll().stream().findFirst()
                .orElseGet(() -> {
                    Enterprise ent = new Enterprise();
                    ent.setName("South Omo Community Heritage Cooperative");
                    ent.setRegistrationNumber("ENT-OMO-001");
                    ent.setContactPhone("+251911000001");
                    ent.setContactEmail("coop@omobridge.et");
                    ent.setLocationWoreda("Turmi");
                    ent.setLocationTown("Turmi Town");
                    ent.setOwnerUser(enterpriseUser);
                    ent.setStatus(EnterpriseStatus.ACTIVE);
                    Enterprise saved = enterpriseRepository.save(ent);

                    EnterpriseStaff staff = new EnterpriseStaff();
                    staff.setEnterprise(saved);
                    staff.setUser(enterpriseUser);
                    staff.setRole(StaffRole.OWNER);
                    staff.setActive(true);
                    enterpriseStaffRepository.save(staff);

                    return saved;
                });

        // 4. Farmer Profile
        Farmer farmer = farmerRepository.findByUserId(farmerUser.getId())
                .orElseGet(() -> {
                    Farmer f = new Farmer();
                    f.setUser(farmerUser);
                    f.setEnterprise(enterprise);
                    f.setFarmerCode("FRM-OMO-001");
                    f.setVillage("Keske Village, Turmi");
                    return farmerRepository.save(f);
                });

        // 5. Guide Profile
        guideRepository.findByUserId(guideUser.getId())
                .orElseGet(() -> {
                    Guide g = new Guide();
                    g.setUser(guideUser);
                    g.setLicenseNumber("GUIDE-OMO-2024-001");
                    g.setBio("Certified local guide with over 8 years of experience showcasing Hamer, Karo and Mursi traditions.");
                    g.setLanguages(List.of("English", "Amharic", "Hamer-Banna"));
                    g.setSpecialties("Cultural ceremonies, photography treks, bull jumping customs");
                    g.setDailyRate(BigDecimal.valueOf(2000.00));
                    g.setVerificationStatus(VerificationStatus.VERIFIED);
                    g.setAvailable(true);
                    return guideRepository.save(g);
                });

        // 6. Tourism Packages & Sessions
        seedTourPackage(enterprise, "Ukuli Bula Ceremony (Bull Jumping)", "CULTURAL_EVENT",
                "Authentic rite-of-passage ceremony celebrating young men transitioning to adulthood with community blessings.",
                "The Ukuli Bula ceremony is an ancient tradition of the Hamer people representing courage and community initiation.",
                "Dimeka Sacred Grounds, South Omo", BigDecimal.valueOf(2000.00), 15, "4 hours");

        seedTourPackage(enterprise, "Traditional Village Visit", "VILLAGE_EXPERIENCE",
                "Immersive walking tour through a traditional Hamer village exploring architecture, daily life and pottery.",
                "Engage directly with village elders and artisans in a respectful, community-consented cultural exchange.",
                "Turmi Vicinity, South Omo", BigDecimal.valueOf(500.00), 10, "3 hours");

        seedTourPackage(enterprise, "Village Camping", "CAMPING",
                "Traditional eco-camping under the southern stars within community-designated village perimeters.",
                "Experience local hospitality around evening fires listening to folklore and stargazing.",
                "Keske River Camp, Turmi", BigDecimal.valueOf(800.00), 8, "Overnight (14 hours)");

        seedTourPackage(enterprise, "Evangadi Dance Ceremony", "DANCE_MUSIC",
                "Evening moonlight dance celebrating unity, joyful music, and traditional social bonds.",
                "Evangadi is performed during moonlit nights where the youth gather for singing, courtship and celebration.",
                "Turmi Cultural Grounds", BigDecimal.valueOf(100.00), 30, "2 hours");

        seedTourPackage(enterprise, "Long Hike with Local Guide", "TREKKING",
                "Scenic trekking excursion across the South Omo river valleys, savannah landscapes and acacia groves.",
                "Traverse ancient pastoral paths guided by knowledgeable local scouts who know the flora, fauna and terrain.",
                "South Omo Valley Trails", BigDecimal.valueOf(2000.00), 6, "Full Day (8 hours)");

        seedTourPackage(enterprise, "Cow Bleeding Ceremony", "CULTURAL_EVENT",
                "Traditional pastoralist demonstration of non-lethal blood harvesting for nutritional and ritual subsistence.",
                "An insightful perspective into traditional pastoralist veterinary skill and sustainable subsistence practices.",
                "Karo Traditional Rangelands", BigDecimal.valueOf(1000.00), 10, "2 hours");

        seedTourPackage(enterprise, "Cultural Photography Experience", "PHOTOGRAPHY",
                "Ethical photography session respecting community dignity, accompanied by a cultural facilitator.",
                "Capture stunning portraits and landscapes while ensuring community compensation and cultural protocol.",
                "Lower Omo Cultural Corridor", BigDecimal.valueOf(1500.00), 5, "Half Day (4 hours)");

        // 7. Hotels
        seedHotel(enterprise, "Buska Hotel", "Turmi Center, near Keske River",
                "+251911223344", "info@buskahotel.et", BigDecimal.valueOf(2500.00),
                "Free WiFi, Restaurant, Bar, AC, Cultural craft shop");

        seedHotel(enterprise, "Green Resort", "Jinka Foothills, South Omo",
                "+251911334455", "stay@greenresort.et", BigDecimal.valueOf(1800.00),
                "Swimming Pool, Organic Garden Restaurant, 24/7 Security");

        seedHotel(enterprise, "Paradise Lodge", "Lake Chamo Ridge, Arba Minch",
                "+251911445566", "booking@paradiselodge.et", BigDecimal.valueOf(3200.00),
                "Panoramic Lake View, Luxury Spa, Fine Dining, Conference Facilities");

        // 8. Supply: Product Types, Buying Prices, Delivery, Payables, Payments
        seedSupply(enterprise, enterpriseUser, farmer);

        log.info("Dev data seeder completed successfully.");
    }

    private void seedSupply(Enterprise enterprise, User staffUser, Farmer farmer) {
        ProductType honey = seedProductType("HONEY-RAW", "Forest White Honey", "HONEY", "KG", "Raw unfiltered natural honey from South Omo forests");
        ProductType milk = seedProductType("MILK-COW-RAW", "Fresh Pastoral Cow Milk", "DAIRY", "LITER", "Fresh whole unpasteurized milk from indigenous cattle");
        seedProductType("COTTON-HAND-SPUN", "Organic Hand-Spun Cotton", "TEXTILE", "KG", "Hand-picked, traditionally carded and spun cotton");
        seedProductType("BEADWORK-HAMER", "Traditional Hamer Beadwork Bands", "CRAFT", "PIECE", "Authentic glass bead ornaments crafted by women artisans");

        seedBuyingPrice(enterprise, honey, "Grade A", BigDecimal.valueOf(350.00));
        seedBuyingPrice(enterprise, honey, "Grade B", BigDecimal.valueOf(280.00));
        seedBuyingPrice(enterprise, milk, "Grade A", BigDecimal.valueOf(60.00));

        if (supplyDeliveryRepository.findAllByFarmerIdOrderByDeliveredAtDesc(farmer.getId()).isEmpty()) {
            SupplyDelivery delivery = new SupplyDelivery();
            delivery.setDeliveryNo("DEL-SEED-001");
            delivery.setEnterprise(enterprise);
            delivery.setFarmer(farmer);
            delivery.setDeliveredAt(Instant.now().minusSeconds(86400));
            delivery.setReceivedByUser(staffUser);
            delivery.setStatus(DeliveryStatus.INSPECTED);
            delivery.setNotes("First seasonal high-purity honey delivery");

            SupplyDeliveryItem item = new SupplyDeliveryItem();
            item.setProductType(honey);
            item.setGrade("Grade A");
            item.setDeliveredQty(BigDecimal.valueOf(50.00));
            item.setAcceptedQty(BigDecimal.valueOf(48.00));
            item.setRejectedQty(BigDecimal.valueOf(2.00));
            item.setRejectionReason("Excessive moisture in 2kg batch");
            item.setUnitPriceSnapshot(BigDecimal.valueOf(350.00));
            item.setLineTotal(BigDecimal.valueOf(16800.00)); // 48 * 350
            delivery.addItem(item);

            SupplyDelivery savedDelivery = supplyDeliveryRepository.save(delivery);

            FarmerPayable payable = new FarmerPayable();
            payable.setPayableNo("PAYABLE-SEED-001");
            payable.setFarmer(farmer);
            payable.setEnterprise(enterprise);
            payable.setDeliveryItem(savedDelivery.getItems().get(0));
            payable.setAmountDue(BigDecimal.valueOf(16800.00));
            payable.setAmountAllocated(BigDecimal.valueOf(10000.00));
            payable.setStatus(PayableStatus.PARTIAL);
            FarmerPayable savedPayable = farmerPayableRepository.save(payable);

            FarmerPayment payment = new FarmerPayment();
            payment.setPaymentNo("PAY-SEED-001");
            payment.setEnterprise(enterprise);
            payment.setFarmer(farmer);
            payment.setAmount(BigDecimal.valueOf(10000.00));
            payment.setCurrency("ETB");
            payment.setPaymentMethod("TELEBIRR");
            payment.setStatus(FarmerPaymentStatus.SUCCESS);
            payment.setGatewayReference("TB-TXN-SEED-001");
            payment.setPaidAt(Instant.now().minusSeconds(3600));

            PaymentAllocation alloc = new PaymentAllocation();
            alloc.setPayable(savedPayable);
            alloc.setAmount(BigDecimal.valueOf(10000.00));
            payment.addAllocation(alloc);

            farmerPaymentRepository.save(payment);
        }
    }

    private ProductType seedProductType(String code, String name, String category, String unit, String desc) {
        return productTypeRepository.findByCode(code)
                .orElseGet(() -> {
                    ProductType pt = new ProductType();
                    pt.setCode(code);
                    pt.setName(name);
                    pt.setCategory(category);
                    pt.setUnit(unit);
                    pt.setDescription(desc);
                    return productTypeRepository.save(pt);
                });
    }

    private void seedBuyingPrice(Enterprise enterprise, ProductType productType, String grade, BigDecimal price) {
        if (buyingPriceRepository.findActiveBuyingPrices(enterprise.getId(), productType.getId(), grade, Instant.now()).isEmpty()) {
            BuyingPrice bp = new BuyingPrice();
            bp.setEnterprise(enterprise);
            bp.setProductType(productType);
            bp.setGrade(grade);
            bp.setPricePerUnit(price);
            bp.setEffectiveFrom(Instant.now().minusSeconds(86400 * 30));
            bp.setActive(true);
            buyingPriceRepository.save(bp);
        }
    }

    private void seedTourPackage(Enterprise enterprise, String name, String category,
                                 String overview, String story, String location,
                                 BigDecimal price, int maxGroupSize, String duration) {
        if (tourPackageRepository.findAll().stream().anyMatch(p -> p.getName().equalsIgnoreCase(name))) {
            return;
        }

        TourPackage tourPackage = new TourPackage();
        tourPackage.setEnterprise(enterprise);
        tourPackage.setName(name);
        tourPackage.setCategory(category);
        tourPackage.setOverview(overview);
        tourPackage.setStory(story);
        tourPackage.setLocationText(location);
        tourPackage.setPriceAmount(price);
        tourPackage.setPriceUnit("PER_PERSON");
        tourPackage.setCurrency("ETB");
        tourPackage.setMaxGroupSize(maxGroupSize);
        tourPackage.setDurationHours(BigDecimal.valueOf(4.0));
        tourPackage.setOpeningHours("08:00 - 18:00");
        tourPackage.setCulturalRules("Dress modestly; always ask permission before taking close-up portraits.");
        tourPackage.setSafetyNotes("Bring sun protection, adequate drinking water, and closed walking shoes.");
        tourPackage.setCommunityApprovalRef("CONSENT-OMO-2024-COMMUNITY");
        tourPackage.setCommunityApprovalDate(LocalDate.now().minusDays(30));
        tourPackage.setActive(true);

        TourPackage saved = tourPackageRepository.save(tourPackage);

        // Create sessions for today and tomorrow
        createSessionIfAbsent(saved, LocalDate.now(), LocalTime.of(9, 0), maxGroupSize);
        createSessionIfAbsent(saved, LocalDate.now().plusDays(1), LocalTime.of(14, 0), maxGroupSize);
    }

    private void createSessionIfAbsent(TourPackage tourPackage, LocalDate date, LocalTime time, int capacity) {
        if (sessionRepository.findByTourPackageIdAndSessionDateAndStartTime(tourPackage.getId(), date, time).isEmpty()) {
            TourAvailabilitySession session = new TourAvailabilitySession();
            session.setTourPackage(tourPackage);
            session.setSessionDate(date);
            session.setStartTime(time);
            session.setCapacity(capacity);
            session.setBookedCount(0);
            session.setStatus(SessionStatus.OPEN);
            sessionRepository.save(session);
        }
    }

    private void seedHotel(Enterprise enterprise, String name, String location,
                           String phone, String email, BigDecimal priceFrom, String amenities) {
        if (hotelRepository.findAll().stream().anyMatch(h -> h.getName().equalsIgnoreCase(name))) {
            return;
        }

        Hotel hotel = new Hotel();
        hotel.setEnterprise(enterprise);
        hotel.setName(name);
        hotel.setLocationText(location);
        hotel.setContactPhone(phone);
        hotel.setContactEmail(email);
        hotel.setPriceFrom(priceFrom);
        hotel.setCurrency("ETB");
        hotel.setAmenities(amenities);
        hotel.setActive(true);
        hotelRepository.save(hotel);
    }
}
