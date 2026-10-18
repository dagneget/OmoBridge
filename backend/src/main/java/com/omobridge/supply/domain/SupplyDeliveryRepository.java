package com.omobridge.supply.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface SupplyDeliveryRepository extends JpaRepository<SupplyDelivery, UUID> {

    @EntityGraph(attributePaths = {"items", "enterprise", "farmer", "receivedByUser"})
    Optional<SupplyDelivery> findWithDetailsById(UUID id);

    @EntityGraph(attributePaths = {"items", "enterprise", "farmer", "receivedByUser"})
    Optional<SupplyDelivery> findWithDetailsByDeliveryNo(String deliveryNo);

    List<SupplyDelivery> findAllByEnterpriseIdOrderByDeliveredAtDesc(UUID enterpriseId);

    List<SupplyDelivery> findAllByFarmerIdOrderByDeliveredAtDesc(UUID farmerId);

    @EntityGraph(attributePaths = {"items", "items.productType"})
    List<SupplyDelivery> findWithItemsByFarmerIdOrderByDeliveredAtDesc(UUID farmerId);
}
