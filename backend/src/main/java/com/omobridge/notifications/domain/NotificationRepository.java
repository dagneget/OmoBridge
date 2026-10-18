package com.omobridge.notifications.domain;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface NotificationRepository extends JpaRepository<Notification, UUID> {

    @Query("SELECT n FROM Notification n WHERE n.status = 'QUEUED' AND (n.nextAttemptAt IS NULL OR n.nextAttemptAt <= :now) ORDER BY n.createdAt ASC")
    List<Notification> findPendingNotifications(@Param("now") Instant now, Pageable pageable);

    List<Notification> findByRecipientPhoneOrderByCreatedAtDesc(String phone);

    List<Notification> findByRelatedTypeAndRelatedId(String relatedType, UUID relatedId);
}
