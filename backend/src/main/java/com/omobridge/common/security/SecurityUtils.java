package com.omobridge.common.security;

import com.omobridge.common.exception.UnauthorizedException;
import java.util.Optional;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {}

    public static Optional<UserPrincipal> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof UserPrincipal principal) {
            return Optional.of(principal);
        }
        return Optional.empty();
    }

    public static UserPrincipal getRequiredCurrentUser() {
        return getCurrentUser().orElseThrow(() -> new UnauthorizedException("User is not authenticated"));
    }

    public static UUID getCurrentUserId() {
        return getRequiredCurrentUser().getId();
    }

    public static String getCurrentUsername() {
        return getRequiredCurrentUser().getUsername();
    }
}
