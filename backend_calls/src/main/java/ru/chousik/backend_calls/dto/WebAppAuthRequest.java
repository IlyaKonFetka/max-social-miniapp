package ru.chousik.backend_calls.dto;

import jakarta.validation.constraints.NotBlank;

public record WebAppAuthRequest(
        @NotBlank String webAppData
) {
}
