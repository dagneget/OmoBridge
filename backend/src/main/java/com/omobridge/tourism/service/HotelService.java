package com.omobridge.tourism.service;

import com.omobridge.common.audit.AuditService;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.security.OwnershipService;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.tourism.api.dto.HotelRequest;
import com.omobridge.tourism.domain.Hotel;
import com.omobridge.tourism.domain.HotelRepository;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class HotelService {

    private final HotelRepository hotelRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final OwnershipService ownershipService;
    private final AuditService auditService;

    @Transactional(readOnly = true)
    public List<Hotel> getPublicHotels() {
        return hotelRepository.findAllByIsActiveTrue();
    }

    @Transactional(readOnly = true)
    public Hotel getHotelById(UUID id) {
        return hotelRepository.findById(id)
                .filter(Hotel::isActive)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel", id));
    }

    @Transactional(readOnly = true)
    public List<Hotel> getEnterpriseHotels(Authentication authentication, UUID enterpriseId) {
        verifyEnterpriseAccess(authentication, enterpriseId);
        return hotelRepository.findAllByEnterpriseId(enterpriseId);
    }

    @Transactional
    public Hotel createHotel(Authentication authentication, UUID enterpriseId, HotelRequest request) {
        verifyEnterpriseAccess(authentication, enterpriseId);

        Enterprise enterprise = enterpriseRepository.findById(enterpriseId)
                .orElseThrow(() -> new ResourceNotFoundException("Enterprise", enterpriseId));

        Hotel hotel = new Hotel();
        hotel.setEnterprise(enterprise);
        mapRequestToEntity(request, hotel);

        Hotel saved = hotelRepository.save(hotel);
        auditService.record("CREATE_HOTEL", "HOTEL", saved.getId(), request);
        return saved;
    }

    @Transactional
    public Hotel updateHotel(Authentication authentication, UUID hotelId, HotelRequest request) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel", hotelId));

        verifyEnterpriseAccess(authentication, hotel.getEnterprise().getId());
        mapRequestToEntity(request, hotel);

        Hotel saved = hotelRepository.save(hotel);
        auditService.record("UPDATE_HOTEL", "HOTEL", saved.getId(), request);
        return saved;
    }

    @Transactional
    public void deleteHotel(Authentication authentication, UUID hotelId) {
        Hotel hotel = hotelRepository.findById(hotelId)
                .orElseThrow(() -> new ResourceNotFoundException("Hotel", hotelId));

        verifyEnterpriseAccess(authentication, hotel.getEnterprise().getId());
        hotelRepository.delete(hotel);
        auditService.record("DELETE_HOTEL", "HOTEL", hotelId, "Deleted hotel: " + hotel.getName());
    }

    private void verifyEnterpriseAccess(Authentication authentication, UUID enterpriseId) {
        if (!ownershipService.isEnterpriseMember(authentication, enterpriseId)) {
            throw new ForbiddenException("Access denied: You are not an active member of this enterprise");
        }
    }

    private void mapRequestToEntity(HotelRequest req, Hotel entity) {
        entity.setName(req.name().trim());
        entity.setLocationText(req.locationText());
        entity.setContactPhone(req.contactPhone());
        entity.setContactEmail(req.contactEmail());
        entity.setPriceFrom(req.priceFrom());
        if (req.currency() != null) entity.setCurrency(req.currency().toUpperCase().trim());
        entity.setAmenities(req.amenities());
        if (req.isActive() != null) entity.setActive(req.isActive());
    }
}
