package com.omobridge.identity;

import static org.assertj.core.api.Assertions.assertThat;

import com.omobridge.common.BaseIntegrationTest;
import com.omobridge.identity.domain.DeliveryProvider;
import com.omobridge.identity.domain.DeliveryProviderRepository;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.EnterpriseStaff;
import com.omobridge.identity.domain.EnterpriseStaffRepository;
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
import com.omobridge.identity.domain.VehicleType;
import com.omobridge.identity.domain.VerificationStatus;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;

@Transactional
class IdentityRepositoryIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EnterpriseRepository enterpriseRepository;

    @Autowired
    private EnterpriseStaffRepository enterpriseStaffRepository;

    @Autowired
    private FarmerRepository farmerRepository;

    @Autowired
    private DeliveryProviderRepository deliveryProviderRepository;

    @Autowired
    private GuideRepository guideRepository;

    @Test
    @DisplayName("B-101: Verify all 7 identity entities and repositories")
    void testIdentityEntitiesAndRepositories() {
        // 1. Role
        Optional<Role> buyerRole = roleRepository.findByName("BUYER_VISITOR");
        assertThat(buyerRole).isPresent();

        // 2. User
        User user = new User();
        user.setPhoneNumber("+251911223344");
        user.setEmail("user@example.com");
        user.setPasswordHash("hashed_pw");
        user.setFullName("Abebe Bikila");
        user.setStatus(UserStatus.ACTIVE);
        user.setPreferredLanguage("am");
        user.addRole(buyerRole.get());
        user = userRepository.saveAndFlush(user);

        assertThat(user.getId()).isNotNull();
        assertThat(userRepository.findByPhoneNumber("+251911223344")).isPresent();

        // 3. Enterprise
        Enterprise enterprise = new Enterprise();
        enterprise.setOwnerUser(user);
        enterprise.setName("Omo Valley Honey Coop");
        enterprise.setContactPhone("+251911223344");
        enterprise.setLocationWoreda("Jinka");
        enterprise.setLocationTown("Jinka Town");
        enterprise = enterpriseRepository.saveAndFlush(enterprise);

        assertThat(enterprise.getId()).isNotNull();
        assertThat(enterpriseRepository.findByOwnerUserId(user.getId())).isPresent();

        // 4. EnterpriseStaff
        EnterpriseStaff staff = new EnterpriseStaff();
        staff.setEnterprise(enterprise);
        staff.setUser(user);
        staff.setRole(StaffRole.OWNER);
        staff = enterpriseStaffRepository.saveAndFlush(staff);

        assertThat(staff.getId()).isNotNull();
        assertThat(enterpriseStaffRepository.findByEnterpriseIdAndUserId(enterprise.getId(), user.getId())).isPresent();

        // 5. Farmer
        Farmer farmer = new Farmer();
        farmer.setUser(user);
        farmer.setEnterprise(enterprise);
        farmer.setFarmerCode("FRM-0001");
        farmer.setVillage("Turmi");
        farmer.setTelebirrPhone("+251911223344");
        farmer.setVerificationStatus(VerificationStatus.VERIFIED);
        farmer = farmerRepository.saveAndFlush(farmer);

        assertThat(farmer.getId()).isNotNull();
        assertThat(farmerRepository.findByFarmerCode("FRM-0001")).isPresent();

        // 6. Delivery Provider
        DeliveryProvider provider = new DeliveryProvider();
        provider.setUser(user);
        provider.setVehicleType(VehicleType.MOTORCYCLE);
        provider.setServiceArea("Jinka & Surrounding");
        provider.setVerificationStatus(VerificationStatus.PENDING);
        provider = deliveryProviderRepository.saveAndFlush(provider);

        assertThat(provider.getId()).isNotNull();
        assertThat(deliveryProviderRepository.findByUserId(user.getId())).isPresent();

        // 7. Guide
        Guide guide = new Guide();
        guide.setUser(user);
        guide.setLanguages(List.of("English", "Amharic", "Hamer"));
        guide.setBio("Local guide in Hamer woreda");
        guide.setDailyRate(new BigDecimal("1500.00"));
        guide.setVerificationStatus(VerificationStatus.VERIFIED);
        guide = guideRepository.saveAndFlush(guide);

        assertThat(guide.getId()).isNotNull();
        Optional<Guide> foundGuide = guideRepository.findByUserId(user.getId());
        assertThat(foundGuide).isPresent();
        assertThat(foundGuide.get().getLanguages()).contains("Hamer", "Amharic");
    }
}
