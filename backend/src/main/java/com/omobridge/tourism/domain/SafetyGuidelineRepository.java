package com.omobridge.tourism.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SafetyGuidelineRepository extends JpaRepository<SafetyGuideline, UUID> {
    List<SafetyGuideline> findAllByIsActiveTrueOrderByDisplayOrderAsc();
    List<SafetyGuideline> findAllByCategoryAndIsActiveTrue(String category);
}
