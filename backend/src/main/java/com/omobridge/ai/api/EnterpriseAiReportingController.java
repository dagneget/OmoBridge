package com.omobridge.ai.api;

import com.omobridge.ai.api.dto.AiReportResponse;
import com.omobridge.ai.api.dto.EnterpriseImpactMetricsResponse;
import com.omobridge.ai.api.dto.FarmerBalanceSummaryResponse;
import com.omobridge.ai.api.dto.GenerateReportRequest;
import com.omobridge.ai.service.AiReportService;
import com.omobridge.ai.service.ImpactReportingService;
import com.omobridge.common.exception.UnauthorizedException;
import com.omobridge.common.response.ApiResponse;
import com.omobridge.common.security.UserPrincipal;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/enterprises/{enterpriseId}")
@RequiredArgsConstructor
@Tag(name = "AI Reports and Impact Metrics", description = "Enterprise AI narrative generation, human approval, and impact analytics")
public class EnterpriseAiReportingController {

    private final AiReportService aiReportService;
    private final ImpactReportingService impactReportingService;
    private final UserRepository userRepository;

    private User getActorUser(UserPrincipal principal) {
        if (principal == null) {
            throw new UnauthorizedException("Authentication required");
        }
        return userRepository.findWithRolesById(principal.getId())
                .orElseThrow(() -> new UnauthorizedException("User not found"));
    }

    @PostMapping("/ai/reports")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Generate read-only AI narrative report from operational data")
    public ResponseEntity<ApiResponse<AiReportResponse>> generateReport(
            @PathVariable UUID enterpriseId,
            @Valid @RequestBody GenerateReportRequest request,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = getActorUser(principal);
        AiReportResponse response = aiReportService.generateReport(enterpriseId, request, actor);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.created(response));
    }

    @PatchMapping("/ai/reports/{reportId}/approval")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Approve or reject generated AI report / training message before external dissemination")
    public ResponseEntity<ApiResponse<AiReportResponse>> approveReport(
            @PathVariable UUID enterpriseId,
            @PathVariable UUID reportId,
            @RequestParam boolean approve,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = getActorUser(principal);
        AiReportResponse response = aiReportService.approveReport(reportId, approve, actor);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/ai/reports")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List AI reports generated for an enterprise")
    public ResponseEntity<ApiResponse<List<AiReportResponse>>> getEnterpriseReports(
            @PathVariable UUID enterpriseId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = getActorUser(principal);
        List<AiReportResponse> reports = aiReportService.getEnterpriseReports(enterpriseId, actor);
        return ResponseEntity.ok(ApiResponse.ok(reports));
    }

    @GetMapping("/reports/impact-metrics")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get impact metrics: active farmers, farmer share, household income increment, and retention")
    public ResponseEntity<ApiResponse<EnterpriseImpactMetricsResponse>> getImpactMetrics(
            @PathVariable UUID enterpriseId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = getActorUser(principal);
        EnterpriseImpactMetricsResponse response = impactReportingService.getImpactMetrics(enterpriseId, actor);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @GetMapping("/reports/farmer-balances")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Get farmer balance summary: pending payables and disbursed totals")
    public ResponseEntity<ApiResponse<FarmerBalanceSummaryResponse>> getFarmerBalances(
            @PathVariable UUID enterpriseId,
            @AuthenticationPrincipal UserPrincipal principal
    ) {
        User actor = getActorUser(principal);
        FarmerBalanceSummaryResponse response = impactReportingService.getFarmerBalances(enterpriseId, actor);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
