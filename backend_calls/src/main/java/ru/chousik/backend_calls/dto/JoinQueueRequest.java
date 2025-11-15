package ru.chousik.backend_calls.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ru.chousik.backend_calls.model.ParticipantRole;

public record JoinQueueRequest(
        @NotNull ParticipantRole role,
        @NotBlank String displayName,
        @NotBlank String clientId
) {}
