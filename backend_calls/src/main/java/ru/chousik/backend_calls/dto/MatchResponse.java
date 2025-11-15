package ru.chousik.backend_calls.dto;

public record MatchResponse(
        MatchStatus status,
        String participantId,
        String roomId,
        PartnerInfo partner
) {
    public record PartnerInfo(String displayName, String clientId) {}
}
