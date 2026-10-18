package com.omobridge.common.media;

import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.security.OwnershipService;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MediaService {

    private final MediaRepository mediaRepository;
    private final OwnershipService ownershipService;

    @Transactional(readOnly = true)
    public List<Media> listMedia(String ownerType, UUID ownerId) {
        return mediaRepository.findAllByOwnerTypeAndOwnerIdOrderBySortOrderAsc(ownerType, ownerId);
    }

    @Transactional
    public Media attachMedia(Authentication authentication, String ownerType, UUID ownerId, String url, String kind, int sortOrder, boolean isPrimary) {
        verifyMediaOwnership(authentication, ownerType, ownerId);

        Media media = new Media();
        media.setOwnerType(ownerType);
        media.setOwnerId(ownerId);
        media.setUrl(url);
        media.setKind(kind != null ? kind.toUpperCase() : "IMAGE");
        media.setSortOrder(sortOrder);
        media.setPrimary(isPrimary);

        return mediaRepository.save(media);
    }

    @Transactional
    public void deleteMedia(Authentication authentication, UUID mediaId) {
        Media media = mediaRepository.findById(mediaId)
                .orElseThrow(() -> new ResourceNotFoundException("Media", mediaId));

        verifyMediaOwnership(authentication, media.getOwnerType(), media.getOwnerId());
        mediaRepository.delete(media);
    }

    private void verifyMediaOwnership(Authentication authentication, String ownerType, UUID ownerId) {
        if (ownerType.equalsIgnoreCase("ENTERPRISE")) {
            if (!ownershipService.isEnterpriseMember(authentication, ownerId)) {
                throw new ForbiddenException("Access denied: You cannot modify media for this enterprise");
            }
        } else if (ownerType.equalsIgnoreCase("USER")) {
            if (!ownershipService.isSameUser(authentication, ownerId)) {
                throw new ForbiddenException("Access denied: You cannot modify media for another user");
            }
        }
    }
}
