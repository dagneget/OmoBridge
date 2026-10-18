package com.omobridge.tourism.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.common.translation.TranslationService;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.tourism.api.dto.TourPackageRequest;
import com.omobridge.tourism.api.dto.TourPackageResponse;
import com.omobridge.tourism.domain.TourPackage;
import com.omobridge.tourism.domain.TourPackageRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TourPackageService {

    private final TourPackageRepository tourPackageRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final OwnershipService ownershipService;
    private final TranslationService translationService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<TourPackageResponse> getPublicPackages(String category, String language) {
        List<TourPackage> packages = (category != null && !category.isBlank())
                ? tourPackageRepository.findAllByCategoryAndIsActiveTrue(category.toUpperCase().trim())
                : tourPackageRepository.findAllByIsActiveTrue();

        return packages.stream()
                .map(pkg -> toResponse(pkg, language))
                .toList();
    }

    @Transactional(readOnly = true)
    public TourPackageResponse getPublicPackageById(UUID id, String language) {
        TourPackage pkg = tourPackageRepository.findById(id)
                .filter(TourPackage::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("TourPackage", id));
        return toResponse(pkg, language);
    }

    @Transactional(readOnly = true)
    public List<TourPackageResponse> getEnterprisePackages(Authentication authentication, UUID enterpriseId) {
        verifyEnterpriseAccess(authentication, enterpriseId);
        return tourPackageRepository.findAllByEnterpriseId(enterpriseId).stream()
                .map(pkg -> toResponse(pkg, "en"))
                .toList();
    }

    @Transactional
    public TourPackageResponse createPackage(Authentication authentication, UUID enterpriseId, TourPackageRequest request) {
        verifyEnterpriseAccess(authentication, enterpriseId);

        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise", enterpriseId));

        TourPackage pkg = new TourPackage();
        pkg.setEnterprise(enterprise);
        mapRequestToEntity(request, pkg);

        TourPackage saved = tourPackageRepository.save(pkg);

        auditService.record("CREATE_TOUR_PACKAGE", "TOUR_PACKAGE", saved.getId(), request);
        return toResponse(saved, "en");
    }

    @Transactional
    public TourPackageResponse updatePackage(Authentication authentication, UUID packageId, TourPackageRequest request) {
        TourPackage pkg = tourPackageRepository.findById(packageId)
                .orElseThrow(() -> new ResourceNotFoundException("TourPackage", packageId));

        verifyEnterpriseAccess(authentication, pkg.getEnterprise().getId());
        mapRequestToEntity(request, pkg);

        TourPackage saved = tourPackageRepository.save(pkg);

        auditService.record("UPDATE_TOUR_PACKAGE", "TOUR_PACKAGE", saved.getId(), request);
        return toResponse(saved, "en");
    }

    @Transactional
    public void deletePackage(Authentication authentication, UUID packageId) {
        TourPackage pkg = tourPackageRepository.findById(packageId)
                .orElseThrow(() -> new ResourceNotFoundException("TourPackage", packageId));

        verifyEnterpriseAccess(authentication, pkg.getEnterprise().getId());
        tourPackageRepository.delete(pkg);

        auditService.record("DELETE_TOUR_PACKAGE", "TOUR_PACKAGE", packageId, "Deleted: " + pkg.getName());
    }

    private void verifyEnterpriseAccess(Authentication authentication, UUID enterpriseId) {
        if (!ownershipService.isEnterpriseMember(authentication, enterpriseId)) {
            throw new ForbiddenException("Access denied: You are not an active member of this enterprise");
        }
    }

    private void mapRequestToEntity(TourPackageRequest req, TourPackage entity) {
        entity.setName(req.name().trim());
        entity.setCategory(req.category().toUpperCase().trim());
        entity.setOverview(req.overview());
        entity.setStory(req.story());
        entity.setLocationText(req.locationText());
        entity.setLatitude(req.latitude());
        entity.setLongitude(req.longitude());
        entity.setDirections(req.directions());
        entity.setOpeningHours(req.openingHours());
        entity.setDurationHours(req.durationHours());
        entity.setMaxGroupSize(req.maxGroupSize());
        entity.setPriceAmount(req.priceAmount());
        if (req.priceUnit() != null) entity.setPriceUnit(req.priceUnit().toUpperCase().trim());
        if (req.currency() != null) entity.setCurrency(req.currency().toUpperCase().trim());
        entity.setCulturalRules(req.culturalRules());
        entity.setSafetyNotes(req.safetyNotes());
        entity.setCommunityApprovalRef(req.communityApprovalRef());
        entity.setCommunityApprovalDate(req.communityApprovalDate());
        if (req.isActive() != null) entity.setActive(req.isActive());
    }

    private TourPackageResponse toResponse(TourPackage pkg, String language) {
        String name = translationService.getTranslatedField("TOUR_PACKAGE", pkg.getId(), "name", language, pkg.getName());
        String overview = translationService.getTranslatedField("TOUR_PACKAGE", pkg.getId(), "overview", language, pkg.getOverview());
        String story = translationService.getTranslatedField("TOUR_PACKAGE", pkg.getId(), "story", language, pkg.getStory());
        String culturalRules = translationService.getTranslatedField("TOUR_PACKAGE", pkg.getId(), "culturalRules", language, pkg.getCulturalRules());
        String safetyNotes = translationService.getTranslatedField("TOUR_PACKAGE", pkg.getId(), "safetyNotes", language, pkg.getSafetyNotes());

        return new TourPackageResponse(
                pkg.getId(),
                pkg.getEnterprise().getId(),
                pkg.getEnterprise().getName(),
                name,
                pkg.getCategory(),
                overview,
                story,
                pkg.getLocationText(),
                pkg.getLatitude(),
                pkg.getLongitude(),
                pkg.getDirections(),
                pkg.getOpeningHours(),
                pkg.getDurationHours(),
                pkg.getMaxGroupSize(),
                pkg.getPriceAmount(),
                pkg.getPriceUnit(),
                pkg.getCurrency(),
                culturalRules,
                safetyNotes,
                pkg.getCommunityApprovalRef(),
                pkg.getCommunityApprovalDate(),
                pkg.isActive()
        );
    }
}
