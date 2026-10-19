package com.omobridge.tourism.service;

import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.identity.domain.Guide;
import com.omobridge.identity.domain.GuideRepository;
import com.omobridge.identity.domain.VerificationStatus;
import com.omobridge.tourism.api.dto.GuideProfileRequest;
import com.omobridge.tourism.api.dto.GuideResponse;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class GuideService {

    private final GuideRepository guideRepository;

    public List<GuideResponse> getApprovedGuides() {
        return guideRepository.findAllByIsAvailableTrueAndVerificationStatus(VerificationStatus.VERIFIED)
                .stream()
                .map(GuideResponse::fromEntity)
                .toList();
    }

    public GuideResponse getGuideById(UUID id) {
        Guide guide = guideRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Guide not found with id: " + id));
        return GuideResponse.fromEntity(guide);
    }

    public GuideResponse getGuideByUserId(UUID userId) {
        Guide guide = guideRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide profile not found for user id: " + userId));
        return GuideResponse.fromEntity(guide);
    }

    @Transactional
    public GuideResponse updateGuideProfile(UUID guideId, GuideProfileRequest request) {
        Guide guide = guideRepository.findById(guideId)
                .orElseThrow(() -> new ResourceNotFoundException("Guide not found with id: " + guideId));

        if (request.bio() != null) {
            guide.setBio(request.bio());
        }
        if (request.languages() != null) {
            guide.setLanguages(request.languages());
        }
        if (request.specialties() != null) {
            guide.setSpecialties(request.specialties());
        }
        if (request.dailyRate() != null) {
            guide.setDailyRate(request.dailyRate());
        }
        if (request.isAvailable() != null) {
            guide.setAvailable(request.isAvailable());
        }

        return GuideResponse.fromEntity(guideRepository.save(guide));
    }
}
