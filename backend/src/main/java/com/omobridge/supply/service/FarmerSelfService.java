package com.omobridge.supply.service;

import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.supply.api.dto.FarmerBalanceSummaryResponse;
import com.omobridge.supply.api.dto.FarmerPayableResponse;
import com.omobridge.supply.api.dto.FarmerPaymentResponse;
import com.omobridge.supply.api.dto.SupplyDeliveryResponse;
import com.omobridge.supply.domain.FarmerPayable;
import com.omobridge.supply.domain.FarmerPayableRepository;
import com.omobridge.supply.domain.FarmerPaymentRepository;
import com.omobridge.supply.domain.PayableStatus;
import com.omobridge.supply.domain.SupplyDeliveryRepository;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FarmerSelfService {

    private final FarmerRepository farmerRepository;
    private final SupplyDeliveryRepository deliveryRepository;
    private final FarmerPayableRepository payableRepository;
    private final FarmerPaymentRepository paymentRepository;

    public List<SupplyDeliveryResponse> getFarmerDeliveries(UUID farmerId) {
        ensureFarmerExists(farmerId);
        return deliveryRepository.findAllByFarmerIdOrderByDeliveredAtDesc(farmerId)
                .stream()
                .map(SupplyDeliveryResponse::fromEntity)
                .toList();
    }

    public List<FarmerPayableResponse> getFarmerPayables(UUID farmerId) {
        ensureFarmerExists(farmerId);
        return payableRepository.findAllByFarmerIdOrderByCreatedAtDesc(farmerId)
                .stream()
                .map(FarmerPayableResponse::fromEntity)
                .toList();
    }

    public List<FarmerPaymentResponse> getFarmerPayments(UUID farmerId) {
        ensureFarmerExists(farmerId);
        return paymentRepository.findAllByFarmerIdOrderByCreatedAtDesc(farmerId)
                .stream()
                .map(FarmerPaymentResponse::fromEntity)
                .toList();
    }

    public FarmerBalanceSummaryResponse getFarmerBalanceSummary(UUID farmerId) {
        Farmer farmer = ensureFarmerExists(farmerId);
        List<FarmerPayable> payables = payableRepository.findAllByFarmerIdOrderByCreatedAtDesc(farmerId);

        BigDecimal totalDeliveredValue = payables.stream()
                .filter(p -> p.getStatus() != PayableStatus.VOID)
                .map(FarmerPayable::getAmountDue)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalSettled = payables.stream()
                .filter(p -> p.getStatus() != PayableStatus.VOID)
                .map(FarmerPayable::getAmountAllocated)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        BigDecimal totalPending = totalDeliveredValue.subtract(totalSettled);

        long openCount = payables.stream()
                .filter(p -> p.getStatus() == PayableStatus.OPEN || p.getStatus() == PayableStatus.PARTIAL)
                .count();

        return new FarmerBalanceSummaryResponse(
                farmer.getId(),
                farmer.getUser().getFullName(),
                farmer.getFarmerCode(),
                totalDeliveredValue,
                totalSettled,
                totalPending,
                (int) openCount
        );
    }

    private Farmer ensureFarmerExists(UUID farmerId) {
        return farmerRepository.findById(farmerId)
                .orElseThrow(() -> new ResourceNotFoundException("Farmer not found with id: " + farmerId));
    }
}
