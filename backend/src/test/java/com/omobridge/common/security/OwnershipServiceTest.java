package com.omobridge.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

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
import com.omobridge.identity.domain.StaffRole;
import com.omobridge.identity.domain.User;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

@ExtendWith(MockitoExtension.class)
class OwnershipServiceTest {

    @Mock
    private EnterpriseRepository enterpriseRepository;

    @Mock
    private EnterpriseStaffRepository enterpriseStaffRepository;

    @Mock
    private FarmerRepository farmerRepository;

    @Mock
    private DeliveryProviderRepository deliveryProviderRepository;

    @Mock
    private GuideRepository guideRepository;

    @InjectMocks
    private OwnershipService ownershipService;

    private UUID userId;
    private Authentication auth;

    @BeforeEach
    void setUp() {
        userId = UUID.randomUUID();
        UserPrincipal principal = UserPrincipal.create(userId, "+251911000000", Set.of("BUYER_VISITOR"));
        auth = new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    @Test
    @DisplayName("isEnterpriseMember returns true when user is owner")
    void isEnterpriseMember_owner_returnsTrue() {
        UUID enterpriseId = UUID.randomUUID();
        Enterprise enterprise = mock(Enterprise.class);
        User owner = mock(User.class);
        when(owner.getId()).thenReturn(userId);
        when(enterprise.getOwnerUser()).thenReturn(owner);
        when(enterpriseRepository.findById(enterpriseId)).thenReturn(Optional.of(enterprise));

        assertThat(ownershipService.isEnterpriseMember(auth, enterpriseId)).isTrue();
    }

    @Test
    @DisplayName("isEnterpriseMember returns true when user is active staff")
    void isEnterpriseMember_activeStaff_returnsTrue() {
        UUID enterpriseId = UUID.randomUUID();
        Enterprise enterprise = mock(Enterprise.class);
        User otherOwner = mock(User.class);
        when(otherOwner.getId()).thenReturn(UUID.randomUUID());
        when(enterprise.getOwnerUser()).thenReturn(otherOwner);
        when(enterpriseRepository.findById(enterpriseId)).thenReturn(Optional.of(enterprise));

        EnterpriseStaff staff = mock(EnterpriseStaff.class);
        when(staff.isActive()).thenReturn(true);
        when(enterpriseStaffRepository.findByEnterpriseIdAndUserId(enterpriseId, userId)).thenReturn(Optional.of(staff));

        assertThat(ownershipService.isEnterpriseMember(auth, enterpriseId)).isTrue();
    }

    @Test
    @DisplayName("isEnterpriseMember returns false when user has no affiliation")
    void isEnterpriseMember_noAffiliation_returnsFalse() {
        UUID enterpriseId = UUID.randomUUID();
        Enterprise enterprise = mock(Enterprise.class);
        User otherOwner = mock(User.class);
        when(otherOwner.getId()).thenReturn(UUID.randomUUID());
        when(enterprise.getOwnerUser()).thenReturn(otherOwner);
        when(enterpriseRepository.findById(enterpriseId)).thenReturn(Optional.of(enterprise));
        when(enterpriseStaffRepository.findByEnterpriseIdAndUserId(enterpriseId, userId)).thenReturn(Optional.empty());

        assertThat(ownershipService.isEnterpriseMember(auth, enterpriseId)).isFalse();
    }

    @Test
    @DisplayName("isOwnFarmer returns true when user matches farmer user")
    void isOwnFarmer_match_returnsTrue() {
        UUID farmerId = UUID.randomUUID();
        Farmer farmer = mock(Farmer.class);
        User farmerUser = mock(User.class);
        when(farmerUser.getId()).thenReturn(userId);
        when(farmer.getUser()).thenReturn(farmerUser);
        when(farmerRepository.findById(farmerId)).thenReturn(Optional.of(farmer));

        assertThat(ownershipService.isOwnFarmer(auth, farmerId)).isTrue();
    }

    @Test
    @DisplayName("isOwnFarmer returns false when user does not match")
    void isOwnFarmer_mismatch_returnsFalse() {
        UUID farmerId = UUID.randomUUID();
        Farmer farmer = mock(Farmer.class);
        User otherUser = mock(User.class);
        when(otherUser.getId()).thenReturn(UUID.randomUUID());
        when(farmer.getUser()).thenReturn(otherUser);
        when(farmerRepository.findById(farmerId)).thenReturn(Optional.of(farmer));

        assertThat(ownershipService.isOwnFarmer(auth, farmerId)).isFalse();
    }
}
