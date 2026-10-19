package com.omobridge.identity.service;

import com.omobridge.common.exception.BusinessRuleException;
import com.omobridge.common.exception.ConflictException;
import com.omobridge.common.exception.ForbiddenException;
import com.omobridge.common.exception.ResourceNotFoundException;
import com.omobridge.common.exception.UnauthorizedException;
import com.omobridge.common.security.JwtService;
import com.omobridge.common.security.RoleName;
import com.omobridge.common.util.CodeGenerator;
import com.omobridge.common.util.PhoneNumberUtil;
import com.omobridge.config.JwtProperties;
import com.omobridge.identity.api.dto.AuthResponse;
import com.omobridge.identity.api.dto.BuyerRegisterRequest;
import com.omobridge.identity.api.dto.DeliveryProviderRegisterRequest;
import com.omobridge.identity.api.dto.EnterpriseRegisterRequest;
import com.omobridge.identity.api.dto.GuideRegisterRequest;
import com.omobridge.identity.api.dto.LoginRequest;
import com.omobridge.identity.api.dto.ProducerRegisterRequest;
import com.omobridge.identity.api.dto.UserProfileResponse;
import com.omobridge.identity.domain.DeliveryProvider;
import com.omobridge.identity.domain.DeliveryProviderRepository;
import com.omobridge.identity.domain.Enterprise;
import com.omobridge.identity.domain.EnterpriseRepository;
import com.omobridge.identity.domain.EnterpriseStaff;
import com.omobridge.identity.domain.EnterpriseStaffRepository;
import com.omobridge.identity.domain.EnterpriseStatus;
import com.omobridge.identity.domain.Farmer;
import com.omobridge.identity.domain.FarmerRepository;
import com.omobridge.identity.domain.Guide;
import com.omobridge.identity.domain.GuideRepository;
import com.omobridge.identity.domain.Role;
import com.omobridge.identity.domain.RoleRepository;
import com.omobridge.identity.domain.StaffRole;
import com.omobridge.identity.domain.User;
import com.omobridge.identity.domain.UserRepository;
import com.omobridge.identity.domain.UserStatus;
import com.omobridge.identity.domain.VerificationStatus;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final EnterpriseRepository enterpriseRepository;
    private final EnterpriseStaffRepository enterpriseStaffRepository;
    private final FarmerRepository farmerRepository;
    private final DeliveryProviderRepository deliveryProviderRepository;
    private final GuideRepository guideRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final JwtProperties jwtProperties;
    private final LoginAttemptService loginAttemptService;
    private final CodeGenerator codeGenerator;

    @Override
    @Transactional
    public AuthResponse registerBuyer(BuyerRegisterRequest request) {
        String normalizedPhone = PhoneNumberUtil.normalize(request.phoneNumber());
        validateUniqueness(normalizedPhone, request.email());

        Role role = getRoleOrThrow(RoleName.BUYER_VISITOR);
        User user = createUser(normalizedPhone, request.email(), request.password(), request.fullName(), request.preferredLanguage(), role);
        user = userRepository.save(user);

        return createAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse registerProducer(ProducerRegisterRequest request) {
        String normalizedPhone = PhoneNumberUtil.normalize(request.phoneNumber());
        validateUniqueness(normalizedPhone, request.email());

        Enterprise enterprise = null;
        if (request.enterpriseId() != null) {
            enterprise = enterpriseRepository.findById(request.enterpriseId())
                    .orElseThrow(() -> new ResourceNotFoundException("Enterprise", request.enterpriseId()));
        }

        Role role = getRoleOrThrow(RoleName.PRODUCER_FARMER);
        User user = createUser(normalizedPhone, request.email(), request.password(), request.fullName(), request.preferredLanguage(), role);
        user = userRepository.save(user);

        Farmer farmer = new Farmer();
        farmer.setUser(user);
        farmer.setEnterprise(enterprise);
        farmer.setFarmerCode(codeGenerator.generateFarmerCode());
        farmer.setVillage(request.village());
        farmer.setKebele(request.kebele());
        farmer.setIdCardNumber(request.idCardNumber());
        farmer.setTelebirrPhone(request.telebirrPhone() != null ? PhoneNumberUtil.normalize(request.telebirrPhone()) : null);
        farmer.setBankName(request.bankName());
        farmer.setBankAccountNumber(request.bankAccountNumber());
        farmer.setConsentPublicName(Boolean.TRUE.equals(request.consentPublicName()));
        farmer.setVerificationStatus(VerificationStatus.PENDING);
        farmerRepository.save(farmer);

        return createAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse registerEnterprise(EnterpriseRegisterRequest request) {
        String normalizedOwnerPhone = PhoneNumberUtil.normalize(request.phoneNumber());
        validateUniqueness(normalizedOwnerPhone, request.email());

        String normalizedContactPhone = PhoneNumberUtil.normalize(request.contactPhone() != null ? request.contactPhone() : request.phoneNumber());

        Role role = getRoleOrThrow(RoleName.MICRO_ENTERPRISE);
        User user = createUser(normalizedOwnerPhone, request.email(), request.password(), request.fullName(), request.preferredLanguage(), role);
        user = userRepository.save(user);

        Enterprise enterprise = new Enterprise();
        enterprise.setOwnerUser(user);
        enterprise.setName(request.enterpriseName().trim());
        enterprise.setRegistrationNumber(request.registrationNumber());
        enterprise.setContactPhone(normalizedContactPhone);
        enterprise.setContactEmail(request.contactEmail());
        enterprise.setLocationWoreda(request.locationWoreda().trim());
        enterprise.setLocationTown(request.locationTown().trim());
        enterprise.setLocationAddress(request.locationAddress());
        enterprise.setLatitude(request.latitude());
        enterprise.setLongitude(request.longitude());
        enterprise.setStatus(EnterpriseStatus.PENDING);
        enterprise = enterpriseRepository.save(enterprise);

        EnterpriseStaff staff = new EnterpriseStaff();
        staff.setEnterprise(enterprise);
        staff.setUser(user);
        staff.setRole(StaffRole.OWNER);
        staff.setActive(true);
        enterpriseStaffRepository.save(staff);

        return createAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse registerDeliveryProvider(DeliveryProviderRegisterRequest request) {
        String normalizedPhone = PhoneNumberUtil.normalize(request.phoneNumber());
        validateUniqueness(normalizedPhone, request.email());

        Role role = getRoleOrThrow(RoleName.DELIVERY_PROVIDER);
        User user = createUser(normalizedPhone, request.email(), request.password(), request.fullName(), request.preferredLanguage(), role);
        user = userRepository.save(user);

        DeliveryProvider provider = new DeliveryProvider();
        provider.setUser(user);
        provider.setVehicleType(request.vehicleType());
        provider.setVehiclePlateNumber(request.vehiclePlateNumber());
        provider.setLicenseNumber(request.licenseNumber());
        provider.setServiceArea(request.serviceArea());
        provider.setAvailable(false);
        provider.setVerificationStatus(VerificationStatus.PENDING);
        deliveryProviderRepository.save(provider);

        return createAuthResponse(user);
    }

    @Override
    @Transactional
    public AuthResponse registerGuide(GuideRegisterRequest request) {
        String normalizedPhone = PhoneNumberUtil.normalize(request.phoneNumber());
        validateUniqueness(normalizedPhone, request.email());

        Role role = getRoleOrThrow(RoleName.TOUR_GUIDE);
        User user = createUser(normalizedPhone, request.email(), request.password(), request.fullName(), request.preferredLanguage(), role);
        user = userRepository.save(user);

        Guide guide = new Guide();
        guide.setUser(user);
        guide.setLicenseNumber(request.licenseNumber());
        guide.setBio(request.bio());
        if (request.languages() != null) {
            guide.setLanguages(request.languages());
        }
        guide.setSpecialties(request.specialties());
        guide.setDailyRate(request.dailyRate());
        if (request.currency() != null && !request.currency().isBlank()) {
            guide.setCurrency(request.currency().toUpperCase());
        }
        guide.setVerificationStatus(VerificationStatus.PENDING);
        guideRepository.save(guide);

        return createAuthResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String identifier = request.getResolvedIdentifier();
        if (identifier.isBlank()) {
            throw new UnauthorizedException("Invalid credentials");
        }

        if (loginAttemptService.isBlocked(identifier)) {
            throw new BusinessRuleException("Too many failed login attempts. Please try again later.");
        }

        User user = findByIdentifier(identifier).orElse(null);

        if (user == null || !passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            loginAttemptService.loginFailed(identifier);
            throw new UnauthorizedException("Invalid phone number or password");
        }

        if (user.getStatus() == UserStatus.SUSPENDED) {
            throw new ForbiddenException("Account is suspended. Please contact support.");
        }
        if (user.getStatus() == UserStatus.DEACTIVATED) {
            throw new ForbiddenException("Account has been deactivated.");
        }

        loginAttemptService.loginSucceeded(identifier);
        return createAuthResponse(user);
    }

    @Override
    @Transactional(readOnly = true)
    public UserProfileResponse getCurrentUserProfile(UUID userId) {
        User user = userRepository.findWithRolesById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User", userId));
        return buildUserProfileResponse(user);
    }

    private Optional<User> findByIdentifier(String identifier) {
        // Check if identifier can be normalized as an Ethiopian phone number
        try {
            String normalized = PhoneNumberUtil.normalize(identifier);
            Optional<User> byPhone = userRepository.findByPhoneNumber(normalized);
            if (byPhone.isPresent()) {
                return byPhone;
            }
        } catch (IllegalArgumentException ignored) {
            // Not a valid phone number, fall back to email search
        }

        return userRepository.findByEmail(identifier.toLowerCase().trim());
    }

    private User createUser(String phoneNumber, String email, String rawPassword, String fullName, String language, Role role) {
        User user = new User();
        user.setPhoneNumber(phoneNumber);
        user.setEmail(email != null && !email.isBlank() ? email.toLowerCase().trim() : null);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setFullName(fullName.trim());
        user.setStatus(UserStatus.ACTIVE);
        user.setPreferredLanguage(language != null && !language.isBlank() ? language.trim() : "en");
        user.addRole(role);
        return user;
    }

    private void validateUniqueness(String normalizedPhone, String email) {
        if (userRepository.existsByPhoneNumber(normalizedPhone)) {
            throw new ConflictException("Phone number is already registered");
        }
        if (email != null && !email.isBlank() && userRepository.existsByEmail(email.toLowerCase().trim())) {
            throw new ConflictException("Email address is already registered");
        }
    }

    private Role getRoleOrThrow(RoleName roleName) {
        return roleRepository.findByName(roleName.name())
                .orElseThrow(() -> new IllegalStateException("Role not found in database: " + roleName.name()));
    }

    private AuthResponse createAuthResponse(User user) {
        Set<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        String token = jwtService.generateToken(user.getId(), user.getPhoneNumber(), roleNames);
        long expiresInSeconds = jwtProperties.expirationMs() / 1000;
        UserProfileResponse profile = buildUserProfileResponse(user);

        return new AuthResponse(token, "Bearer", expiresInSeconds, profile);
    }

    private UserProfileResponse buildUserProfileResponse(User user) {
        Set<String> roleNames = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());

        UUID enterpriseId = null;
        String enterpriseName = null;
        UUID farmerId = null;
        String farmerCode = null;
        VerificationStatus verificationStatus = null;

        // Check if user is linked to an Enterprise
        Optional<EnterpriseStaff> staffOpt = enterpriseStaffRepository.findByUserId(user.getId());
        if (staffOpt.isPresent()) {
            Enterprise enterprise = staffOpt.get().getEnterprise();
            enterpriseId = enterprise.getId();
            enterpriseName = enterprise.getName();
            verificationStatus = VerificationStatus.valueOf(enterprise.getStatus().name());
        }

        // Check if user is a Farmer
        Optional<Farmer> farmerOpt = farmerRepository.findByUserId(user.getId());
        if (farmerOpt.isPresent()) {
            Farmer farmer = farmerOpt.get();
            farmerId = farmer.getId();
            farmerCode = farmer.getFarmerCode();
            verificationStatus = farmer.getVerificationStatus();
            if (enterpriseId == null && farmer.getEnterprise() != null) {
                enterpriseId = farmer.getEnterprise().getId();
                enterpriseName = farmer.getEnterprise().getName();
            }
        }

        // Check Delivery Provider
        Optional<DeliveryProvider> providerOpt = deliveryProviderRepository.findByUserId(user.getId());
        if (providerOpt.isPresent()) {
            verificationStatus = providerOpt.get().getVerificationStatus();
        }

        // Check Guide
        Optional<Guide> guideOpt = guideRepository.findByUserId(user.getId());
        if (guideOpt.isPresent()) {
            verificationStatus = guideOpt.get().getVerificationStatus();
        }

        return new UserProfileResponse(
                user.getId(),
                user.getPhoneNumber(),
                user.getEmail(),
                user.getFullName(),
                user.getStatus(),
                user.getPreferredLanguage(),
                roleNames,
                enterpriseId,
                enterpriseName,
                farmerId,
                farmerCode,
                verificationStatus
        );
    }
}
