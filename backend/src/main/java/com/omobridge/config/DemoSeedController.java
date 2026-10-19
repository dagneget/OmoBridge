package com.omobridge.config;

import com.omobridge.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/v1/demo")
@Profile({"dev", "demo", "prod"})
@RequiredArgsConstructor
@Tag(name = "Demo Data Seeder", description = "Endpoints for seeding demo showcase data")
public class DemoSeedController {

    private final DevDataSeeder devDataSeeder;

    @PostMapping("/seed")
    @Operation(summary = "Trigger demo data seeding")
    public ResponseEntity<ApiResponse<String>> triggerSeed() {
        try {
            log.info("Explicit trigger of seedAll() via /api/v1/demo/seed");
            devDataSeeder.seedAll();
            return ResponseEntity.ok(ApiResponse.ok("Demo showcase data seeded successfully", "OK"));
        } catch (Exception e) {
            log.error("Failed to seed demo data via endpoint", e);
            String errorMsg = e.getClass().getName() + ": " + e.getMessage();
            if (e.getCause() != null) {
                errorMsg += " | Cause: " + e.getCause().getClass().getName() + ": " + e.getCause().getMessage();
            }
            return ResponseEntity.status(500).body(new ApiResponse<>(false, errorMsg, errorMsg, Instant.now()));
        }
    }
}
