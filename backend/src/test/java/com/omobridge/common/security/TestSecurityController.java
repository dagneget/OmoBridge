package com.omobridge.common.security;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/test")
public class TestSecurityController {

    @GetMapping("/protected")
    public ResponseEntity<Map<String, Object>> protectedEndpoint() {
        var user = SecurityUtils.getRequiredCurrentUser();
        return ResponseEntity.ok(Map.of(
            "message", "Access granted",
            "userId", user.getId().toString(),
            "username", user.getUsername()
        ));
    }

    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('SYSTEM_ADMIN')")
    public ResponseEntity<Map<String, String>> adminOnlyEndpoint() {
        return ResponseEntity.ok(Map.of("message", "Admin access granted"));
    }
}
