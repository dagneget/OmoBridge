package com.omobridge.common.security;

import com.omobridge.identity.domain.DeliveryProviderRepository;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.EnterpriseStaffRepository;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.identity.domain.GuideRepository;
import com.omobridge.identity.domain.StaffRole;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service("ownershipService")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OwnershipService {

    private final EnterpriseRepository enterpriseRepository;
    private final EnterpriseStaffRepository enterpriseStaffRepository;
    private final FarmerRepository farmerRepository;
    private final DeliveryProviderRepository deliveryProviderRepository;
    private final GuideRepository guideRepository;

    public boolean isEnterpriseMember(Authentication authentication, UUID enterpriseId) {
        UUID currentUserId = extractUserId(authentication);
        if (currentUserId == null || enterpriseId == null) {
            return false;
        }

        // Direct owner check
        boolean isOwner = enterpriseRepository.findById(enterpriseId)
                .map(e -> e.getOwnerUser().getId().equals(currentUserId))
                .orElse(false);
        if (isOwner) {
            return true;
        }

        // Active staff member check
        return enterpriseStaffRepository.findByEnterpriseIdAndUserId(enterpriseId, currentUserId)
                .map(staff -> Boolean.TRUE.equals(staff.isActive()))
                .orElse(false);
    }

    public boolean isEnterpriseOwner(Authentication authentication, UUID enterpriseId) {
        UUID currentUserId = extractUserId(authentication);
        if (currentUserId == null || enterpriseId == null) {
            return false;
        }

        return enterpriseRepository.findById(enterpriseId)
                .map(e -> e.getOwnerUser().getId().equals(currentUserId))
                .orElse(false)
                || enterpriseStaffRepository.findByEnterpriseIdAndUserId(enterpriseId, currentUserId)
                .map(staff -> staff.getRole() == StaffRole.OWNER && Boolean.TRUE.equals(staff.isActive()))
                .orElse(false);
    }

    public boolean isOwnFarmer(Authentication authentication, UUID farmerId) {
        UUID currentUserId = extractUserId(authentication);
        if (currentUserId == null || farmerId == null) {
            return false;
        }

        return farmerRepository.findById(farmerId)
                .map(farmer -> farmer.getUser().getId().equals(currentUserId))
                .orElse(false);
    }

    public boolean isEnterpriseManagingFarmer(Authentication authentication, UUID farmerId) {
        UUID currentUserId = extractUserId(authentication);
        if (currentUserId == null || farmerId == null) {
            return false;
        }

        return farmerRepository.findById(farmerId)
                .filter(farmer -> farmer.getEnterprise() != null)
                .map(farmer -> isEnterpriseMember(authentication, farmer.getEnterprise().getId()))
                .orElse(false);
    }

    public boolean isAssignedProvider(Authentication authentication, UUID providerId) {
        UUID currentUserId = extractUserId(authentication);
        if (currentUserId == null || providerId == null) {
            return false;
        }

        return deliveryProviderRepository.findById(providerId)
                .map(p -> p.getUser().getId().equals(currentUserId))
                .orElse(false);
    }

    public boolean isAssignedGuide(Authentication authentication, UUID guideId) {
        UUID currentUserId = extractUserId(authentication);
        if (currentUserId == null || guideId == null) {
            return false;
        }

        return guideRepository.findById(guideId)
                .map(g -> g.getUser().getId().equals(currentUserId))
                .orElse(false);
    }

    public boolean isSameUser(Authentication authentication, UUID targetUserId) {
        UUID currentUserId = extractUserId(authentication);
        return currentUserId != null && currentUserId.equals(targetUserId);
    }

    private UUID extractUserId(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        Object principal = authentication.getPrincipal();
        if (principal instanceof UserPrincipal userPrincipal) {
            return userPrincipal.getId();
        }
        return null;
    }
}
