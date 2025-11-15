package ru.chousik.backend_calls.dto;

public record PollStatusResponse(
        MatchStatus status,
        String roomId,
        MatchResponse.PartnerInfo partner
) {}
