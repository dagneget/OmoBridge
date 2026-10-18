package com.omobridge.common.media;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface MediaRepository extends JpaRepository<Media, UUID> {
    List<Media> findAllByOwnerTypeAndOwnerIdOrderBySortOrderAsc(String ownerType, UUID ownerId);
    void deleteAllByOwnerTypeAndOwnerId(String ownerType, UUID ownerId);
}
