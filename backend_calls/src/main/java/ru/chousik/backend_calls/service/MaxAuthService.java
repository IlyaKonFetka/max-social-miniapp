package ru.chousik.backend_calls.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;
import ru.chousik.backend_calls.config.MaxProperties;
import ru.chousik.backend_calls.dto.MaxUserDto;
import ru.chousik.backend_calls.dto.TokenPair;
import ru.chousik.backend_calls.dto.WebAppAuthRequest;
import ru.chousik.backend_calls.dto.WebAppAuthResponse;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Comparator;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class MaxAuthService {

    private static final String HMAC_ALGORITHM = "HmacSHA256";

    private final MaxProperties maxProperties;
    private final ObjectMapper objectMapper;
    private final TokenService tokenService;

    public MaxAuthService(MaxProperties maxProperties,
                          ObjectMapper objectMapper,
                          TokenService tokenService) {
        this.maxProperties = maxProperties;
        this.objectMapper = objectMapper;
        this.tokenService = tokenService;
    }

    public WebAppAuthResponse authenticate(WebAppAuthRequest request) {
        if (!StringUtils.hasText(request.webAppData())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "webAppData is empty");
        }

        Map<String, String> parsedData = parseWebAppData(request.webAppData());
        String providedHash = parsedData.remove("hash");
        if (!StringUtils.hasText(providedHash)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "hash is missing");
        }

        String dataCheckString = buildDataCheckString(parsedData);
        String calculatedHash = signData(dataCheckString);

        if (!providedHash.equalsIgnoreCase(calculatedHash)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Hash mismatch");
        }

        MaxUserDto user = parseUser(parsedData.get("user"));
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "user object missing in WebAppData");
        }

        TokenPair tokenPair = tokenService.issueTokens(user.id());
        return new WebAppAuthResponse(tokenPair.authToken(), tokenPair.refreshToken(), user);
    }

    private Map<String, String> parseWebAppData(String source) {
        Map<String, String> result = new LinkedHashMap<>();
        String[] pairs = source.split("&");
        for (String pair : pairs) {
            if (!StringUtils.hasText(pair)) {
                continue;
            }
            int idx = pair.indexOf('=');
            if (idx < 0) {
                continue;
            }
            String key = pair.substring(0, idx);
            String value = pair.substring(idx + 1);
            String decodedKey = URLDecoder.decode(key, StandardCharsets.UTF_8);
            String decodedValue = URLDecoder.decode(value, StandardCharsets.UTF_8);
            result.put(decodedKey, decodedValue);
        }
        return result;
    }

    private String buildDataCheckString(Map<String, String> data) {
        return data.entrySet()
                .stream()
                .sorted(Comparator.comparing(Map.Entry::getKey))
                .map(entry -> entry.getKey() + "=" + entry.getValue())
                .collect(Collectors.joining("\n"));
    }

    private String signData(String data) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            SecretKeySpec secretKeySpec = new SecretKeySpec(
                    maxProperties.secretKey().getBytes(StandardCharsets.UTF_8),
                    HMAC_ALGORITHM
            );
            mac.init(secretKeySpec);
            byte[] signature = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(signature);
        } catch (GeneralSecurityException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Cannot compute hash", e);
        }
    }

    private MaxUserDto parseUser(String rawUser) {
        if (!StringUtils.hasText(rawUser)) {
            return null;
        }
        try {
            return objectMapper.readValue(rawUser, MaxUserDto.class);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot parse user object", e);
        }
    }
}
