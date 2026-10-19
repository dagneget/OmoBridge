package com.omobridge.identity.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FarmerRepository extends JpaRepository<Farmer, UUID> {
    Optional<Farmer> findByUserId(UUID userId);
    Optional<Farmer> findByFarmerCode(String farmerCode);
    List<Farmer> findAllByEnterpriseId(UUID enterpriseId);
    boolean existsByFarmerCode(String farmerCode);

    @org.springframework.data.jpa.repository.Query("SELECT f FROM Farmer f JOIN FETCH f.user u WHERE u.phoneNumber = :phone")
    Optional<Farmer> findByUserPhoneNumber(@org.springframework.data.repository.query.Param("phone") String phone);
}
