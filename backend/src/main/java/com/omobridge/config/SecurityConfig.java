package com.omobridge.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.omobridge.common.exception.ErrorResponse;
import com.omobridge.common.security.JwtAuthenticationFilter;
import jakarta.servlet.http.HttpServletResponse;
import java.io.OutputStream;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@EnableConfigurationProperties(JwtProperties.class)
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final ObjectMapper objectMapper;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults())
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(exceptions -> exceptions
                .authenticationEntryPoint(unauthorizedEntryPoint())
            )
            .authorizeHttpRequests(auth -> auth
                // Public infrastructure & docs
                .requestMatchers("/actuator/health", "/actuator/info").permitAll()
                .requestMatchers("/swagger-ui/**", "/v3/api-docs/**", "/swagger-ui.html").permitAll()
                .requestMatchers("/api/v1/demo/**").permitAll()
                // Authentication & registration endpoints
                .requestMatchers("/api/v1/auth/**", "/api/auth/**").permitAll()
                // Public product catalog & tourism lookup & pricing calculation
                .requestMatchers("/api/v1/public/**", "/api/public/**").permitAll()
                .requestMatchers("/api/v1/pricing/calculate").permitAll()
                .requestMatchers("/api/v1/tourism/guides/me").authenticated()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/tourism/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/translations/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/trace/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/product-types/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/buying-prices/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/delivery/track/**").permitAll()
                .requestMatchers(org.springframework.http.HttpMethod.GET, "/api/v1/reviews/public/**").permitAll()
                // External integration callbacks (USSD, webhooks)
                .requestMatchers("/api/v1/integrations/**").permitAll()
                // All other endpoints require authentication
                .anyRequest().authenticated()
            )
            .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationEntryPoint unauthorizedEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpStatus.UNAUTHORIZED.value());
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            var error = new ErrorResponse(
                    HttpStatus.UNAUTHORIZED.value(),
                    HttpStatus.UNAUTHORIZED.getReasonPhrase(),
                    "UNAUTHORIZED",
                    "Full authentication is required to access this resource",
                    request.getRequestURI()
            );
            OutputStream out = response.getOutputStream();
            objectMapper.writeValue(out, error);
            out.flush();
        };
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(
            @Value("${CORS_ALLOWED_ORIGINS:http://localhost:5173}") List<String> allowedOrigins) {
        var configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of(
                "Authorization", "Content-Type", "X-Idempotency-Key", "Cache-Control", "Accept", "Accept-Language"));
        configuration.setAllowCredentials(true);
        configuration.validateAllowCredentials();

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}
