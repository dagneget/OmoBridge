package com.omobridge.identity.service;

import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.identity.api.dto.DeliveryProviderResponse;
import com.omobridge.identity.api.dto.GuideResponse;
import com.omobridge.identity.api.dto.UserProfileResponse;
import com.omobridge.identity.domain.DeliveryProvider;
import com.omobridge.identity.domain.DeliveryProviderRepository;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.EnterpriseStatus;
import com.omobridge.identity.domain.Guide;
import com.omobridge.identity.domain.GuideRepository;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.identity.domain.VerificationStatus;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminIdentityService {

    private final DeliveryProviderRepository deliveryProviderRepository;
    private final GuideRepository guideRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final UserRepository userRepository;
    private final AuthService authService;

    @Transactional
    public DeliveryProviderResponse verifyDeliveryProvider(UUID providerId, boolean approve) {
        DeliveryProvider provider = deliveryProviderRepository.findById(providerId)
                .orElseThrow(() -> new ResourceNotFoundException("DeliveryProvider", providerId));

        provider.setVerificationStatus(approve ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED);
        provider = deliveryProviderRepository.save(provider);

        return new DeliveryProviderResponse(
                provider.getId(),
                provider.getUser().getId(),
                provider.getUser().getFullName(),
                provider.getUser().getPhoneNumber(),
                provider.getVehicleType(),
                provider.getVehiclePlateNumber(),
                provider.getVerificationStatus(),
                provider.isAvailable()
        );
    }

    @Transactional
    public GuideResponse verifyGuide(UUID guideId, boolean approve) {
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide", guideId));

        guide.setVerificationStatus(approve ? VerificationStatus.VERIFIED : VerificationStatus.REJECTED);
        guide = guideRepository.save(guide);

        return new GuideResponse(
                guide.getId(),
                guide.getUser().getId(),
                guide.getUser().getFullName(),
                guide.getUser().getPhoneNumber(),
                guide.getLicenseNumber(),
                guide.getLanguages(),
                guide.getDailyRate(),
                guide.getCurrency(),
                guide.getVerificationStatus(),
                guide.isAvailable()
        );
    }

    @Transactional
    public void verifyEnterprise(UUID enterpriseId, boolean approve) {
        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise", enterpriseId));

        enterprise.setStatus(approve ? EnterpriseStatus.ACTIVE : EnterpriseStatus.SUSPENDED);
        enterpriseRepository.save(enterprise);
    }

    @Transactional
    public UserProfileResponse updateUserStatus(UUID userId, UserStatus status) {
        User user = userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));

        user.setStatus(status);
        user = userRepository.save(user);

        return authService.getCurrentUserProfile(userId);
    }
}
