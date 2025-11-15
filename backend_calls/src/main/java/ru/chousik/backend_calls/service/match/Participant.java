package ru.chousik.backend_calls.service.match;

import java.time.Instant;

import ru.chousik.backend_calls.model.ParticipantRole;

class Participant {
    private final String participantId;
    private final ParticipantRole role;
    private final String displayName;
    private final String clientId;
    private final Instant createdAt = Instant.now();

    Participant(String participantId, ParticipantRole role, String displayName, String clientId) {
        this.participantId = participantId;
        this.role = role;
        this.displayName = displayName;
        this.clientId = clientId;
    }

    public String participantId() {
        return participantId;
    }

    public ParticipantRole role() {
        return role;
    }

    public String displayName() {
        return displayName;
    }

    public String clientId() {
        return clientId;
    }

    public Instant createdAt() {
        return createdAt;
    }
}
