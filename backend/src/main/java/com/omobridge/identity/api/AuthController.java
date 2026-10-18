package com.omobridge.identity.api;

import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.SecurityUtils;
import com.omobridge.identity.api.dto.AuthResponse;
import com.omobridge.identity.api.dto.BuyerRegisterRequest;
import com.omobridge.identity.api.dto.DeliveryProviderRegisterRequest;
import com.omobridge.identity.api.dto.EnterpriseRegisterRequest;
import com.omobridge.identity.api.dto.GuideRegisterRequest;
import com.omobridge.identity.api.dto.LoginRequest;
import com.omobridge.identity.api.dto.ProducerRegisterRequest;
import com.omobridge.identity.api.dto.UserProfileResponse;
import com.omobridge.identity.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/auth", "/api/auth"})
@RequiredArgsConstructor
@Tag(name = "Authentication & Identity", description = "Endpoints for user registration, authentication, and profile")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register/buyer")
    @Operation(summary = "Register a new buyer / visitor")
    public ResponseEntity<ApiResponse<AuthResponse>> registerBuyer(@Valid @RequestBody BuyerRegisterRequest request) {
        AuthResponse response = authService.registerBuyer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Buyer registered successfully", response));
    }

    @PostMapping("/register/producer")
    @Operation(summary = "Register a new rural producer / farmer")
    public ResponseEntity<ApiResponse<AuthResponse>> registerProducer(@Valid @RequestBody ProducerRegisterRequest request) {
        AuthResponse response = authService.registerProducer(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Producer registered successfully", response));
    }

    @PostMapping("/register/enterprise")
    @Operation(summary = "Register a new community micro-enterprise")
    public ResponseEntity<ApiResponse<AuthResponse>> registerEnterprise(@Valid @RequestBody EnterpriseRegisterRequest request) {
        AuthResponse response = authService.registerEnterprise(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Enterprise registered successfully", response));
    }

    @PostMapping("/register/delivery-provider")
    @Operation(summary = "Register a new delivery provider")
    public ResponseEntity<ApiResponse<AuthResponse>> registerDeliveryProvider(@Valid @RequestBody DeliveryProviderRegisterRequest request) {
        AuthResponse response = authService.registerDeliveryProvider(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Delivery provider registered successfully", response));
    }

    @PostMapping("/register/guide")
    @Operation(summary = "Register a new local tour guide")
    public ResponseEntity<ApiResponse<AuthResponse>> registerGuide(@Valid @RequestBody GuideRegisterRequest request) {
        AuthResponse response = authService.registerGuide(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.created("Tour guide registered successfully", response));
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user and issue JWT token")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful", response));
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile and roles")
    public ResponseEntity<ApiResponse<UserProfileResponse>> getCurrentUser() {
        UUID currentUserId = SecurityUtils.getCurrentUserId();
        UserProfileResponse profile = authService.getCurrentUserProfile(currentUserId);
        return ResponseEntity.ok(ApiResponse.ok(profile));
    }
}
