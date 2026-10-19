package com.omobridge.config;

import com.omobridge.common.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/demo")
@Profile({"dev", "demo"})
@RequiredArgsConstructor
@Tag(name = "Demo Data Seeder", description = "Endpoints for seeding demo showcase data")
public class DemoSeedController {

    private final DevDataSeeder devDataSeeder;

    @PostMapping("/seed")
    @Operation(summary = "Trigger demo data seeding")
    public ResponseEntity<ApiResponse<String>> triggerSeed() {
        devDataSeeder.seedAll();
        return ResponseEntity.ok(ApiResponse.ok("Demo showcase data seeded successfully", "OK"));
    }
}
