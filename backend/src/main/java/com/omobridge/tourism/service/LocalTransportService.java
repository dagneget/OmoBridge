package com.omobridge.tourism.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.tourism.api.dto.TransportRequest;
import com.omobridge.tourism.domain.TransportService;
import com.omobridge.tourism.domain.TransportServiceRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class LocalTransportService {

    private final TransportServiceRepository transportRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final OwnershipService ownershipService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<TransportService> getPublicTransports() {
        return transportRepository.findAllByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public List<TransportService> getEnterpriseTransports(Authentication authentication, UUID enterpriseId) {
        verifyEnterpriseAccess(authentication, enterpriseId);
        return transportRepository.findAllByEnterpriseId(enterpriseId);
    }

    @Transactional
    public TransportService createTransport(Authentication authentication, UUID enterpriseId, TransportRequest request) {
        verifyEnterpriseAccess(authentication, enterpriseId);

        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise", enterpriseId));

        TransportService service = new TransportService();
        service.setEnterprise(enterprise);
        mapRequestToEntity(request, service);

        TransportService saved = transportRepository.save(service);
        auditService.record("CREATE_TRANSPORT", "TRANSPORT", saved.getId(), request);
        return saved;
    }

    @Transactional
    public TransportService updateTransport(Authentication authentication, UUID transportId, TransportRequest request) {
        TransportService service = transportRepository.findById(transportId)
                .orElseThrow(() -> new ResourceNotFoundException("TransportService", transportId));

        verifyEnterpriseAccess(authentication, service.getEnterprise().getId());
        mapRequestToEntity(request, service);

        TransportService saved = transportRepository.save(service);
        auditService.record("UPDATE_TRANSPORT", "TRANSPORT", saved.getId(), request);
        return saved;
    }

    @Transactional
    public void deleteTransport(Authentication authentication, UUID transportId) {
        TransportService service = transportRepository.findById(transportId)
                .orElseThrow(() -> new ResourceNotFoundException("TransportService", transportId));

        verifyEnterpriseAccess(authentication, service.getEnterprise().getId());
        transportRepository.delete(service);
        auditService.record("DELETE_TRANSPORT", "TRANSPORT", transportId, "Deleted: " + service.getServiceName());
    }

    private void verifyEnterpriseAccess(Authentication authentication, UUID enterpriseId) {
        if (!ownershipService.isEnterpriseMember(authentication, enterpriseId)) {
            throw new ForbiddenException("Access denied: You are not an active member of this enterprise");
        }
    }

    private void mapRequestToEntity(TransportRequest req, TransportService entity) {
        entity.setServiceName(req.serviceName().trim());
        entity.setVehicleType(req.vehicleType().trim());
        entity.setRouteDescription(req.routeDescription().trim());
        entity.setPriceAmount(req.priceAmount());
        if (req.currency() != null) entity.setCurrency(req.currency().toUpperCase().trim());
        entity.setContactPhone(req.contactPhone());
        if (req.isActive() != null) entity.setActive(req.isActive());
    }
}
