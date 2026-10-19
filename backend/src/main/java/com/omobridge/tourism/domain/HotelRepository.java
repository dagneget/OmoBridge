package com.omobridge.tourism.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface HotelRepository extends JpaRepository<Hotel, UUID> {
    List<Hotel> findAllByIsActiveTrue();

    @Query("SELECT h FROM Hotel h WHERE h.enterprise.id = :enterpriseId")
    List<Hotel> findAllByEnterpriseId(@Param("enterpriseId") UUID enterpriseId);
}
