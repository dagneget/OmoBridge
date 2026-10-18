package com.omobridge.identity.service;

import com.omobridge.identity.api.dto.AuthResponse;
import com.omobridge.identity.api.dto.BuyerRegisterRequest;
import com.omobridge.identity.api.dto.DeliveryProviderRegisterRequest;
import com.omobridge.identity.api.dto.EnterpriseRegisterRequest;
import com.omobridge.identity.api.dto.GuideRegisterRequest;
import com.omobridge.identity.api.dto.LoginRequest;
import com.omobridge.identity.api.dto.ProducerRegisterRequest;
import com.omobridge.identity.api.dto.UserProfileResponse;
import java.util.UUID;

public interface AuthService {

    AuthResponse registerBuyer(BuyerRegisterRequest request);

    AuthResponse registerProducer(ProducerRegisterRequest request);

    AuthResponse registerEnterprise(EnterpriseRegisterRequest request);

    AuthResponse registerDeliveryProvider(DeliveryProviderRegisterRequest request);

    AuthResponse registerGuide(GuideRegisterRequest request);

    AuthResponse login(LoginRequest request);

    UserProfileResponse getCurrentUserProfile(UUID userId);
}
