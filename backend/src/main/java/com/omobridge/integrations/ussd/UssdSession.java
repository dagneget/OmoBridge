package com.omobridge.integrations.ussd;

import com.fasterxml.jackson.databind.JsonNode;
import com.omobridge.common.domain.BaseEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "ussd_sessions")
public class UssdSession extends BaseEntity {

    @Column(name = "session_id", nullable = false, unique = true, length = 128)
    private String sessionId;

    @Column(name = "phone", nullable = false, length = 32)
    private String phone;

    @Column(name = "language", nullable = false, length = 16)
    private String language = "am";

    @Column(name = "current_menu", nullable = false, length = 64)
    private String currentMenu = "MAIN";

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "state", columnDefinition = "jsonb")
    private JsonNode state;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(Instant.now());
    }
}
