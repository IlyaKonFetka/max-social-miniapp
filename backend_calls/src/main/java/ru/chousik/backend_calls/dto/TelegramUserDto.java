package ru.chousik.backend_calls.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record TelegramUserDto(
        long id,
        @JsonProperty("first_name") String firstName,
        @JsonProperty("last_name") String lastName,
        String username,
        @JsonProperty("language_code") String languageCode,
        @JsonProperty("photo_url") String photoUrl
) {
}
