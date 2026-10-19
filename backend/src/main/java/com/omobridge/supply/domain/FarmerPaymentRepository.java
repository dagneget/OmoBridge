package com.omobridge.supply.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FarmerPaymentRepository extends JpaRepository<FarmerPayment, UUID> {

    @EntityGraph(attributePaths = {"allocations", "allocations.payable", "farmer", "enterprise"})
    Optional<FarmerPayment> findWithDetailsById(UUID id);

    Optional<FarmerPayment> findByIdempotencyKey(String idempotencyKey);

    Optional<FarmerPayment> findByPaymentNo(String paymentNo);

    List<FarmerPayment> findAllByFarmerIdOrderByCreatedAtDesc(UUID farmerId);

    List<FarmerPayment> findAllByEnterpriseIdOrderByCreatedAtDesc(UUID enterpriseId);
}
