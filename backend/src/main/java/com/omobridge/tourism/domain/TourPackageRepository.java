package com.omobridge.tourism.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TourPackageRepository extends JpaRepository<TourPackage, UUID> {
    List<TourPackage> findAllByIsActiveTrue();
    List<TourPackage> findAllByEnterpriseId(UUID enterpriseId);
    List<TourPackage> findAllByCategoryAndIsActiveTrue(String category);
}
