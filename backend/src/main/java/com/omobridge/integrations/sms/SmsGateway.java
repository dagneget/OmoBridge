package com.omobridge.integrations.sms;

public interface SmsGateway {
    SmsSendResult sendSms(String phoneNumber, String message);
}
