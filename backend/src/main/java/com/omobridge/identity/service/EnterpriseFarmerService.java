package com.omobridge.identity.service;

import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.identity.api.dto.FarmerResponse;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.identity.domain.VerificationStatus;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class EnterpriseFarmerService {

    private final FarmerRepository farmerRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final OwnershipService ownershipService;

    @Transactional(readOnly = true)
    public List<FarmerResponse> getFarmersForEnterprise(Authentication authentication, UUID enterpriseId) {
        verifyEnterpriseAccess(authentication, enterpriseId);
        return farmerRepository.findAllByEnterpriseId(enterpriseId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public FarmerResponse approveFarmer(Authentication authentication, UUID enterpriseId, UUID farmerId) {
        verifyEnterpriseAccess(authentication, enterpriseId);

        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer", farmerId));

        if (farmer.getEnterprise() == null || !farmer.getEnterprise().getId().equals(enterpriseId)) {
            throw new ForbiddenException("Farmer does not belong to your enterprise");
        }

        farmer.setVerificationStatus(VerificationStatus.VERIFIED);
        farmer = farmerRepository.save(farmer);
        return toResponse(farmer);
    }

    @Transactional
    public FarmerResponse rejectFarmer(Authentication authentication, UUID enterpriseId, UUID farmerId) {
        verifyEnterpriseAccess(authentication, enterpriseId);

        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer", farmerId));

        if (farmer.getEnterprise() == null || !farmer.getEnterprise().getId().equals(enterpriseId)) {
            throw new ForbiddenException("Farmer does not belong to your enterprise");
        }

        farmer.setVerificationStatus(VerificationStatus.REJECTED);
        farmer = farmerRepository.save(farmer);
        return toResponse(farmer);
    }

    @Transactional
    public FarmerResponse linkFarmer(Authentication authentication, UUID enterpriseId, UUID farmerId) {
        verifyEnterpriseAccess(authentication, enterpriseId);

        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise", enterpriseId));

        Farmer farmer = farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer", farmerId));

        farmer.setEnterprise(enterprise);
        farmer.setVerificationStatus(VerificationStatus.VERIFIED);
        farmer = farmerRepository.save(farmer);
        return toResponse(farmer);
    }

    private void verifyEnterpriseAccess(Authentication authentication, UUID enterpriseId) {
        if (!ownershipService.isEnterpriseMember(authentication, enterpriseId)) {
            throw new ForbiddenException("Access denied: You are not an active member of this enterprise");
        }
    }

    private FarmerResponse toResponse(Farmer farmer) {
        return new FarmerResponse(
                farmer.getId(),
                farmer.getUser().getId(),
                farmer.getEnterprise() != null ? farmer.getEnterprise().getId() : null,
                farmer.getFarmerCode(),
                farmer.getUser().getFullName(),
                farmer.getUser().getPhoneNumber(),
                farmer.getVillage(),
                farmer.getKebele(),
                farmer.getVerificationStatus()
        );
    }
}
