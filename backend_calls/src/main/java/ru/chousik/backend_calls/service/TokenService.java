package ru.chousik.backend_calls.service;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Service;

import ru.chousik.backend_calls.dto.TokenPair;

@Service
public class TokenService {

    private static final int RAW_TOKEN_BYTES = 32;

    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<String, Long> authTokens = new ConcurrentHashMap<>();
    private final Map<String, Long> refreshTokens = new ConcurrentHashMap<>();

    public TokenPair issueTokens(long userId) {
        final String authToken = generateToken("auth");
        final String refreshToken = generateToken("refresh");

        authTokens.put(authToken, userId);
        refreshTokens.put(refreshToken, userId);

        return new TokenPair(authToken, refreshToken);
    }

    private String generateToken(String prefix) {
        final byte[] bytes = new byte[RAW_TOKEN_BYTES];
        secureRandom.nextBytes(bytes);
        return prefix + "." + Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }
}
