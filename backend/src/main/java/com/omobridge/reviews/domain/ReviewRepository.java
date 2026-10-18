package com.omobridge.reviews.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface ReviewRepository extends JpaRepository<Review, UUID> {

    @EntityGraph(attributePaths = {"reviewerUser"})
    List<Review> findByTargetTypeAndTargetIdAndIsPublicTrueOrderByCreatedAtDesc(ReviewTargetType targetType, UUID targetId);

    @EntityGraph(attributePaths = {"reviewerUser"})
    List<Review> findByIsPublicTrueOrderByCreatedAtDesc();

    boolean existsByReviewerUserIdAndTargetTypeAndTargetId(UUID reviewerUserId, ReviewTargetType targetType, UUID targetId);

    Optional<Review> findByReviewerUserIdAndTargetTypeAndTargetId(UUID reviewerUserId, ReviewTargetType targetType, UUID targetId);

    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.targetType = :targetType AND r.targetId = :targetId AND r.isPublic = true")
    Double getAverageRatingForTarget(@Param("targetType") ReviewTargetType targetType, @Param("targetId") UUID targetId);

    long countByTargetTypeAndTargetIdAndIsPublicTrue(ReviewTargetType targetType, UUID targetId);
}
