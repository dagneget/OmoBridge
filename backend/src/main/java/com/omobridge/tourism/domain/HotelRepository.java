package com.omobridge.tourism.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface HotelRepository extends JpaRepository<Hotel, UUID> {
    List<Hotel> findAllByIsActiveTrue();
    List<Hotel> findAllByEnterpriseId(UUID enterpriseId);
}
