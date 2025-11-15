package ru.chousik.backend_calls.dto;

public record WebAppAuthResponse(
        String authToken,
        String refreshToken,
        TelegramUserDto user
) {
}
