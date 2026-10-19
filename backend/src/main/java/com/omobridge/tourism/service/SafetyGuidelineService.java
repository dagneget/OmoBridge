package com.omobridge.tourism.service;

import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.tourism.api.dto.SafetyGuidelineRequest;
import com.omobridge.tourism.domain.SafetyGuideline;
import com.omobridge.tourism.domain.SafetyGuidelineRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SafetyGuidelineService {

    private final SafetyGuidelineRepository repository;

    @Transactional(readOnly = true)
    public List<SafetyGuideline> getPublicGuidelines() {
        return repository.findAllByIsActiveTrueOrderByDisplayOrderAsc();
    }

    @Transactional
    public SafetyGuideline createGuideline(SafetyGuidelineRequest request) {
        SafetyGuideline g = new SafetyGuideline();
        g.setTitle(request.title().trim());
        g.setCategory(request.category().toUpperCase().trim());
        g.setContent(request.content());
        g.setEmergencyContacts(request.emergencyContacts());
        g.setDisplayOrder(request.displayOrder() != null ? request.displayOrder() : 0);
        g.setActive(request.isActive() == null || request.isActive());
        return repository.save(g);
    }

    @Transactional
    public SafetyGuideline updateGuideline(UUID id, SafetyGuidelineRequest request) {
        SafetyGuideline g = repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("SafetyGuideline", id));

        g.setTitle(request.title().trim());
        g.setCategory(request.category().toUpperCase().trim());
        g.setContent(request.content());
        g.setEmergencyContacts(request.emergencyContacts());
        if (request.displayOrder() != null) g.setDisplayOrder(request.displayOrder());
        if (request.isActive() != null) g.setActive(request.isActive());
        g.setUpdatedAt(Instant.now());
        return repository.save(g);
    }

    @Transactional
    public void deleteGuideline(UUID id) {
        repository.deleteById(id);
    }
}
