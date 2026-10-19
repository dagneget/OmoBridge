package com.omobridge.supply.domain;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PaymentAllocationRepository extends JpaRepository<PaymentAllocation, UUID> {
    List<PaymentAllocation> findAllByPaymentId(UUID paymentId);
    List<PaymentAllocation> findAllByPayableId(UUID payableId);
}
